// metrics.js

const client   = require('prom-client');
const register = new client.Registry();

// 1) Collect default Node.js metrics (CPU, memory, GC, etc.)
client.collectDefaultMetrics({ register });

// 2) Define your custom metrics—each MUST have a `help` field

// Histogram for encryption duration (seconds)
const encryptionDuration = new client.Histogram({
  name: 'encryption_duration_seconds',
  help: 'Duration of each encryption operation in seconds',
  buckets: [0.5, 1, 3, 5, 10],
});

// Counter for encryption errors
const encryptionErrors = new client.Counter({
  name: 'encryption_errors_total',
  help: 'Total number of encryption errors',
});

// Counter for total HTTP requests
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
});

// Gauges for per‐conversion metadata

// When the last conversion started (Unix timestamp in seconds)
const lastConversionTimestamp = new client.Gauge({
  name: 'xancrypt_last_conversion_timestamp_seconds',
  help: 'Unix timestamp (seconds) when the last conversion started',
});

// How many CSS files were included in the last conversion
const lastConversionCssCount = new client.Gauge({
  name: 'xancrypt_last_conversion_css_files',
  help: 'Number of CSS files in the most recent conversion',
});

// How many JS files were included in the last conversion
const lastConversionJsCount = new client.Gauge({
  name: 'xancrypt_last_conversion_js_files',
  help: 'Number of JS files in the most recent conversion',
});

// How long the last conversion took (seconds)
const lastConversionDuration = new client.Gauge({
  name: 'xancrypt_last_conversion_duration_seconds',
  help: 'Elapsed time in seconds for the most recent conversion',
});

// 3) Register all metrics
[
  encryptionDuration,
  encryptionErrors,
  httpRequests,
  lastConversionTimestamp,
  lastConversionCssCount,
  lastConversionJsCount,
  lastConversionDuration,
].forEach(m => register.registerMetric(m));

// 4) Export the registry and metrics
module.exports = {
  register,
  encryptionDuration,
  encryptionErrors,
  httpRequests,
  lastConversionTimestamp,
  lastConversionCssCount,
  lastConversionJsCount,
  lastConversionDuration,
};
