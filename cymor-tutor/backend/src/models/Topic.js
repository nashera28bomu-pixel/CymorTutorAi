const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    strand: { type: String, default: '' },
    subStrand: { type: String, default: '' },
    isDemoData: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Topic', topicSchema);
