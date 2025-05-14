// server/middleware/identifyDevice.js

module.exports = function identifyDevice(req, res, next) {
  const deviceId = req.body.deviceId || req.headers['x-device-id'];
  if (!deviceId) {
    return res.status(400).json({ error: 'Missing device ID' });
  }
  req.deviceId = deviceId;
  next();
};
