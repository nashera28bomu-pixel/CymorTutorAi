const PDFDocument = require('pdfkit');

const FOREST = '#16302A';
const GOLD = '#C99A3E';
const INK = '#1E2723';
const MUTED = '#6B7268';

function drawHeader(doc, { title, subject, topic, level, learnerName }) {
  const pageWidth = doc.page.width;

  // Forest-green header band with gold "CT" mark, matching the app's brand.
  doc.rect(0, 0, pageWidth, 86).fill(FOREST);
  doc.roundedRect(40, 22, 42, 42, 10).fill(GOLD);
  doc.fillColor(FOREST).fontSize(16).font('Helvetica-Bold').text('CT', 40, 36, { width: 42, align: 'center' });

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('CYMOR TUTOR ASSESSMENT', 96, 26);
  doc
    .fillColor('#E4D9BC')
    .font('Helvetica')
    .fontSize(10)
    .text('Your AI Study Partner \u00B7 Cymor Tech Services', 96, 50);

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text(title, 40, 104, { width: pageWidth - 80 });

  doc.moveDown(0.3);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(MUTED)
    .text(`Subject: ${subject || '\u2014'}    Topic: ${topic || '\u2014'}    Level: ${level || '\u2014'}`);

  doc.moveDown(0.8);
  const lineY = doc.y;
  doc.fillColor(INK).fontSize(10);
  doc.text(`Name: ${learnerName ? learnerName + ' _______________' : '_______________________________'}`, 40, lineY, { continued: false });
  doc.text('Date: _______________', pageWidth - 200, lineY);

  doc.moveDown(1);
  doc.moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).strokeColor('#D9D2BF').stroke();
  doc.moveDown(0.6);
}

function drawInstructions(doc, instructions) {
  doc
    .font('Helvetica-Oblique')
    .fontSize(10.5)
    .fillColor(INK)
    .text(instructions || 'Answer ALL questions in the spaces provided.', { width: doc.page.width - 80 });
  doc.moveDown(1);
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function drawSectionLabel(doc, label, marksNote) {
  ensureSpace(doc, 40);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(FOREST).text(label);
  if (marksNote) {
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(marksNote);
  }
  doc.moveDown(0.4);
}

function drawMcqSection(doc, section) {
  const marksNote = `(${section.marksEach} mark${section.marksEach === 1 ? '' : 's'} each)`;
  drawSectionLabel(doc, section.label || 'Section A: Multiple Choice', marksNote);

  section.questions.forEach((q, i) => {
    ensureSpace(doc, 90);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(`${i + 1}. ${q.question}`, { width: doc.page.width - 80 });
    doc.moveDown(0.2);
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
      doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(`   ${letters[idx]}. ${opt}`, { width: doc.page.width - 100 });
    });
    doc.moveDown(0.6);
  });
}

function drawShortSection(doc, section) {
  const marksNote = `(${section.marksEach} mark${section.marksEach === 1 ? '' : 's'} each)`;
  drawSectionLabel(doc, section.label || 'Section B: Short Answer', marksNote);

  section.questions.forEach((q, i) => {
    ensureSpace(doc, 110);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(`${i + 1}. ${q.question}`, { width: doc.page.width - 80 });
    doc.moveDown(0.4);
    // Blank answer lines, roughly scaled to marks available.
    const lineCount = Math.max(2, Math.min(5, section.marksEach + 1));
    for (let l = 0; l < lineCount; l++) {
      const y = doc.y;
      doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor('#D9D2BF').stroke();
      doc.moveDown(0.9);
    }
    doc.moveDown(0.3);
  });
}

function drawEssaySection(doc, section) {
  const marksNote = `(${section.marksEach} marks)`;
  drawSectionLabel(doc, section.label || 'Section C: Essay', marksNote);

  section.questions.forEach((q, i) => {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(`${i + 1}. ${q.question}`, { width: doc.page.width - 80 });
    doc.moveDown(0.5);
    const linesPerPage = 24;
    for (let l = 0; l < linesPerPage; l++) {
      const y = doc.y;
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
      }
      const curY = doc.y;
      doc.moveTo(40, curY).lineTo(doc.page.width - 40, curY).strokeColor('#D9D2BF').stroke();
      doc.moveDown(1.1);
    }
  });
}

function drawMarkingScheme(doc, exam) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 50).fill(GOLD);
  doc.fillColor(FOREST).font('Helvetica-Bold').fontSize(15).text('MARKING SCHEME', 40, 15);
  doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(9).text('For self-marking or teacher use \u2014 keep separate while attempting the paper.', 40, 60);
  doc.moveDown(1.2);

  exam.sections.forEach((section) => {
    ensureSpace(doc, 40);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(FOREST).text(section.label);
    doc.moveDown(0.3);

    if (section.type === 'mcq') {
      const letters = ['A', 'B', 'C', 'D'];
      section.questions.forEach((q, i) => {
        ensureSpace(doc, 18);
        doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(`${i + 1}. ${letters[q.correctIndex] || '?'} \u2014 ${q.options?.[q.correctIndex] || ''}`);
      });
    } else if (section.type === 'short') {
      section.questions.forEach((q, i) => {
        ensureSpace(doc, 34);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(`${i + 1}. ${q.question}`, { width: doc.page.width - 80 });
        doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(q.modelAnswer || '', { width: doc.page.width - 80 });
        doc.moveDown(0.3);
      });
    } else if (section.type === 'essay') {
      section.questions.forEach((q, i) => {
        ensureSpace(doc, 60);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(`${i + 1}. ${q.question}`, { width: doc.page.width - 80 });
        doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('Expected key points:', { width: doc.page.width - 80 });
        (q.modelAnswerPoints || []).forEach((point) => {
          ensureSpace(doc, 16);
          doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`\u2022 ${point}`, { width: doc.page.width - 90, indent: 10 });
        });
        doc.moveDown(0.4);
      });
    }
    doc.moveDown(0.6);
  });
}

function drawFooterOnAllPages(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Cymor Tutor AI \u00B7 Built by Legendary Smiley Cymor \u00B7 Page ${i + 1} of ${range.count}`,
        40,
        doc.page.height - 30,
        { width: doc.page.width - 80, align: 'center' }
      );
  }
}

/**
 * Builds the full assessment PDF (question paper + marking scheme) and
 * pipes it to the given writable stream (typically the HTTP response).
 */
function buildExamPdf({ exam, subject, topic, level, learnerName }, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  doc.pipe(outputStream);

  drawHeader(doc, { title: exam.title, subject, topic, level, learnerName });
  drawInstructions(doc, exam.instructions);

  exam.sections.forEach((section) => {
    if (section.type === 'mcq') drawMcqSection(doc, section);
    else if (section.type === 'short') drawShortSection(doc, section);
    else if (section.type === 'essay') drawEssaySection(doc, section);
  });

  drawMarkingScheme(doc, exam);
  drawFooterOnAllPages(doc);

  doc.end();
}

module.exports = { buildExamPdf };
