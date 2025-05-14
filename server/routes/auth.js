// server/routes/auth.js
const express               = require('express');
const bcrypt                = require('bcrypt');
const jwt                   = require('jsonwebtoken');
const User                  = require('../models/User');
const { sendVerificationEmail } = require('../utils/mailer');
const mongoose = require('mongoose');
const router = express.Router();
const passport = require('passport');

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email & password are required' });
  }
  if (await User.exists({ email })) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, active: false });
  console.log('👤 New signup:', email);

  // Create a JWT for verification
  const vToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
  await sendVerificationEmail(user, vToken);

  res.json({ message: 'Verification email sent. Please check your inbox.' });
});

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  console.log('🔑 verify-email called, token=', req.query.token);
  try {
    const { id } = jwt.verify(req.query.token, process.env.JWT_SECRET);
    console.log('🔓 token valid, activating user id=', id);

    const result = await User.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { active: true } }
    );

    console.log('✅ DB update result:', result);

    return res.redirect(`${process.env.CLIENT_URL}/auth?verified=1`);
  } catch (err) {
    console.error('✖ verify-email error:', err.message);
    return res.status(400).send('Invalid or expired verification link.');
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  console.log('👋 LOGIN req.body:', req.body);
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email & password are required' });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'No account found for that email' });
  }
  if (!user.active) {
    return res.status(403).json({ error: 'Email not verified—check your inbox' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  console.log('🔑 LOGIN success for:', email);
  return res.json({ token });
});

// GOOGLE LOGIN
router.get('/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth` }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
  }
);

// GITHUB LOGIN
router.get('/github',
  passport.authenticate('github', { session: false, scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth` }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
  }
);

module.exports = router;
