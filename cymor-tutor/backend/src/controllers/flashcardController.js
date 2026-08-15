const Flashcard = require('../models/Flashcard');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const aiRouter = require('../services/ai/aiRouter');
const usageService = require('../services/usage/usageService');
const { retrieveCurriculumContext } = require('../services/curriculum/knowledgeRetrieval');
const asyncHandler = require('../utils/asyncHandler');

function parseFlashcardJson(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  if (!parsed?.cards?.length) {
    const err = new Error('The AI could not generate flashcards this time. Please try again.');
    err.status = 502;
    throw err;
  }

  return parsed.cards.filter((c) => c.front && c.back);
}

const generateFlashcards = asyncHandler(async (req, res) => {
  const { subject, topic, numCards, documentId } = req.body;

  if (!topic && !documentId) {
    return res.status(400).json({ error: 'Please choose a topic or an uploaded document.' });
  }

  await usageService.checkAndIncrementAiRequest(req.user._id);

  let sourceExcerpts = '';
  if (documentId) {
    const document = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!document || document.status !== 'ready') {
      return res.status(400).json({ error: 'That document is not ready yet.' });
    }
    const chunks = await DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 }).limit(6).lean();
    sourceExcerpts = chunks.map((c) => c.text).join('\n\n').slice(0, 5000);
  } else if (topic) {
    const { excerpts } = await retrieveCurriculumContext(`${subject || ''} ${topic}`, {
      level: req.user.educationLevel
    });
    sourceExcerpts = excerpts;
  }

  const result = await aiRouter.route({
    taskType: 'flashcards',
    question: topic || 'flashcards from uploaded notes',
    sourceExcerpts,
    context: { level: req.user.educationLevel, subjects: req.user.subjects },
    extra: { subject, topic, numCards: Math.min(Number(numCards) || 10, 20) }
  });

  const cards = parseFlashcardJson(result.text);

  const saved = await Flashcard.insertMany(
    cards.map((c) => ({
      userId: req.user._id,
      documentId: documentId || null,
      subject: subject || '',
      topic: topic || '',
      front: c.front,
      back: c.back
    }))
  );

  res.status(201).json({ flashcards: saved });
});

const listFlashcards = asyncHandler(async (req, res) => {
  const query = { userId: req.user._id };
  if (req.query.topic) query.topic = req.query.topic;
  if (req.query.documentId) query.documentId = req.query.documentId;

  const flashcards = await Flashcard.find(query).sort({ createdAt: -1 }).lean();
  res.json({ flashcards });
});

module.exports = { generateFlashcards, listFlashcards };
