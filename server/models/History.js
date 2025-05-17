// server/models/History.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventSchema = new Schema({
  time:       { type: Date,   required: true },
  cssCount:   { type: Number, required: true },
  jsCount:    { type: Number, required: true },
  elapsedSec: { type: Number, required: true },
  filename:   { type: String, required: true },
  link:       { type: String, required: true }
}, { _id: false });

const HistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  events: { type: [EventSchema], default: [] } // Ensure events is always an array
}, { timestamps: true });

module.exports = mongoose.model('History', HistorySchema);