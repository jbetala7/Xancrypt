// File: routes/admin.js

const express      = require('express');
const client       = require('prom-client');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const isAdmin      = require('../middleware/isAdmin');
const User         = require('../models/User');
const {
  register,
  encryptionDuration,
  encryptionErrors,
  lastConversionDuration
} = require('../metrics');

/**
 * POST /admin/reset-metrics
 * Reset encryption-related Prometheus metrics.
 */
router.post(
  '/reset-metrics',
  authenticate,
  isAdmin,
  (req, res) => {
    // Reset individual metrics
    encryptionDuration.reset();
    encryptionErrors.reset();
    lastConversionDuration.reset();

    // Or to clear all metrics including defaults:
    // register.clear();
    // client.collectDefaultMetrics({ register });

    res.status(200).send('✅ Metrics have been reset');
  }
);

/**
 * DELETE /admin/users/:id
 * Remove a user from the database.
 */
router.delete(
  '/users/:id',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      await user.deleteOne();
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Admin delete user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
