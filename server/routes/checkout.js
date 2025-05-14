// File: routes/checkout.js
const express = require('express');
const router  = express.Router();
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User    = require('../models/User');

router.post('/create-checkout-session', async (req, res) => {
  const user = req.user;
  if (!user.stripeCustomerId) {
    const cust = await stripe.customers.create({ email: user.email });
    user.stripeCustomerId = cust.id;
    await user.save();
  }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: user.stripeCustomerId,
    line_items: [{ price: process.env.STRIPE_PRICE_INDIVIDUAL, quantity: 1 }],
    success_url: `${process.env.CLIENT_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/dashboard`
  });
  res.json({ url: session.url });
});

module.exports = router;