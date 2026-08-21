const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, default: null },
    passwordHash: { type: String, default: null },
    // True until the learner optionally "saves" their account with an email/password.
    // Anonymous accounts are still fully functional - just device-bound.
    isAnonymous: { type: Boolean, default: true },
    educationLevel: {
      type: String,
      enum: ['Lower Primary', 'Upper Primary', 'Junior School', 'Senior School', null],
      default: null
    },
    subjects: [{ type: String }],
    onboardingComplete: { type: Boolean, default: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
