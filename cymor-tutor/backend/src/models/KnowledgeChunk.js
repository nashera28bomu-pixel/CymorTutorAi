const mongoose = require('mongoose');

// Chunks of REAL ingested curriculum content (e.g. from KICD), as opposed to
// DocumentChunk which belongs to a single user's uploaded notes. Shared
// across all learners at the matching level/subject/topic.
const knowledgeChunkSchema = new mongoose.Schema(
  {
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeSource', required: true, index: true },
    educationLevel: { type: String, required: true, index: true }, // app-facing level, e.g. "Junior School"
    grade: { type: String, default: '' }, // raw grade label from KICD, e.g. "Grade 8"
    subject: { type: String, required: true, index: true },
    text: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    keywords: [{ type: String }]
  },
  { timestamps: true }
);

knowledgeChunkSchema.index({ text: 'text', keywords: 'text' });

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
