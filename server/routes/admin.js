// server/routes/admin.js

const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const User = require('../models/User');
const DeviceUsage = require('../models/DeviceUsage');
const History = require('../models/History');
const {
  register,
  encryptionDuration,
  encryptionErrors,
  lastConversionDuration
} = require('../metrics');

const router = express.Router();

// ─── PROMETHEUS METRICS RESET ─────────────────────────────────────────────────
router.post(
  '/reset-metrics',
  authenticate,
  isAdmin,
  (req, res) => {
    encryptionDuration.reset();
    encryptionErrors.reset();
    lastConversionDuration.reset();
    // register.clear();
    // client.collectDefaultMetrics({ register });
    res.status(200).send('✅ Metrics have been reset');
  }
);

// ─── DELETE A USER ─────────────────────────────────────────────────────────────
router.delete(
  '/users/:id',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      await user.deleteOne();
      // also clear usage
      await DeviceUsage.deleteMany({ userId: id });
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Admin delete user error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET USAGE SUMMARY ─────────────────────────────────────────────────────────
router.get(
  '/usage',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const cutoff = Date.now() - 7 * 60 * 60 * 1000;
      const usages = await DeviceUsage.find().populate('userId', 'email');
      const summary = usages.map(u => {
        const recent = u.records.filter(r => r.time.getTime() > cutoff);
        const total = recent.reduce((sum, r) => sum + r.files, 0);
        return {
          deviceId: u.deviceId,
          ip: u.ip,
          userId: u.userId?._id || null,
          email: u.userId?.email || null,
          filesLast7h: total,
          records: recent
        };
      });
      res.json(summary);
    } catch (err) {
      console.error('Admin usage error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── DELETE ALL USAGE ──────────────────────────────────────────────────────────
router.delete(
  '/usage',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const result = await DeviceUsage.deleteMany({});
      res.json({
        success: true,
        deletedCount: result.deletedCount
      });
    } catch (err) {
      console.error('Admin delete-usage error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── NEW: SITE-WIDE SUMMARY ─────────────────────────────────────────────────────
router.get(
  '/summary',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const freeUsers = await User.countDocuments({ 'subscription.plan': 'free' });
      const paidUsers = await User.countDocuments({ 'subscription.plan': { $ne: 'free' } });
      const pendingVerif = await User.countDocuments({ active: false });

      // Sum all paid invoices (up to last 100 for example)
      const invoices = await stripe.invoices.list({ limit: 100 });
      const totalRevenue = invoices.data
        .filter(inv => inv.paid)
        .reduce((sum, inv) => sum + (inv.amount_paid / 100), 0);

      res.json({
        totalUsers,
        freeUsers,
        paidUsers,
        pendingVerifications: pendingVerif,
        totalRevenue
      });
    } catch (err) {
      console.error('Admin summary error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── NEW: LIST USERS (with optional plan filter) ───────────────────────────────
router.get(
  '/users',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const { plan, page = 1, perPage = 50 } = req.query;
      const query = {};
      if (plan === 'free') query['subscription.plan'] = 'free';
      if (plan === 'paid') query['subscription.plan'] = { $ne: 'free' };

      const users = await User.find(query)
        .skip((page - 1) * perPage)
        .limit(Number(perPage))
        .lean();

      // Attach total files encrypted
      const withUsage = await Promise.all(users.map(async u => {
        const usage = await DeviceUsage.findOne({ userId: u._id });
        return {
          ...u,
          filesEncrypted: usage?.records?.reduce((s, r) => s + r.files, 0) || 0
        };
      }));

      res.json(withUsage);
    } catch (err) {
      console.error('Admin list users error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── NEW: UPDATE USER FIELDS ────────────────────────────────────────────────────
8

// ─── NEW: RESET A USER’S USAGE ─────────────────────────────────────────────────
router.post(
  '/users/:id/reset-usage',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const result = await DeviceUsage.updateMany(
        { userId: req.params.id },
        { $set: { records: [] } }
      );
      res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
      console.error('Admin reset-usage error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── NEW: REVENUE TRENDS (MRR by Month) ─────────────────────────────────────────
router.get(
  '/revenue/trends',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const now = new Date();
      const subs = await stripe.subscriptions.list({ limit: 100 });
      const byMonth = {};
      subs.data.forEach(s => {
        const d = new Date(s.current_period_end * 1000);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        byMonth[key] = (byMonth[key] || 0) + (s.plan.amount / 100);
      });

      const result = [];
      for (let i = 11; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${m.getFullYear()}-${m.getMonth() + 1}`;
        result.push({ month: key, revenue: byMonth[key] || 0 });
      }
      res.json(result);
    } catch (err) {
      console.error('Admin revenue trends error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── NEW: RECENT PAYMENTS ───────────────────────────────────────────────────────
router.get(
  '/revenue/recent',
  authenticate,
  isAdmin,
  async (req, res) => {
    try {
      const invoices = await stripe.invoices.list({ limit: 10 });
      const recent = invoices.data
        .filter(inv => inv.paid)
        .map(inv => ({
          id: inv.id,
          date: new Date(inv.created * 1000),
          amount: inv.amount_paid / 100,
          customer_email: inv.customer_email || inv.metadata.email
        }));
      res.json(recent);
    } catch (err) {
      console.error('Admin recent payments error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
