// server/models/User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EncryptionRecordSchema = new Schema({
  timestamp: { type: Date, required: true },
  cssCount: { type: Number, required: true },
  jsCount: { type: Number, required: true },
  link: { type: String, required: true },
  filename: { type: String, required: true }
}, { _id: false });

const UserSchema = new Schema({
  // Authentication
  email: { type: String, required: true, unique: true },
  passwordHash: String,

  // OAuth IDs (added by passport strategies)
  oauth: {
    googleId: String,
    githubId: String,
  },

  // Profile info
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },

  // Email verification
  active: { type: Boolean, default: false },

  // Usage tracking
  filesEncrypted: { type: Number, default: 0 },

  // Persisted per-user history
  encryptionHistory: { type: [EncryptionRecordSchema], default: [] },

  // Stripe billing
  stripeCustomerId: String,
  subscription: {
    plan: { type: String, enum: ['free', 'individual'], default: 'free' },
    status: String,
    currentPeriodEnd: Date
  },

  // Roles & admin
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
