const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const aiRouter = require('../services/ai/aiRouter');
const usageService = require('../services/usage/usageService');
const { retrieveCurriculumContext } = require('../services/curriculum/knowledgeRetrieval');
const asyncHandler = require('../utils/asyncHandler');

const MAX_RECENT_MESSAGES = 8;

const chat = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Please enter a question or message.' });
  }

  await usageService.checkAndIncrementAiRequest(req.user._id);

  let conversation = conversationId ? await Conversation.findOne({ _id: conversationId, userId: req.user._id }) : null;

  if (!conversation) {
    conversation = await Conversation.create({
      userId: req.user._id,
      title: message.slice(0, 60)
    });
  }

  // Only send recent turns, not the full history, to keep token usage low.
  const recent = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(MAX_RECENT_MESSAGES)
    .lean();

  const context = {
    level: req.user.educationLevel,
    subjects: req.user.subjects
  };

  const historyNote = recent.length
    ? `Recent conversation (most recent last):\n${recent
        .reverse()
        .map((m) => `${m.role === 'user' ? 'Learner' : 'Cymor'}: ${m.content}`)
        .join('\n')}\n\n`
    : '';

  // Ground the answer in real ingested KICD curriculum content when it's
  // relevant to the learner's level and question - see knowledgeRetrieval.js.
  const { excerpts } = await retrieveCurriculumContext(message, context);

  const result = await aiRouter.route({
    question: `${historyNote}Learner: ${message}`,
    sourceExcerpts: excerpts,
    context
  });

  await Message.create({ conversationId: conversation._id, role: 'user', content: message });
  await Message.create({
    conversationId: conversation._id,
    role: 'assistant',
    content: result.text,
    taskType: result.taskType,
    fromDocument: Boolean(result.usedCurriculum)
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  res.json({
    conversationId: conversation._id,
    taskType: result.taskType,
    reply: result.text,
    usedCurriculum: Boolean(result.usedCurriculum)
  });
});

const listConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ userId: req.user._id })
    .sort({ lastMessageAt: -1 })
    .limit(50)
    .lean();
  res.json({ conversations });
});

const getConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).lean();
  res.json({ conversation, messages });
});

module.exports = { chat, listConversations, getConversation };
