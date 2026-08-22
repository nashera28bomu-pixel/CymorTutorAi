const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { generateExam } = require('../controllers/examController');

router.post('/generate', protect, generateExam);

module.exports = router;
