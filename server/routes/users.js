const express = require('express');
const bcrypt = require('bcryptjs');
const {
  getDb,
  getDbAsync
} = require('../db/database');
const {
  requireAuth,
  requireAdmin
} = require('../middleware/auth');
const {
  validate
} = require('../middleware/validate');
const {
  createUserSchema,
  editUserSchema,
  resetPinSchema
} = require('../validation/userSchema');
const router = express.Router();

// All routes require admin
router.use(requireAuth, requireAdmin);

// GET /api/users — List all users
router.get('/', async (req, res) => {
  const db = await getDbAsync();
  const users = await db.all('SELECT id, name, role, is_active, created_at FROM users ORDER BY name');
  res.json(users);
});

// POST /api/users — Create new user
router.post('/', validate(createUserSchema), async (req, res) => {
  const {
    name,
    pin,
    role
  } = req.body;
  const db = await getDbAsync();

  // Check for duplicate name (case-insensitive, handled by COLLATE NOCASE)
  const existing = await db.get('SELECT id FROM users WHERE name ILIKE ?', [name]);
  if (existing) {
    return res.status(400).json({
      error: `User "${name}" already exists`
    });
  }
  const pin_hash = bcrypt.hashSync(pin, 10);
  const result = await db.run('INSERT INTO users (name, pin_hash, role) VALUES (?, ?, ?)', [name, pin_hash, role]);
  const user = await db.get('SELECT id, name, role, is_active, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(user);
});

// PUT /api/users/:id — Edit user (name, role, is_active)
router.put('/:id', validate(editUserSchema), async (req, res) => {
  const {
    id
  } = req.params;
  const db = await getDbAsync();
  const existing = await db.get('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
  if (!existing) {
    return res.status(404).json({
      error: 'User not found'
    });
  }
  const {
    name,
    role,
    is_active
  } = req.body;

  // Self-protection: admin cannot deactivate themselves
  if (is_active === false && parseInt(id) === req.user.id) {
    return res.status(400).json({
      error: 'You cannot deactivate your own account'
    });
  }
  const updates = [];
  const params = [];
  if (name !== undefined) {
    const dup = await db.get('SELECT id FROM users WHERE name ILIKE ? AND id != ?', [name, parseInt(id)]);
    if (dup) {
      return res.status(400).json({
        error: `User "${name}" already exists`
      });
    }
    updates.push('name = ?');
    params.push(name);
  }
  if (role !== undefined) {
    updates.push('role = ?');
    params.push(role);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (updates.length === 0) {
    return res.status(400).json({
      error: 'No fields to update'
    });
  }
  params.push(parseInt(id));
  await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const user = await db.get('SELECT id, name, role, is_active, created_at FROM users WHERE id = ?', [parseInt(id)]);
  res.json(user);
});

// PUT /api/users/:id/pin — Reset PIN
router.put('/:id/pin', validate(resetPinSchema), async (req, res) => {
  const {
    id
  } = req.params;
  const {
    pin
  } = req.body;
  const db = await getDbAsync();
  const existing = await db.get('SELECT id FROM users WHERE id = ?', [parseInt(id)]);
  if (!existing) {
    return res.status(404).json({
      error: 'User not found'
    });
  }
  const pin_hash = bcrypt.hashSync(pin, 10);
  await db.run('UPDATE users SET pin_hash = ? WHERE id = ?', [pin_hash, parseInt(id)]);
  res.json({
    message: 'PIN updated successfully'
  });
});
module.exports = router;