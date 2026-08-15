const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

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
    educationLevel: user.educationLevel,
    subjects: user.subjects,
    onboardingComplete: user.onboardingComplete
  };
}

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
  const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

  const token = signToken(user._id);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(user._id);
  res.json({ token, user: sanitizeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

const completeOnboarding = asyncHandler(async (req, res) => {
  const { educationLevel, subjects } = req.body;
  const validLevels = ['Lower Primary', 'Upper Primary', 'Junior School', 'Senior School'];

  if (!validLevels.includes(educationLevel)) {
    return res.status(400).json({ error: 'Please select a valid education level.' });
  }

  req.user.educationLevel = educationLevel;
  req.user.subjects = Array.isArray(subjects) ? subjects : [];
  req.user.onboardingComplete = true;
  await req.user.save();

  res.json({ user: sanitizeUser(req.user) });
});

module.exports = { register, login, me, completeOnboarding };
