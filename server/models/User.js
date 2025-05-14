const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  stripeCustomerId: String,
  subscription: {
    plan: { type: String, enum: ['free','individual'], default: 'free' },
    status: String,
    currentPeriodEnd: Date
  },
  role: { type: String, enum: ['user','admin'], default: 'user' },
  active: { type: Boolean, default: false }  // ✅ ← add this line
});

module.exports = mongoose.model('User', UserSchema);
