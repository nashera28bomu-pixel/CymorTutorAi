const gemini = require('../services/ai/geminiClient');
const { examPaperSystemPrompt } = require('../prompts/examPaper');
const { buildExamPdf } = require('../services/exam/examPdfBuilder');
const { retrieveCurriculumContext } = require('../services/curriculum/knowledgeRetrieval');
const usageService = require('../services/usage/usageService');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const asyncHandler = require('../utils/asyncHandler');

function parseExamJson(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  if (!parsed?.sections?.length) {
    const err = new Error('The AI could not generate a valid assessment this time. Please try again.');
    err.status = 502;
    throw err;
  }

  for (const section of parsed.sections) {
    if (!['mcq', 'short', 'essay'].includes(section.type) || !Array.isArray(section.questions) || !section.questions.length) {
      const err = new Error('The AI generated an invalid assessment. Please try again.');
      err.status = 502;
      throw err;
    }
    if (section.type === 'mcq') {
      for (const q of section.questions) {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== 'number') {
          const err = new Error('The AI generated an invalid question. Please try again.');
          err.status = 502;
          throw err;
        }
      }
    }
  }

  return parsed;
}

function safeFilename(str) {
  return (str || 'Cymor-Tutor-Assessment').replace(/[^a-z0-9\-_]+/gi, '-').slice(0, 60);
}

const generateExam = asyncHandler(async (req, res) => {
  const { subject, topic, numMcq, numShort, includeEssay, documentId } = req.body;

  if (!topic && !documentId) {
    return res.status(400).json({ error: 'Please provide a topic or an uploaded document to build the assessment from.' });
  }

  await usageService.checkAndIncrementExam(req.user._id);
  await usageService.checkAndIncrementAiRequest(req.user._id);

  let sourceExcerpts = '';
  if (documentId) {
    const document = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!document || document.status !== 'ready') {
      return res.status(400).json({ error: 'That document is not ready yet.' });
    }
    const chunks = await DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 }).limit(8).lean();
    sourceExcerpts = chunks.map((c) => c.text).join('\n\n').slice(0, 6000);
  } else if (topic) {
    const { excerpts } = await retrieveCurriculumContext(`${subject || ''} ${topic}`, {
      level: req.user.educationLevel
    });
    sourceExcerpts = excerpts;
  }

  const system = examPaperSystemPrompt({ level: req.user.educationLevel, subjects: req.user.subjects });
  const prompt = `Subject: ${subject || 'general'}
Topic: ${topic || 'from the attached notes'}
Number of multiple-choice questions: ${Math.min(Number(numMcq) || 8, 20)}
Number of short-answer questions: ${Math.min(Number(numShort) || 4, 12)}
Include one essay question (20 marks): ${includeEssay ? 'yes' : 'no'}
${sourceExcerpts ? `Source material:\n"""\n${sourceExcerpts}\n"""` : ''}`;

  const raw = await gemini.generate(system, prompt, { maxOutputTokens: 3000, complex: true });
  const exam = parseExamJson(raw);

  const filename = `${safeFilename(exam.title || topic || subject)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  buildExamPdf(
    {
      exam,
      subject: subject || '',
      topic: topic || '',
      level: req.user.educationLevel,
      learnerName: req.user.name
    },
    res
  );
});

module.exports = { generateExam };
