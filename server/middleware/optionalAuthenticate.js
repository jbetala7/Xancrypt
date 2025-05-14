// server/middleware/optionalAuthenticate.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * If an Authorization: Bearer <token> header is present,
 * validate it and set req.user. Otherwise continue anonymously.
 */
module.exports = async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (user) req.user = user;
    } catch (err) {
      // invalid token – just ignore and treat as anonymous
    }
  }
  next();
};
