const mongoose = require('mongoose');

// One record per user per calendar day. Powers daily/monthly free-tier quotas.
const usageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    aiRequests: { type: Number, default: 0 },
    documentUploads: { type: Number, default: 0 },
    quizGenerations: { type: Number, default: 0 },
    examGenerations: { type: Number, default: 0 }
  },
  { timestamps: true }
);

usageSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Usage', usageSchema);
