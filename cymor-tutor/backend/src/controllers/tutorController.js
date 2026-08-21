const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const aiRouter = require('../services/ai/aiRouter');
const usageService = require('../services/usage/usageService');
const { retrieveCurriculumContext } = require('../services/curriculum/knowledgeRetrieval');
const asyncHandler = require('../utils/asyncHandler');

const MAX_RECENT_MESSAGES = 8;

async function loadOrCreateConversation(userId, conversationId, firstMessage) {
  let conversation = conversationId
    ? await Conversation.findOne({ _id: conversationId, userId })
    : null;

  if (!conversation) {
    conversation = await Conversation.create({ userId, title: firstMessage.slice(0, 60) });
  }
  return conversation;
}

async function buildTurnContext(user, conversation, message) {
  const priorCount = await Message.countDocuments({ conversationId: conversation._id });
  const isFirstMessage = priorCount === 0;

  const recent = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(MAX_RECENT_MESSAGES)
    .lean();
  const orderedRecent = recent.reverse();

  const lastAssistant = [...orderedRecent].reverse().find((m) => m.role === 'assistant');
  const isMarkingAttempt = Boolean(lastAssistant && lastAssistant.content.includes(aiRouter.PRACTICE_MARKER));

  let previousQuestion = '';
  if (isMarkingAttempt) {
    const idx = lastAssistant.content.indexOf(aiRouter.PRACTICE_MARKER);
    previousQuestion = lastAssistant.content.slice(idx + aiRouter.PRACTICE_MARKER.length).trim().split('\n')[0];
  }

  const historyNote = orderedRecent.length
    ? `Recent conversation (most recent last):\n${orderedRecent
        .map((m) => `${m.role === 'user' ? 'Learner' : 'Cymor'}: ${m.content}`)
        .join('\n')}\n\n`
    : '';

  const context = { level: user.educationLevel, subjects: user.subjects, isFirstMessage };

  let sourceExcerpts = '';
  let tags = [];
  let taskType = isMarkingAttempt ? 'marking' : undefined;

  if (!isMarkingAttempt) {
    const retrieval = await retrieveCurriculumContext(message, context);
    sourceExcerpts = retrieval.excerpts;
    tags = retrieval.tags;
  }

  return {
    context,
    taskType,
    sourceExcerpts,
    extra: isMarkingAttempt ? { previousQuestion } : undefined,
    question: `${historyNote}Learner: ${message}`,
    tags,
    isMarkingAttempt
  };
}

async function findRelatedNote(userId, tags) {
  if (!tags || !tags.length) return null;
  const subject = tags[0].subject;
  if (!subject) return null;
  const doc = await Document.findOne({
    userId,
    status: 'ready',
    subject: new RegExp(subject.split(' ')[0], 'i')
  }).lean();
  return doc ? { id: doc._id, filename: doc.filename } : null;
}

const chat = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Please enter a question or message.' });
  }

  await usageService.checkAndIncrementAiRequest(req.user._id);

  const conversation = await loadOrCreateConversation(req.user._id, conversationId, message);
  const turn = await buildTurnContext(req.user, conversation, message);

  const result = await aiRouter.route({
    taskType: turn.taskType,
    question: turn.question,
    sourceExcerpts: turn.sourceExcerpts,
    context: turn.context,
    extra: turn.extra
  });

  const relatedNote = await findRelatedNote(req.user._id, turn.tags);

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
    usedCurriculum: Boolean(result.usedCurriculum),
    curriculumTags: turn.tags,
    relatedNote
  });
});

// Server-Sent-Events style streaming endpoint. The frontend reads this with
// a raw fetch + ReadableStream reader rather than the JSON api client.
const chatStream = asyncHandler(async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Please enter a question or message.' });
    return;
  }

  await usageService.checkAndIncrementAiRequest(req.user._id);

  const conversation = await loadOrCreateConversation(req.user._id, conversationId, message);
  const turn = await buildTurnContext(req.user, conversation, message);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('meta', { conversationId: conversation._id });

  try {
    const result = await aiRouter.routeStream(
      {
        taskType: turn.taskType,
        question: turn.question,
        sourceExcerpts: turn.sourceExcerpts,
        context: turn.context,
        extra: turn.extra
      },
      (piece) => send('chunk', { text: piece })
    );

    const relatedNote = await findRelatedNote(req.user._id, turn.tags);

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

    send('done', {
      taskType: result.taskType,
      usedCurriculum: Boolean(result.usedCurriculum),
      curriculumTags: turn.tags,
      relatedNote
    });
  } catch (err) {
    send('error', { error: err.message || 'Something went wrong. Please try again.' });
  } finally {
    res.end();
  }
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

const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  await Message.deleteMany({ conversationId: conversation._id });
  await conversation.deleteOne();
  res.json({ success: true });
});

module.exports = { chat, chatStream, listConversations, getConversation, deleteConversation };
