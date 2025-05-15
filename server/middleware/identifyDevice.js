// server/middleware/identifyDevice.js
const { v4: uuidv4 } = require('uuid');

module.exports = function identifyDevice(req, res, next) {
  let deviceId = req.cookies?.deviceId;

  if (!deviceId) {
    deviceId = uuidv4();
    res.cookie('deviceId', deviceId, {
      httpOnly: false,             // readable by frontend if needed
      secure: false,               // change to true in production with HTTPS
      sameSite: 'Lax',
      maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
    });
    console.log('🎯 New deviceId issued:', deviceId);
  }

  req.deviceId = deviceId;
  next();
};
