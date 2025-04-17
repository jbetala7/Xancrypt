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

// API route
app.use('/api/encrypt', encryptRoute);
app.use('/', encryptRoute); // For /download/:filename

// ✅ Serve frontend static build (React)
const clientBuildPath = path.join(__dirname, '..', 'build'); // Adjust if needed
app.use(express.static(clientBuildPath));

// ✅ React fallback (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
