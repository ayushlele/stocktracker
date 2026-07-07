const express = require('express');
const bcrypt = require('bcryptjs');
const {
  getDb,
  getDbAsync
} = require('../db/database');
const {
  signToken,
  checkRateLimit,
  resetRateLimit,
  requireAuth
} = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const {
    name,
    pin
  } = req.body;
  if (!name || !pin) {
    return res.status(400).json({
      error: 'Name and PIN are required'
    });
  }

  // Rate limiting
  const rateCheck = checkRateLimit(name);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${rateCheck.retryInMinutes} minute(s).`
    });
  }
  const db = await getDbAsync();
  const user = await db.get('SELECT * FROM users WHERE name ILIKE ?', [name.trim()]);
  if (!user) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }
  if (!user.is_active) {
    return res.status(401).json({
      error: 'Account deactivated. Contact an administrator.'
    });
  }
  const pinMatch = bcrypt.compareSync(pin, user.pin_hash);
  if (!pinMatch) {
    return res.status(401).json({
      error: 'Invalid credentials'
    });
  }

  // Success — reset rate limit and issue token
  resetRateLimit(name);
  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    }
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user
  });
});
module.exports = router;