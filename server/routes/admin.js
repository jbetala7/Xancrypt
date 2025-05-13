
const express = require('express');
const client  = require('prom-client');
const { register, encryptionDuration, encryptionErrors, lastConversionDuration } = require('../metrics');
const router  = express.Router();

// POST /admin/reset-metrics
router.post('/reset-metrics', (req, res) => {
  // reset individual metrics
  encryptionDuration.reset();
  encryptionErrors.reset();
  lastConversionDuration.reset();

  // OR if you’d rather clear everything:
  // register.clear();
  // client.collectDefaultMetrics({ register });

  res
    .status(200)
    .send('✅ Metrics have been reset');
});

module.exports = router;
