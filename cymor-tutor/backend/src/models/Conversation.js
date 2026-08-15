const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New conversation' },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    summary: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
