const KnowledgeChunk = require('../../models/KnowledgeChunk');

const MAX_CONTEXT_CHARS = 2500;

/**
 * Retrieves real ingested curriculum content (e.g. from KICD) relevant to a
 * learner's question, scoped to their education level where possible. This
 * is what lets Cymor Tutor ground answers in actual CBC curriculum content
 * instead of only general knowledge.
 */
async function retrieveCurriculumContext(question, { level, subjects } = {}) {
  if (!question || question.trim().length < 3) {
    return { excerpts: '', chunkCount: 0, used: false, tags: [] };
  }

  const filter = { $text: { $search: question } };
  if (level) filter.educationLevel = level;

  let matches = [];
  try {
    matches = await KnowledgeChunk.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(4)
      .lean();
  } catch (err) {
    matches = [];
  }

  // If nothing matched at the learner's exact level, try without the level
  // filter (e.g. a Junior School learner asking something covered at Upper
  // Primary level too) before giving up.
  if (!matches.length && level) {
    try {
      matches = await KnowledgeChunk.find(
        { $text: { $search: question } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(3)
        .lean();
    } catch (err) {
      matches = [];
    }
  }

  if (!matches.length) {
    return { excerpts: '', chunkCount: 0, used: false, tags: [] };
  }

  let combined = '';
  for (const m of matches) {
    const tagged = `[${m.subject}${m.grade ? ' - ' + m.grade : ''}]\n${m.text}`;
    if ((combined + tagged).length > MAX_CONTEXT_CHARS) break;
    combined += (combined ? '\n\n---\n\n' : '') + tagged;
  }

  // Dedupe subject/grade pairs so the frontend can show a clean "you're
  // studying: X, Grade Y" tag under the answer - this is what makes the
  // curriculum ingestion actually visible and useful to the learner.
  const seen = new Set();
  const tags = [];
  for (const m of matches) {
    const key = `${m.subject}|${m.grade}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push({ subject: m.subject, grade: m.grade, educationLevel: m.educationLevel });
  }

  return { excerpts: combined, chunkCount: matches.length, used: true, tags };
}

module.exports = { retrieveCurriculumContext };
