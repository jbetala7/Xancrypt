// File: routes/webhook.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User   = require('../models/User');
module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const user = await User.findOne({ stripeCustomerId: sub.customer });
      if (user) {
        user.subscription.plan = sub.items.data[0].price.id === process.env.STRIPE_PRICE_INDIVIDUAL ? 'individual' : 'free';
        user.subscription.status = sub.status;
        user.subscription.currentPeriodEnd = new Date(sub.current_period_end * 1000);
        await user.save();
      }
      break;
    }
    // handle other events as needed
    default:
      break;
  }
  res.json({ received: true });
};