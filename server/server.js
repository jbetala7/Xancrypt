const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const encryptRoute = require('./routes/encrypt');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable gzip compression for all responses
app.use(compression());

// Mount API and download routes
app.use('/api/encrypt', encryptRoute);
app.use('/', encryptRoute);

// Serve React production build
const buildPath = path.resolve(__dirname, 'build');
app.use(express.static(buildPath));

// SPA fallback
app.get('*', (req, res, next) => {
  const indexFile = path.join(buildPath, 'index.html');
  fs.existsSync(indexFile)
    ? res.sendFile(indexFile)
    : next();
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
