// server/middleware/optionalAuthenticate.js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token      = authHeader.split(' ')[1];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.id);
    } catch (err) {
      // invalid token → simply treat as not logged in
      req.user = null;
    }
  }
  next();
};
