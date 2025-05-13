// server.js

const express       = require('express');
const cors          = require('cors');
const compression   = require('compression');
const path          = require('path');
const fs            = require('fs');
const encryptRoute  = require('./routes/encrypt');
const adminRoute   = require('./routes/admin');

const {
  register,
  httpRequests
} = require('./metrics'); 

const app  = express();
const PORT = process.env.PORT || 4000;

// Count every incoming request
app.use((req, res, next) => {
  httpRequests.inc();
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Prometheus scrape endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Expose admin endpoints
app.use('/admin', adminRoute);

// Mount only under /api/encrypt
app.use('/api/encrypt', encryptRoute);

// Serve React build
const buildPath = path.resolve(__dirname, 'build');
app.use(express.static(buildPath));

// SPA fallback (only after static and API routes)
app.get('*', (req, res, next) => {
  const indexFile = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
