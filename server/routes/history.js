// server/routes/history.js
const express      = require('express')
const router       = express.Router()
const authenticate = require('../middleware/authenticate')
const History      = require('../models/History')

/**
 * POST /api/history
 * Body: { timestamp, cssCount, jsCount, elapsedSec, filename, link }
 */
router.post('/', authenticate, async (req, res) => {
  const userId = req.user._id
  let { timestamp, cssCount, jsCount, elapsedSec, filename, link } = req.body

  // Normalize time
  const time = timestamp ? new Date(timestamp) : new Date()
  if (isNaN(time.valueOf())) {
    return res.status(400).json({ error: 'Invalid timestamp' })
  }

  const event = { time, cssCount, jsCount, elapsedSec, filename, link }

  try {
    // Fetch existing doc
    const doc = await History.findOne({ userId })

    if (doc) {
      // de-dupe by same second + same file counts
      const incomingSec = Math.floor(time.getTime() / 1000)
      const dup = doc.events.some(e => {
        const eSec = Math.floor(new Date(e.time).getTime() / 1000)
        return eSec === incomingSec && e.cssCount === cssCount && e.jsCount === jsCount
      })
      if (dup) {
        return res.json({ message: 'Duplicate event ignored' })
      }
    }

    // upsert + push
    await History.updateOne(
      { userId },
      { $push: { events: event } },
      { upsert: true }
    )

    return res.json({ message: 'Event recorded' })
  } catch (err) {
    console.error('History POST error:', err)
    return res.status(500).json({ error: 'Failed to record history' })
  }
})

/**
 * GET /api/history
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const doc = await History.findOne({ userId: req.user._id })
    const events = doc
      ? doc.events
          .map(e => e.toObject())
          .sort((a, b) => new Date(b.time) - new Date(a.time))
      : []
    return res.json(events)
  } catch (err) {
    console.error('History GET error:', err)
    return res.status(500).json({ error: 'Failed to fetch history' })
  }
})

/**
 * DELETE /api/history
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    await History.deleteOne({ userId: req.user._id })
    return res.json({ message: 'History cleared' })
  } catch (err) {
    console.error('History DELETE error:', err)
    return res.status(500).json({ error: 'Failed to clear history' })
  }
})

module.exports = router
