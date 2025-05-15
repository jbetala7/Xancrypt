// server/routes/users.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const mongoose= require('mongoose');
const User    = require('../models/User');
const { sendVerificationEmail } = require('../utils/mailer');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
  // return only fields frontend needs
  const { firstName, lastName, email, active, subscription, filesEncrypted } = req.user;
  res.json({ firstName, lastName, email, active, subscription, filesEncrypted });
});

// PATCH /api/users/me
router.patch('/me', authenticate, async (req, res) => {
  const { firstName, lastName } = req.body;
  if (firstName !== undefined) req.user.firstName = firstName;
  if (lastName  !== undefined) req.user.lastName  = lastName;
  await req.user.save();
  res.json({ message: 'Profile updated' });
});

// POST /api/users/me/email — change email + resend verification
router.post('/me/email', authenticate, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // ensure no dupes
  if (await User.exists({ email })) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  req.user.email = email;
  req.user.active = false;
  await req.user.save();

  const vToken = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
  await sendVerificationEmail(req.user, vToken);
  res.json({ message: 'Verification sent' });
});

// POST /api/users/me/verify
// (you can also reuse your existing /auth/verify-email logic)
router.post('/me/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    await User.findByIdAndUpdate(id, { active: true });
    res.json({ message: 'Email verified' });
  } catch {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
