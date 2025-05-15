// server/routes/auth.js

const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const mongoose= require('mongoose');
const User    = require('../models/User');
const { sendVerificationEmail } = require('../utils/mailer');

const router = express.Router();

const ACCESS_EXPIRES_IN  = '15m';
const REFRESH_EXPIRES_IN = '30d';

const passport = require('passport');

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google', {
  failureRedirect: `${process.env.CLIENT_URL}/auth?error=google`,
  session: false
}), async (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET);
  res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
});


// Trigger GitHub login
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Handle GitHub callback
router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.CLIENT_URL}/auth?error=github`,
    session: false
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET);
    res.redirect(`${process.env.CLIENT_URL}/auth?token=${token}`);
  }
);

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & password are required' });
  if (await User.exists({ email })) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, active: false });
  console.log('👤 New signup:', email);

  const vToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
  await sendVerificationEmail(user, vToken);

  return res.json({ message: 'Verification email sent. Check your inbox.' });
});

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { id } = jwt.verify(req.query.token, process.env.JWT_SECRET);
    await User.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { active: true } });
    return res.redirect(`${process.env.CLIENT_URL}/auth?verified=1`);
  } catch (err) {
    return res.status(400).send('Invalid or expired verification link.');
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body||{};
  if (!email||!password) return res.status(400).json({ error:'Email & password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'No account found' });
  if (!user.active) return res.status(403).json({ error: 'Email not verified' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Incorrect password' });

  // create tokens
  const accessToken  = jwt.sign({ id: user._id }, process.env.JWT_SECRET,        { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  // set cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30*24*60*60*1000
  });

  console.log('🔑 LOGIN success for:', email);
  return res.json({ token: accessToken });
});

// ─── REFRESH ──────────────────────────────────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const { id } = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
    return res.json({ token: accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', { sameSite:'strict', secure: process.env.NODE_ENV==='production' });
  return res.json({ message: 'Logged out' });
});

module.exports = router;
