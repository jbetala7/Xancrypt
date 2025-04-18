const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const encryptRoute = require('./routes/encrypt');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/encrypt', encryptRoute);

// Serve frontend
const clientBuildPath = path.join(__dirname, '..', 'build');
app.use(express.static(clientBuildPath));

// Safe SPA fallback
app.get('*', (req, res, next) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  fs.existsSync(indexPath)
    ? res.sendFile(indexPath)
    : next();
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});