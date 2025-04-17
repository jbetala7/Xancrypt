const express = require('express');
const cors = require('cors');
const encryptRoute = require('./routes/encrypt');

const app = express();
app.use(cors());
app.use('/api/encrypt', encryptRoute);

// ✅ New line: use same router to handle download as well
app.use('/', encryptRoute); 

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
