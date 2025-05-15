// server.js
require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const compression   = require('compression');
const cookieParser  = require('cookie-parser');
const mongoose      = require('mongoose');
const path          = require('path');
const passport      = require('./config/passport');
const { sendVerificationEmail } = require('./utils/mailer');
const { register, httpRequests } = require('./metrics');
const stripe        = require('stripe')(process.env.STRIPE_SECRET_KEY);

const authRoute     = require('./routes/auth');
const checkoutRoute = require('./routes/checkout');
const encryptRoute  = require('./routes/encrypt');
const adminRoute    = require('./routes/admin');
const webhookRoute  = require('./routes/webhook');

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Global Middleware ─────────────────────────────────────────────────────────
app.use((req, res, next) => { httpRequests.inc(); next(); });
// allow sending/receiving cookies from frontend
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(passport.initialize());

// ─── Test‐mail (for manual JWT log) ────────────────────────────────────────────
app.get('/test-mail', async (req, res) => {
  console.log('▶️  /test-mail triggered');
  try {
    // NOTE: this continues to use dummy‐token; only for testing SMTP connectivity
    await sendVerificationEmail({ email: 'you@domain.com' }, 'dummy-token');
    return res.send('✅ Test email sent (console.log for URL)');
  } catch (err) {
    console.error('❌ Test mail error:', err);
    return res.status(500).send('Test mail failed: ' + err.message);
  }
});

// ─── Stripe webhook ────────────────────────────────────────────────────────────
app.post(
  '/webhook',
  require('body-parser').raw({ type: 'application/json' }),
  webhookRoute
);

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoute);
app.use('/api/checkout', require('./middleware/authenticate'), checkoutRoute);
app.use('/api/encrypt', encryptRoute);
app.use('/api/admin', adminRoute);
app.use('/api/users', require('./routes/users'));
app.use('/api/subscription', require('./routes/subscription'));



// ─── Prometheus ────────────────────────────────────────────────────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// ─── Serve React build + SPA fallback ─────────────────────────────────────────
const buildDir = path.join(__dirname, 'build');
app.use(express.static(buildDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
