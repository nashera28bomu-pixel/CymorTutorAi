const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    level: { type: mongoose.Schema.Types.ObjectId, ref: 'CurriculumLevel', required: true }
  },
  { timestamps: true }
);

subjectSchema.index({ name: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
