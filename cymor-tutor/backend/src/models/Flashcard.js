const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    front: { type: String, required: true },
    back: { type: String, required: true },
    // Reserved for future spaced-repetition scheduling.
    interval: { type: Number, default: 1 },
    nextReviewAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Flashcard', flashcardSchema);
