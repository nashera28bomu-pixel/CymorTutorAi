const mongoose = require('mongoose');

const knowledgeSourceSchema = new mongoose.Schema(
  {
    sourceName: { type: String, required: true },
    sourceUrl: { type: String, default: '' }, // the KICD grade page this was found on
    fileUrl: { type: String, default: '' }, // the actual PDF/Google Drive URL ingested
    license: { type: String, default: '' },
    educationLevel: { type: String, default: '' },
    grade: { type: String, default: '' },
    subject: { type: String, default: '' },
    topic: { type: String, default: '' },
    status: { type: String, enum: ['ingested', 'failed'], default: 'ingested' },
    failureReason: { type: String, default: '' },
    isDemoData: { type: Boolean, default: false },
    dateAdded: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeSource', knowledgeSourceSchema);
