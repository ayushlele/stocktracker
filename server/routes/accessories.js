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

// ── Base query with all JOINs ─────────────────────────────────
const BASE_SELECT = `
  SELECT
    ast.*,
    at2.name as accessory_type_name,
    at2.default_unit,
    co.name as condition_name,
    ro.name as reason_name, ro.is_other as reason_is_other,
    sl.name as storage_location_name,
    v.name as vendor_name,
    o.order_number, o.style_name,
    u.name as created_by_name,
    (SELECT file_path FROM photos WHERE accessory_stock_id = ast.id ORDER BY uploaded_at ASC LIMIT 1) as thumbnail
  FROM accessory_stock ast
  LEFT JOIN accessory_types at2 ON ast.accessory_type_id = at2.id
  LEFT JOIN condition_options co ON ast.condition_id = co.id
  LEFT JOIN reason_options ro ON ast.reason_id = ro.id
  LEFT JOIN storage_locations sl ON ast.storage_location_id = sl.id
  LEFT JOIN vendors v ON ast.vendor_id = v.id
  LEFT JOIN orders o ON ast.order_id = o.id
  LEFT JOIN users u ON ast.created_by = u.id
`;
async function generateAccLotCode(db) {
  // Use a separate sequence prefix — piggyback on same table with offset trick
  // Actually keep a separate counter in a different row
  const seq = await db.get('SELECT next_val FROM lot_code_seq WHERE id = 1');
  const code = `ACC-${String(seq.next_val).padStart(6, '0')}`;
  await db.run('UPDATE lot_code_seq SET next_val = next_val + 1 WHERE id = 1', []);
  return code;
}
function buildFilterQuery(q) {
  const conditions = [];
  const params = [];
  if (q.search) {
    const s = `%${q.search}%`;
    conditions.push('(at2.name LIKE ? OR ast.color_name LIKE ? OR ast.lot_code LIKE ? OR ast.size_spec LIKE ? OR ast.material LIKE ?)');
    for (let i = 0; i < 5; i++) params.push(s);
  }
  if (q.status) {
    conditions.push('ast.status = ?');
    params.push(q.status);
  } else if (!q.all_statuses) {
    conditions.push("ast.status = 'Available'");
  }
  if (q.accessory_type_id) {
    conditions.push('ast.accessory_type_id = ?');
    params.push(parseInt(q.accessory_type_id));
  }
  if (q.vendor_id) {
    conditions.push('ast.vendor_id = ?');
    params.push(parseInt(q.vendor_id));
  }
  if (q.storage_location_id) {
    conditions.push('ast.storage_location_id = ?');
    params.push(parseInt(q.storage_location_id));
  }
  return {
    conditions,
    params
  };
}

// GET /api/accessories
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const {
    conditions,
    params
  } = buildFilterQuery(req.query);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const sort = req.query.sort === 'oldest' ? 'ast.created_at ASC' : 'ast.created_at DESC';
  const {
    total
  } = await db.get(`SELECT COUNT(*) as total FROM accessory_stock ast LEFT JOIN accessory_types at2 ON ast.accessory_type_id = at2.id ${where}`, params);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const rows = await db.all(`${BASE_SELECT} ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({
    data: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit
  });
});

// GET /api/accessories/dashboard-summary
router.get('/dashboard-summary', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const rows = await db.all(`
    SELECT 
      at2.id as type_id, 
      at2.name as type_name, 
      at2.default_unit,
      COUNT(ast.id) as variants_count,
      SUM(IFNULL(ast.remaining_quantity, 0)) as total_quantity
    FROM accessory_types at2
    LEFT JOIN accessory_stock ast ON at2.id = ast.accessory_type_id AND ast.status != 'Disposed'
    WHERE at2.is_active = 1
    GROUP BY at2.id
    ORDER BY at2.name
  `);
  res.json(rows);
});

// GET /api/accessories/export/csv
router.get('/export/csv', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const {
    conditions,
    params
  } = buildFilterQuery(req.query);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = await db.all(`${BASE_SELECT} ${where} ORDER BY ast.created_at DESC`, params);
  const headers = ['Lot Code', 'Type', 'Color', 'Pantone', 'Size/Spec', 'Material', 'Vendor', 'Original Qty', 'Remaining Qty', 'Unit', 'Status', 'Condition', 'Reason', 'Location', 'Order', 'Created By', 'Date'];
  const csvRows = rows.map(r => [r.lot_code, r.accessory_type_name, r.color_name, r.pantone_name || '', r.size_spec || '', r.material || '', r.vendor_name || '', r.original_quantity, r.remaining_quantity, r.unit_type, r.status, r.condition_name, r.reason_name, r.storage_location_name || r.storage_location_other_text || '', r.order_number || '', r.created_by_name, r.created_at]);
  const esc = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...csvRows.map(r => r.map(esc).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="accessory_stock_export.csv"');
  res.send(csv);
});

// GET /api/accessories/:id
router.get('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const entry = await db.get(`${BASE_SELECT} WHERE ast.id = ?`, [id]);
  if (!entry) return res.status(404).json({
    error: 'Not found'
  });
  const photos = await db.all('SELECT * FROM photos WHERE accessory_stock_id = ? ORDER BY uploaded_at ASC', [id]);
  const usage = await db.all(`SELECT ul.*, u.name as logged_by_name FROM accessory_usage_log ul LEFT JOIN users u ON ul.logged_by = u.id WHERE ul.accessory_stock_id = ? ORDER BY ul.date_used DESC`, [id]);
  const adjustments = await db.all(`SELECT sa.*, u.name as adjusted_by_name FROM stock_adjustments sa LEFT JOIN users u ON sa.adjusted_by = u.id WHERE sa.accessory_stock_id = ? ORDER BY sa.created_at DESC`, [id]);
  res.json({
    ...entry,
    photos,
    usage_history: usage,
    adjustment_history: adjustments
  });
});

// POST /api/accessories
router.post('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const b = req.body;
  if (!b.accessory_type_id) return res.status(400).json({
    error: 'accessory_type_id required'
  });
  if (!b.color_name?.trim()) return res.status(400).json({
    error: 'color_name required'
  });
  if (!b.original_quantity || b.original_quantity <= 0) return res.status(400).json({
    error: 'original_quantity must be > 0'
  });
  if (!b.condition_id) return res.status(400).json({
    error: 'condition_id required'
  });
  if (!b.reason_id) return res.status(400).json({
    error: 'reason_id required'
  });
  try {
    const id = await db.transaction(async () => {
      const lotCode = await generateAccLotCode(db);
      const r = await db.run(`
        INSERT INTO accessory_stock (
          lot_code, accessory_type_id, color_name, pantone_code, pantone_name, color_display,
          size_spec, material, brand_notes, vendor_id, order_id,
          unit_type, original_quantity, remaining_quantity,
          condition_id, condition_notes, reason_id, reason_other_text,
          storage_location_id, storage_location_other_text, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?)`, [lotCode, b.accessory_type_id, b.color_name.trim(), b.pantone_code || null, b.pantone_name || null, b.color_display || null, b.size_spec || null, b.material || null, b.brand_notes || null, b.vendor_id || null, b.order_id || null, b.unit_type || 'pieces', b.original_quantity, b.original_quantity, b.condition_id, b.condition_notes || null, b.reason_id, b.reason_other_text || null, b.storage_location_id || null, b.storage_location_other_text || null, req.user.id]);
      return r.lastInsertRowid;
    });
    res.status(201).json(await db.get(`${BASE_SELECT} WHERE ast.id = ?`, [id]));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to create: ' + err.message
    });
  }
});

// POST /api/accessories/:id/usage
router.post('/:id/usage', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const {
    quantity_used,
    used_for,
    notes,
    date_used
  } = req.body;
  if (!quantity_used || quantity_used <= 0) return res.status(400).json({
    error: 'quantity_used must be > 0'
  });
  try {
    const result = await db.transaction(async () => {
      const entry = await db.get('SELECT * FROM accessory_stock WHERE id = ?', [id]);
      if (!entry) throw {
        status: 404,
        message: 'Not found'
      };
      if (entry.status === 'Disposed') throw {
        status: 400,
        message: 'Cannot log usage on disposed stock'
      };
      if (quantity_used > entry.remaining_quantity) throw {
        status: 400,
        message: `Only ${entry.remaining_quantity} ${entry.unit_type} remaining`
      };
      await db.run(`INSERT INTO accessory_usage_log (accessory_stock_id, quantity_used, date_used, used_for, logged_by, notes) VALUES (?, ?, ?, ?, ?, ?)`, [id, quantity_used, date_used || new Date().toISOString().split('T')[0], used_for || null, req.user.id, notes || null]);
      const newRemaining = entry.remaining_quantity - quantity_used;
      const newStatus = newRemaining === 0 ? 'Used' : entry.status;
      await db.run(`UPDATE accessory_stock SET remaining_quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?`, [newRemaining, newStatus, id]);
      return {
        new_remaining: newRemaining,
        new_status: newStatus
      };
    });
    res.status(201).json({
      message: 'Usage logged',
      ...result
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({
      error: err.message
    });
    res.status(500).json({
      error: err.message
    });
  }
});

// POST /api/accessories/:id/adjustments (admin only)
router.post('/:id/adjustments', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const {
    quantity_delta,
    reason
  } = req.body;
  if (!quantity_delta || quantity_delta === 0) return res.status(400).json({
    error: 'quantity_delta cannot be 0'
  });
  if (!reason?.trim()) return res.status(400).json({
    error: 'reason is required'
  });
  try {
    const result = await db.transaction(async () => {
      const entry = await db.get('SELECT * FROM accessory_stock WHERE id = ?', [id]);
      if (!entry) throw {
        status: 404,
        message: 'Not found'
      };
      const newQty = entry.remaining_quantity + quantity_delta;
      if (newQty < 0) throw {
        status: 400,
        message: 'Adjustment would result in negative stock'
      };
      await db.run('INSERT INTO stock_adjustments (accessory_stock_id, quantity_delta, reason, adjusted_by) VALUES (?, ?, ?, ?)', [id, quantity_delta, reason.trim(), req.user.id]);
      const newStatus = newQty === 0 ? 'Used' : newQty > 0 && entry.status === 'Used' ? 'Available' : entry.status;
      await db.run(`UPDATE accessory_stock SET remaining_quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?`, [newQty, newStatus, id]);
      return {
        new_remaining: newQty,
        new_status: newStatus
      };
    });
    res.status(201).json({
      message: 'Stock adjusted',
      ...result
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({
      error: err.message
    });
    res.status(500).json({
      error: err.message
    });
  }
});

// PUT /api/accessories/:id — update mutable fields
router.put('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM accessory_stock WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({
    error: 'Not found'
  });
  const b = req.body;
  const fields = ['accessory_type_id', 'color_name', 'pantone_code', 'pantone_name', 'color_display', 'size_spec', 'material', 'brand_notes', 'vendor_id', 'order_id', 'condition_id', 'condition_notes', 'reason_id', 'reason_other_text', 'storage_location_id', 'storage_location_other_text', 'status'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(b[f] === '' ? null : b[f]);
    }
  }
  if (!updates.length) return res.status(400).json({
    error: 'No fields to update'
  });
  updates.push("updated_at = datetime('now')");
  params.push(id);
  await db.run(`UPDATE accessory_stock SET ${updates.join(', ')} WHERE id = ?`, params);
  saveDb();
  res.json(await db.get(`${BASE_SELECT} WHERE ast.id = ?`, [id]));
});

// DELETE /api/accessories/:id (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM accessory_stock WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({
    error: 'Not found'
  });
  (await db.transaction(async () => {
    // Delete files
    const fs = require('fs');
    const path = require('path');
    const {
      UPLOADS_DIR
    } = require('../middleware/upload');
    const photos = await db.all(`SELECT file_path FROM photos WHERE accessory_stock_id = ?`, [id]);
    photos.forEach(p => {
      const filePath = path.join(UPLOADS_DIR, path.basename(p.file_path));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn(e);
        }
      }
    });
    await db.exec(`DELETE FROM photos WHERE accessory_stock_id = ${id}`);
    await db.exec(`DELETE FROM accessory_usage_log WHERE accessory_stock_id = ${id}`);
    await db.exec(`DELETE FROM stock_adjustments WHERE accessory_stock_id = ${id}`);
    await db.exec(`DELETE FROM accessory_stock WHERE id = ${id}`);
  }))();
  saveDb();
  res.json({
    message: 'Deleted successfully'
  });
});
module.exports = router;