const express = require('express');
const {
  getDb,
  getDbAsync
} = require('../db/database');
const {
  requireAuth,
  requireAdmin
} = require('../middleware/auth');
const router = express.Router();

// GET /api/accessory-masters
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const activeOnly = req.query.active_only === 'true';
  const rows = await db.all(`
    SELECT am.*, at.name as accessory_type_name,
      ro.name as default_reason_name, v.name as vendor_name
    FROM accessory_masters am
    LEFT JOIN accessory_types at ON am.accessory_type_id = at.id
    LEFT JOIN reason_options ro ON am.default_reason_id = ro.id
    LEFT JOIN vendors v ON am.vendor_id = v.id
    ${activeOnly ? 'WHERE am.is_active = 1' : ''}
    ORDER BY am.name
  `);
  res.json(rows);
});

// GET /api/accessory-masters/:id
router.get('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const row = await db.get(`
    SELECT am.*, at.name as accessory_type_name,
      ro.name as default_reason_name, v.name as vendor_name
    FROM accessory_masters am
    LEFT JOIN accessory_types at ON am.accessory_type_id = at.id
    LEFT JOIN reason_options ro ON am.default_reason_id = ro.id
    LEFT JOIN vendors v ON am.vendor_id = v.id
    WHERE am.id = ?
  `, [parseInt(req.params.id)]);
  if (!row) return res.status(404).json({
    error: 'Not found'
  });
  res.json(row);
});

// POST /api/accessory-masters (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({
    error: 'Name is required'
  });
  if (!b.accessory_type_id) return res.status(400).json({
    error: 'accessory_type_id is required'
  });
  const dup = await db.get('SELECT id FROM accessory_masters WHERE name ILIKE ?', [b.name.trim()]);
  if (dup) return res.status(400).json({
    error: 'An accessory master with that name already exists'
  });
  const r = await db.run(`
    INSERT INTO accessory_masters (name, accessory_type_id, default_material, default_size_spec, brand_notes,
      default_unit_type, default_reason_id, vendor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [b.name.trim(), b.accessory_type_id, b.default_material || null, b.default_size_spec || null, b.brand_notes || null, b.default_unit_type || 'pieces', b.default_reason_id || null, b.vendor_id || null]);
  const row = await db.get('SELECT * FROM accessory_masters WHERE id = ?', [r.lastInsertRowid]);
  res.status(201).json(row);
});

// PUT /api/accessory-masters/:id (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM accessory_masters WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({
    error: 'Not found'
  });
  const b = req.body;
  const fields = ['name', 'accessory_type_id', 'default_material', 'default_size_spec', 'brand_notes', 'default_unit_type', 'default_reason_id', 'vendor_id', 'is_active'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) {
      let val = b[f];
      if (f === 'is_active') val = val ? 1 : 0;
      updates.push(`${f} = ?`);
      params.push(val === '' ? null : val);
    }
  }
  if (!updates.length) return res.status(400).json({
    error: 'No fields to update'
  });
  params.push(id);
  await db.run(`UPDATE accessory_masters SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json(await db.get('SELECT * FROM accessory_masters WHERE id = ?', [id]));
});

// DELETE /api/accessory-masters/:id (soft delete)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  await db.run('UPDATE accessory_masters SET is_active = 0 WHERE id = ?', [id]);
  res.json({
    success: true
  });
});
module.exports = router;