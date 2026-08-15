const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generateQuiz, submitQuiz } = require('../controllers/quizController');

router.post('/generate', protect, generateQuiz);
router.post('/:id/submit', protect, submitQuiz);

module.exports = router;
