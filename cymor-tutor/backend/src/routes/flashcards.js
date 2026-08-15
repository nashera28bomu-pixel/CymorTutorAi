const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generateFlashcards, listFlashcards } = require('../controllers/flashcardController');

router.post('/generate', protect, generateFlashcards);
router.get('/', protect, listFlashcards);

module.exports = router;
