const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const aiRouter = require('../services/ai/aiRouter');
const usageService = require('../services/usage/usageService');
const { retrieveCurriculumContext } = require('../services/curriculum/knowledgeRetrieval');
const asyncHandler = require('../utils/asyncHandler');

function parseQuizJson(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Attempt safe recovery by trimming stray markdown fences, then retry once.
    const cleaned = raw.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(cleaned);
  }

  if (!parsed?.questions?.length) {
    const err = new Error('The AI could not generate a valid quiz this time. Please try again.');
    err.status = 502;
    throw err;
  }

  for (const q of parsed.questions) {
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correctIndex !== 'number') {
      const err = new Error('The AI generated an invalid quiz question. Please try again.');
      err.status = 502;
      throw err;
    }
  }

  return parsed.questions;
}

const generateQuiz = asyncHandler(async (req, res) => {
  const { subject, topic, difficulty, numQuestions, documentId } = req.body;

  if (!topic && !documentId) {
    return res.status(400).json({ error: 'Please choose a topic or an uploaded document to quiz on.' });
  }

  await usageService.checkAndIncrementQuiz(req.user._id);
  await usageService.checkAndIncrementAiRequest(req.user._id);

  let sourceExcerpts = '';
  if (documentId) {
    const document = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!document || document.status !== 'ready') {
      return res.status(400).json({ error: 'That document is not ready for quiz generation yet.' });
    }
    const chunks = await DocumentChunk.find({ documentId }).sort({ chunkIndex: 1 }).limit(6).lean();
    sourceExcerpts = chunks.map((c) => c.text).join('\n\n').slice(0, 5000);
  } else if (topic) {
    // Ground topic-based quizzes in real ingested KICD curriculum content when available.
    const { excerpts } = await retrieveCurriculumContext(`${subject || ''} ${topic}`, {
      level: req.user.educationLevel
    });
    sourceExcerpts = excerpts;
  }

  const result = await aiRouter.route({
    taskType: 'quiz_generation',
    question: topic || 'quiz from uploaded notes',
    sourceExcerpts,
    context: { level: req.user.educationLevel, subjects: req.user.subjects },
    extra: {
      subject,
      topic,
      difficulty: difficulty || 'medium',
      numQuestions: Math.min(Number(numQuestions) || 5, 15)
    }
  });

  const questions = parseQuizJson(result.text);

  const quiz = await Quiz.create({
    userId: req.user._id,
    documentId: documentId || null,
    subject: subject || '',
    topic: topic || '',
    difficulty: difficulty || 'medium',
    questions
  });

  // Never leak correctIndex/explanation to the client before submission.
  const publicQuestions = quiz.questions.map((q) => ({ question: q.question, options: q.options }));

  res.status(201).json({ quizId: quiz._id, questions: publicQuestions });
});

const submitQuiz = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });

  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    return res.status(400).json({ error: 'Please answer every question before submitting.' });
  }

  let score = 0;
  const results = quiz.questions.map((q, i) => {
    const correct = answers[i] === q.correctIndex;
    if (correct) score += 1;
    return {
      question: q.question,
      correct,
      correctIndex: q.correctIndex,
      explanation: q.explanation
    };
  });

  await QuizAttempt.create({
    quizId: quiz._id,
    userId: req.user._id,
    answers,
    score,
    total: quiz.questions.length
  });

  res.json({ score, total: quiz.questions.length, results });
});

module.exports = { generateQuiz, submitQuiz };
