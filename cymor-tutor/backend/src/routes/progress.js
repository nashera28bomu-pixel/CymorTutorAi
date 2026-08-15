const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { getProgress } = require('../controllers/progressController');

router.get('/', protect, getProgress);

module.exports = router;
