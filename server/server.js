const express = require('express');
const cors = require('cors');
const path = require('path');
const encryptRoute = require('./routes/encrypt');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API + download routes
app.use('/api/encrypt', encryptRoute);
app.use('/download', encryptRoute);

// Serve frontend from /build
const buildPath = path.resolve(__dirname, 'build');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
