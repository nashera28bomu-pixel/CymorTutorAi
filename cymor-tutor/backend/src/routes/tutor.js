const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { chat, listConversations, getConversation } = require('../controllers/tutorController');

router.post('/chat', protect, chat);
router.get('/conversations', protect, listConversations);
router.get('/conversations/:id', protect, getConversation);

module.exports = router;
