const jwt = require('jsonwebtoken');
const {
  getDb,
  getDbAsync
} = require('../db/database');
const JWT_SECRET = process.env.JWT_SECRET || 'fabric-tracker-secret-key-change-in-production';
const JWT_EXPIRY = '72h';

// ── Rate Limiter (in-memory, per username) ────────────────
const loginAttempts = new Map(); // username -> { count, windowStart }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(username) {
  const now = Date.now();
  const key = username.toLowerCase();
  const record = loginAttempts.get(key);
  if (!record || now - record.windowStart > WINDOW_MS) {
    // New window
    loginAttempts.set(key, {
      count: 1,
      windowStart: now
    });
    return {
      allowed: true
    };
  }
  if (record.count >= MAX_ATTEMPTS) {
    const remainingMs = WINDOW_MS - (now - record.windowStart);
    const remainingMin = Math.ceil(remainingMs / 60000);
    return {
      allowed: false,
      retryInMinutes: remainingMin
    };
  }
  record.count++;
  return {
    allowed: true
  };
}
function resetRateLimit(username) {
  loginAttempts.delete(username.toLowerCase());
}

// ── JWT Helpers ───────────────────────────────────────────
function signToken(user) {
  return jwt.sign({
    id: user.id,
    name: user.name,
    role: user.role
  }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY
  });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Express Middleware ────────────────────────────────────

/**
 * Requires a valid JWT. Sets req.user = { id, name, role }.
 * Also checks that the user is still active in the DB.
 */
async function requireAuth(req, res, next) {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  try {
    const payload = verifyToken(token);

    // Check user is still active
    const db = await getDbAsync();
    const user = await db.get('SELECT id, name, role, is_active FROM users WHERE id = ?', [payload.id]);
    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Account deactivated or not found'
      });
    }
    req.user = {
      id: user.id,
      name: user.name,
      role: user.role
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired. Please log in again.'
      });
    }
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
}

/**
 * Requires admin role. Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  next();
}
module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  checkRateLimit,
  resetRateLimit
};