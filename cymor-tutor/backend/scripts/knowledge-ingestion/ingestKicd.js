// Real knowledge ingestion pipeline: KICD (kicd.ac.ke) -> PDF download ->
// text extraction -> cleaning -> chunking -> classification -> database.
// This replaces the old demo curriculum seed with genuine, sourced content
// from Kenya's official CBC/CBE curriculum authority.
//
// KICD publishes curriculum design PDFs per grade, hosted on Google Drive
// and embedded on pages like:
//   https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-four-designs/
//   https://kicd.ac.ke/cbc-materials/lower-primary/
// Every ingested chunk is stored with the exact source page, the exact file
// URL, and a license note - never marked as demo data.
//
// Run with: node scripts/knowledge-ingestion/ingestKicd.js
// (needs real internet access - run this on Render, not on a machine
// without outbound access)

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');

const CurriculumLevel = require('../../src/models/CurriculumLevel');
const Subject = require('../../src/models/Subject');
const Topic = require('../../src/models/Topic');
const KnowledgeSource = require('../../src/models/KnowledgeSource');
const KnowledgeChunk = require('../../src/models/KnowledgeChunk');
const { cleanText } = require('../../src/services/documents/pdfExtractor');
const { chunkText } = require('../../src/services/documents/chunker');

const LICENSE_NOTE =
  'Kenya Institute of Curriculum Development (KICD) - official public curriculum design, ' +
  'freely published for teachers, learners, and stakeholders at kicd.ac.ke.';

const REQUEST_DELAY_MS = Number(process.env.KICD_INGEST_DELAY_MS) || 800;

// Verified against the live site structure at kicd.ac.ke (Aug 2026).
// Grades 1-9 pages list clean per-subject headings; Grades 10-12 group PDFs
// under broader elective clusters (Applied Sciences, Pure Sciences, etc.).
const GRADE_PAGES = [
  { url: 'https://kicd.ac.ke/cbc-materials/lower-primary/', grade: 'Grade 1-3', appLevel: 'Lower Primary' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-four-designs/', grade: 'Grade 4', appLevel: 'Upper Primary' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-five-designs/', grade: 'Grade 5', appLevel: 'Upper Primary' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-six-designs/', grade: 'Grade 6', appLevel: 'Upper Primary' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-seven-designs/', grade: 'Grade 7', appLevel: 'Junior School' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-eight-designs/', grade: 'Grade 8', appLevel: 'Junior School' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-nine-designs/', grade: 'Grade 9', appLevel: 'Junior School' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-ten/', grade: 'Grade 10', appLevel: 'Senior School' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-eleven/', grade: 'Grade 11', appLevel: 'Senior School' },
  { url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-twelve/', grade: 'Grade 12', appLevel: 'Senior School' }
  // Pre-Primary is intentionally excluded - it isn't one of the app's four
  // onboarding levels. Add it here (and to the onboarding UI) if needed later.
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Splits a grade page's HTML into { heading, fileId } pairs by walking
// heading tags (h2-h4) and scanning the HTML between consecutive headings
// for Google Drive file links. Regex-based rather than a DOM library so it
// isn't brittle to exact tag nesting on KICD's WordPress theme.
function parseGradePage(html) {
  const headingRegex = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const text = stripTags(match[1]);
    if (!text) continue;
    headings.push({ start: match.index, end: headingRegex.lastIndex, text });
  }

  const results = [];
  for (let i = 0; i < headings.length; i++) {
    const sectionStart = headings[i].end;
    const sectionEnd = i + 1 < headings.length ? headings[i + 1].start : html.length;
    const section = html.slice(sectionStart, sectionEnd);

    const fileIdMatches = [...section.matchAll(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g)];
    const uniqueIds = [...new Set(fileIdMatches.map((m) => m[1]))];

    uniqueIds.forEach((fileId, index) => {
      results.push({
        heading: headings[i].text,
        fileId,
        // For grades 10-12 several PDFs share one broad category heading -
        // number them so each source is distinguishable.
        label: uniqueIds.length > 1 ? `${headings[i].text} (${index + 1})` : headings[i].text
      });
    });
  }
  return results;
}

async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CymorTutorBot/1.0; +https://kicd.ac.ke)' },
    timeout: 20000
  });
  return response.data;
}

// Google Drive serves a virus-scan warning page (HTML, not the file) for
// files it can't scan or that are large. This resolves that by extracting
// the confirmation token and re-requesting.
async function downloadDriveFile(fileId) {
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  let response = await axios.get(directUrl, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CymorTutorBot/1.0)' }
  });

  const contentType = response.headers['content-type'] || '';
  if (contentType.includes('text/html')) {
    const html = Buffer.from(response.data).toString('utf-8');
    const confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/) || html.match(/name="confirm"\s+value="([0-9A-Za-z_-]+)"/);
    if (!confirmMatch) {
      throw new Error('Google Drive returned a page instead of a file (no confirm token found).');
    }
    const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
    response = await axios.get(confirmUrl, {
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CymorTutorBot/1.0)' }
    });
  }

  return Buffer.from(response.data);
}

async function upsertLevel(name, order) {
  return CurriculumLevel.findOneAndUpdate({ name }, { name, order }, { upsert: true, new: true });
}

async function upsertSubject(name, levelId) {
  return Subject.findOneAndUpdate(
    { name, level: levelId },
    { name, level: levelId },
    { upsert: true, new: true }
  );
}

async function upsertTopic(name, subjectId, grade) {
  return Topic.findOneAndUpdate(
    { name, subject: subjectId },
    { name, subject: subjectId, strand: '', subStrand: grade, isDemoData: false },
    { upsert: true, new: true }
  );
}

const LEVEL_ORDER = { 'Lower Primary': 1, 'Upper Primary': 2, 'Junior School': 3, 'Senior School': 4 };

async function ingestOne(item, gradePage, levelDoc) {
  const fileUrl = `https://drive.google.com/file/d/${item.fileId}/view`;

  const existing = await KnowledgeSource.findOne({ fileUrl, status: 'ingested' });
  if (existing) {
    console.log(`  - skip (already ingested): ${item.label}`);
    return { status: 'skipped' };
  }

  try {
    const buffer = await downloadDriveFile(item.fileId);
    const parsed = await pdfParse(buffer);
    const cleaned = cleanText(parsed.text || '');

    if (!cleaned || cleaned.length < 100) {
      throw new Error('Extracted text was too short - the PDF may be scanned/image-based.');
    }

    const subjectDoc = await upsertSubject(item.heading, levelDoc._id);
    const topicDoc = await upsertTopic(`${item.heading} - Full Curriculum Design`, subjectDoc._id, gradePage.grade);

    const source = await KnowledgeSource.create({
      sourceName: `${item.label} - ${gradePage.grade} Curriculum Design`,
      sourceUrl: gradePage.url,
      fileUrl,
      license: LICENSE_NOTE,
      educationLevel: gradePage.appLevel,
      grade: gradePage.grade,
      subject: item.heading,
      topic: topicDoc.name,
      status: 'ingested',
      isDemoData: false
    });

    const chunks = chunkText(cleaned);
    await KnowledgeChunk.insertMany(
      chunks.map((c) => ({
        sourceId: source._id,
        educationLevel: gradePage.appLevel,
        grade: gradePage.grade,
        subject: item.heading,
        text: c.text,
        chunkIndex: c.chunkIndex,
        keywords: c.keywords
      }))
    );

    console.log(`  - ingested: ${item.label} (${chunks.length} chunks, ${parsed.numpages || '?'} pages)`);
    return { status: 'ingested', chunkCount: chunks.length };
  } catch (err) {
    await KnowledgeSource.create({
      sourceName: `${item.label} - ${gradePage.grade} Curriculum Design`,
      sourceUrl: gradePage.url,
      fileUrl,
      license: LICENSE_NOTE,
      educationLevel: gradePage.appLevel,
      grade: gradePage.grade,
      subject: item.heading,
      status: 'failed',
      failureReason: err.message,
      isDemoData: false
    });
    console.log(`  - FAILED: ${item.label} - ${err.message}`);
    return { status: 'failed' };
  }
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to your environment before running this script.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Starting real KICD curriculum ingestion...\n');

  const totals = { ingested: 0, skipped: 0, failed: 0 };

  for (const gradePage of GRADE_PAGES) {
    console.log(`Fetching ${gradePage.grade} (${gradePage.appLevel}): ${gradePage.url}`);

    const levelDoc = await upsertLevel(gradePage.appLevel, LEVEL_ORDER[gradePage.appLevel]);

    let html;
    try {
      html = await fetchPage(gradePage.url);
    } catch (err) {
      console.log(`  - FAILED to fetch page: ${err.message}\n`);
      continue;
    }

    const items = parseGradePage(html);
    if (!items.length) {
      console.log('  - no curriculum design links found on this page.\n');
      continue;
    }
    console.log(`  found ${items.length} document(s)`);

    for (const item of items) {
      const result = await ingestOne(item, gradePage, levelDoc);
      totals[result.status] = (totals[result.status] || 0) + 1;
      await sleep(REQUEST_DELAY_MS); // be polite to KICD / Google Drive
    }
    console.log('');
  }

  console.log('--- Ingestion complete ---');
  console.log(`Ingested: ${totals.ingested}`);
  console.log(`Skipped (already present): ${totals.skipped}`);
  console.log(`Failed: ${totals.failed}`);
  console.log('\nEvery record is stored with its real KICD source page and Google Drive file URL,');
  console.log('and is never marked as demo data. Failed items are logged in KnowledgeSource with');
  console.log('status "failed" and a failureReason, so you can retry or investigate individually.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Ingestion run failed:', err);
  process.exit(1);
});
