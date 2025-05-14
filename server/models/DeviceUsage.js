// server/models/DeviceUsage.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const RecordSchema = new Schema({
  time: {
    type: Date,
    required: true
  },
  files: {
    type: Number,
    required: true
  }
});

const DeviceUsageSchema = new Schema({
  deviceId: {
    type: String,
    required: false,
    index: true
  },
  ip: {
    type: String,
    required: false,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  records: {
    type: [RecordSchema],
    default: []
  }
});

module.exports = mongoose.model('DeviceUsage', DeviceUsageSchema);
