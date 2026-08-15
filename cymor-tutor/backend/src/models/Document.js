const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    pageCount: { type: Number, default: 0 },
    educationLevel: { type: String, default: '' },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    status: {
      type: String,
      enum: ['processing', 'ready', 'failed'],
      default: 'processing'
    },
    failureReason: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
