const mongoose = require('mongoose');
const { Schema } = mongoose;

const DeviceUsageSchema = new Schema({
  deviceId:    { type: String, required: true, unique: true },
  encryptedAt: { type: [Date], default: [] }
});

module.exports = mongoose.model('DeviceUsage', DeviceUsageSchema);
