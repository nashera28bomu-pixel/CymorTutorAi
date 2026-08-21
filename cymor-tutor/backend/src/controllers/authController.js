const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const VALID_LEVELS = ['Lower Primary', 'Upper Primary', 'Junior School', 'Senior School'];

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isAnonymous: user.isAnonymous,
    educationLevel: user.educationLevel,
    subjects: user.subjects,
    onboardingComplete: user.onboardingComplete
  };
}

// The primary entry point now: just a name and a grade, no password. Most
// learners land in the chat within seconds of opening the link.
const quickStart = asyncHandler(async (req, res) => {
  const { name, educationLevel } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Please tell Cymor your name.' });
  }
  if (!VALID_LEVELS.includes(educationLevel)) {
    return res.status(400).json({ error: 'Please select a valid education level.' });
  }

  const user = await User.create({
    name: name.trim(),
    educationLevel,
    isAnonymous: true,
    onboardingComplete: true
  });

  const token = signToken(user._id);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are all required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash, isAnonymous: false });

  const token = signToken(user._id);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(user._id);
  res.json({ token, user: sanitizeUser(user) });
});

// Lets a learner who started anonymously (quick-start) attach an email +
// password later so they can recover their history from another device.
// Their existing user record, chats, and progress are preserved as-is.
const claimAccount = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide an email and password to save your progress.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing && String(existing._id) !== String(req.user._id)) {
    return res.status(409).json({ error: 'That email is already saved to another account.' });
  }

  req.user.email = email.toLowerCase();
  req.user.passwordHash = await bcrypt.hash(password, 10);
  req.user.isAnonymous = false;
  await req.user.save();

  res.json({ user: sanitizeUser(req.user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { educationLevel, subjects, name } = req.body;

  if (educationLevel) {
    if (!VALID_LEVELS.includes(educationLevel)) {
      return res.status(400).json({ error: 'Please select a valid education level.' });
    }
    req.user.educationLevel = educationLevel;
  }
  if (Array.isArray(subjects)) req.user.subjects = subjects;
  if (name && name.trim()) req.user.name = name.trim();

  req.user.onboardingComplete = true;
  await req.user.save();

  res.json({ user: sanitizeUser(req.user) });
});

module.exports = { quickStart, register, login, claimAccount, me, updateProfile };
