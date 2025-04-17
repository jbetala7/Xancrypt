const express = require('express');
const cors = require('cors');
const path = require('path');
const encryptRoute = require('./routes/encrypt');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Use encrypt route only once
app.use('/api/encrypt', encryptRoute);

// ✅ Serve frontend static React build
const clientBuildPath = path.join(__dirname, '..', 'build');
app.use(express.static(clientBuildPath));

// ✅ Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
