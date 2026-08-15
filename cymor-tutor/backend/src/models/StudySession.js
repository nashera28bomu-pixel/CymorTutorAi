const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    activityType: {
      type: String,
      enum: ['chat', 'document_qa', 'quiz', 'flashcards', 'summary'],
      required: true
    },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    durationSeconds: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudySession', studySessionSchema);
