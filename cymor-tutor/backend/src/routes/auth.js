const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { quickStart, register, login, claimAccount, me, updateProfile } = require('../controllers/authController');

router.post('/quick-start', quickStart);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.post('/claim', protect, claimAccount);
router.post('/onboarding', protect, updateProfile); // kept for backward compatibility
router.post('/profile', protect, updateProfile);

module.exports = router;
