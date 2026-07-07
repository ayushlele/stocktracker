const express = require('express');
const {
  getDb,
  saveDb,
  getDbAsync
} = require('../db/database');
const {
  requireAuth,
  requireAdmin
} = require('../middleware/auth');
const router = express.Router();

// GET /api/vendors
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const activeOnly = req.query.active_only === 'true';
  const rows = await db.all(`SELECT * FROM vendors${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY name`);
  res.json(rows);
});

// POST /api/vendors (any auth user can add inline)
router.post('/', requireAuth, async (req, res) => {
  const {
    name,
    contact_person,
    phone,
    notes
  } = req.body;
  if (!name?.trim()) return res.status(400).json({
    error: 'Name is required'
  });
  const db = await getDbAsync();
  const existing = await db.get('SELECT * FROM vendors WHERE name ILIKE ?', [name.trim()]);
  if (existing) {
    if (!existing.is_active) {
      await db.run('UPDATE vendors SET is_active = 1 WHERE id = ?', [existing.id]);
      existing.is_active = 1;
    }
    return res.json(existing);
  }
  const r = await db.run('INSERT INTO vendors (name, contact_person, phone, notes) VALUES (?, ?, ?, ?)', [name.trim(), contact_person || null, phone || null, notes || null]);
  const row = await db.get('SELECT * FROM vendors WHERE id = ?', [r.lastInsertRowid]);
  res.status(201).json(row);
});

// PUT /api/vendors/:id (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM vendors WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({
    error: 'Not found'
  });
  const {
    name,
    contact_person,
    phone,
    notes,
    is_active
  } = req.body;
  const updates = [];
  const params = [];
  if (name?.trim()) {
    const dup = await db.get('SELECT id FROM vendors WHERE name ILIKE ? AND id != ?', [name.trim(), id]);
    if (dup) return res.status(400).json({
      error: 'Vendor name already exists'
    });
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (contact_person !== undefined) {
    updates.push('contact_person = ?');
    params.push(contact_person || null);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone || null);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes || null);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  if (!updates.length) return res.status(400).json({
    error: 'No fields to update'
  });
  params.push(id);
  await db.run(`UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json(await db.get('SELECT * FROM vendors WHERE id = ?', [id]));
});
module.exports = router;