const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const {
  chat,
  chatStream,
  listConversations,
  getConversation,
  deleteConversation
} = require('../controllers/tutorController');

router.post('/chat', protect, chat);
router.post('/chat/stream', protect, chatStream);
router.get('/conversations', protect, listConversations);
router.get('/conversations/:id', protect, getConversation);
router.delete('/conversations/:id', protect, deleteConversation);

module.exports = router;
