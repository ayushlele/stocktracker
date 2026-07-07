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

// GET /api/masters
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const activeOnly = req.query.active_only === 'true';
  const rows = await db.all(`
    SELECT sm.*, ft.name as fabric_type_name,
      et.name as embroidery_type_name, pt.name as printing_type_name,
      ro.name as default_reason_name, v.name as vendor_name
    FROM stock_masters sm
    LEFT JOIN fabric_types ft ON sm.fabric_type_id = ft.id
    LEFT JOIN embroidery_types et ON sm.embroidery_type_id = et.id
    LEFT JOIN printing_types pt ON sm.printing_type_id = pt.id
    LEFT JOIN reason_options ro ON sm.default_reason_id = ro.id
    LEFT JOIN vendors v ON sm.vendor_id = v.id
    ${activeOnly ? 'WHERE sm.is_active = 1' : ''}
    ORDER BY sm.name
  `);
  res.json(rows);
});

// GET /api/masters/:id
router.get('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const row = await db.get(`
    SELECT sm.*, ft.name as fabric_type_name,
      et.name as embroidery_type_name, pt.name as printing_type_name,
      ro.name as default_reason_name, v.name as vendor_name
    FROM stock_masters sm
    LEFT JOIN fabric_types ft ON sm.fabric_type_id = ft.id
    LEFT JOIN embroidery_types et ON sm.embroidery_type_id = et.id
    LEFT JOIN printing_types pt ON sm.printing_type_id = pt.id
    LEFT JOIN reason_options ro ON sm.default_reason_id = ro.id
    LEFT JOIN vendors v ON sm.vendor_id = v.id
    WHERE sm.id = ?
  `, [parseInt(req.params.id)]);
  if (!row) return res.status(404).json({
    error: 'Not found'
  });
  res.json(row);
});

// POST /api/masters (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const b = req.body;
  if (!b.name?.trim()) return res.status(400).json({
    error: 'Name is required'
  });
  if (!b.fabric_type_id) return res.status(400).json({
    error: 'fabric_type_id is required'
  });
  const dup = await db.get('SELECT id FROM stock_masters WHERE name ILIKE ?', [b.name.trim()]);
  if (dup) return res.status(400).json({
    error: 'A master with that name already exists'
  });
  const r = await db.run(`
    INSERT INTO stock_masters (name, fabric_type_id, has_embroidery, embroidery_type_id, embroidery_description,
      has_printing, printing_type_id, printing_description, other_design_notes, default_reason_id, vendor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [b.name.trim(), b.fabric_type_id, b.has_embroidery ? 1 : 0, b.embroidery_type_id || null, b.embroidery_description || null, b.has_printing ? 1 : 0, b.printing_type_id || null, b.printing_description || null, b.other_design_notes || null, b.default_reason_id || null, b.vendor_id || null]);
  const row = await db.get('SELECT * FROM stock_masters WHERE id = ?', [r.lastInsertRowid]);
  res.status(201).json(row);
});

// PUT /api/masters/:id (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM stock_masters WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({
    error: 'Not found'
  });
  const b = req.body;
  const fields = ['name', 'fabric_type_id', 'has_embroidery', 'embroidery_type_id', 'embroidery_description', 'has_printing', 'printing_type_id', 'printing_description', 'other_design_notes', 'default_reason_id', 'vendor_id', 'is_active'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) {
      let val = b[f];
      if (f === 'has_embroidery' || f === 'has_printing') val = val ? 1 : 0;
      if (f === 'is_active') val = val ? 1 : 0;
      updates.push(`${f} = ?`);
      params.push(val === '' ? null : val);
    }
  }
  if (!updates.length) return res.status(400).json({
    error: 'No fields to update'
  });
  params.push(id);
  await db.run(`UPDATE stock_masters SET ${updates.join(', ')} WHERE id = ?`, params);
  res.json(await db.get('SELECT * FROM stock_masters WHERE id = ?', [id]));
});

// DELETE /api/masters/:id (soft delete)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  await db.run('UPDATE stock_masters SET is_active = 0 WHERE id = ?', [id]);
  res.json({
    success: true
  });
});
module.exports = router;