const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const encryptRoute = require('./routes/encrypt');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1️⃣ Encrypt API
app.use('/api/encrypt', encryptRoute);

// 2️⃣ Download route — mount the same router at root so router.get('/download/:filename') is exposed
app.use('/', encryptRoute);

// 3️⃣ Serve React build
const buildPath = path.resolve(__dirname, 'build');
app.use(express.static(buildPath));

// Safe SPA fallback
app.get('*', (req, res, next) => {
  const indexPath = path.join(buildPath, 'index.html');
  fs.existsSync(indexPath) ? res.sendFile(indexPath) : next();
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});