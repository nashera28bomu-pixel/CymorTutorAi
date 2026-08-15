const QuizAttempt = require('../models/QuizAttempt');
const StudySession = require('../models/StudySession');
const Flashcard = require('../models/Flashcard');
const Document = require('../models/Document');
const asyncHandler = require('../utils/asyncHandler');

const getProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [quizAttempts, documentsCount, flashcardsCount, recentSessions] = await Promise.all([
    QuizAttempt.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    Document.countDocuments({ userId }),
    Flashcard.countDocuments({ userId }),
    StudySession.find({ userId }).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  const totalScore = quizAttempts.reduce((sum, a) => sum + a.score, 0);
  const totalPossible = quizAttempts.reduce((sum, a) => sum + a.total, 0);
  const averageScorePercent = totalPossible ? Math.round((totalScore / totalPossible) * 100) : null;

  res.json({
    documentsCount,
    flashcardsCount,
    quizAttemptsCount: quizAttempts.length,
    averageScorePercent,
    recentQuizAttempts: quizAttempts,
    recentSessions
  });
});

module.exports = { getProgress };
