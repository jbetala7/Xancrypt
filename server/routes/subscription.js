// server/routes/subscription.js
const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authenticate = require('../middleware/authenticate');
const User    = require('../models/User');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  res.json(req.user.subscription);
});

router.post('/checkout', authenticate, async (req, res) => {
  if (!req.user.stripeCustomerId) {
    const cust = await stripe.customers.create({ email: req.user.email });
    req.user.stripeCustomerId = cust.id;
    await req.user.save();
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: req.user.stripeCustomerId,
    line_items: [{ price: process.env.STRIPE_PRICE_INDIVIDUAL, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/dashboard`,
    cancel_url: `${process.env.CLIENT_URL}/dashboard`,
  });
  res.json({ url: session.url });
});

router.post('/cancel', authenticate, async (req, res) => {
  // you may want to call stripe.subscriptions.del(...)
  req.user.subscription.plan = 'free';
  await req.user.save();
  res.json({ message: 'Canceled' });
});

module.exports = router;
