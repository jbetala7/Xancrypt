const { v4: uuidv4 } = require('uuid');
const DeviceUsage    = require('../models/DeviceUsage');

module.exports = function identifyDevice(req, res, next) {
  let deviceId = req.cookies.deviceId;
  if (!deviceId) {
    deviceId = uuidv4();
    // httpOnly so front-end JS can’t steal it
    res.cookie('deviceId', deviceId, { httpOnly: true, maxAge: 365*24*60*60*1000 });
  }
  req.deviceId = deviceId;
  next();
};
