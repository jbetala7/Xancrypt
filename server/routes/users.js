// server/routes/users.js
const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const User    = require('../models/User');
const authenticate = require('../middleware/authenticate');
const { sendVerificationEmail } = require('../utils/mailer');

const router = express.Router();

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
  // return only fields frontend needs, now including role
  const {
    firstName,
    lastName,
    email,
    active,
    subscription,
    filesEncrypted,
    role
  } = req.user;
  res.json({ firstName, lastName, email, active, subscription, filesEncrypted, role });
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

// PATCH /api/users/me/password
router.patch('/me/password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const isMatch = await bcrypt.compare(oldPassword, req.user.passwordHash);
  if (!isMatch) return res.status(401).json({ error: 'Incorrect current password' });

  // prevent reusing same password
  const isSame = await bcrypt.compare(newPassword, req.user.passwordHash);
  if (isSame) return res.status(400).json({ error: 'New password must differ from old' });

  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ message: 'Password updated' });
});

module.exports = router;