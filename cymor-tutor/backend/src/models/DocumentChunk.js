const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    text: { type: String, required: true },
    pageNumber: { type: Number, default: null },
    section: { type: String, default: '' },
    topic: { type: String, default: '' },
    keywords: [{ type: String }],
    chunkIndex: { type: Number, required: true }
  },
  { timestamps: true }
);

// Text index enables simple keyword-based retrieval without a vector DB,
// keeping this free-tier friendly. Can be swapped for embeddings later.
documentChunkSchema.index({ text: 'text', keywords: 'text' });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
