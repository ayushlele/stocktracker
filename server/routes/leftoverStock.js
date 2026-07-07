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
async function generateLotCode(db) {
  const seq = await db.get('SELECT next_val FROM lot_code_seq WHERE id = 1');
  const code = `FAB-${String(seq.next_val).padStart(6, '0')}`;
  await db.run('UPDATE lot_code_seq SET next_val = next_val + 1 WHERE id = 1', []);
  return code;
}
const BASE_SELECT = `
  SELECT
    ls.*,
    ft.name as fabric_type_name,
    et.name as embroidery_type_name,
    pt.name as printing_type_name,
    co.name as condition_name, co.is_other as condition_is_other,
    ro.name as reason_name, ro.is_other as reason_is_other,
    sl.name as storage_location_name,
    v.name as vendor_name,
    o.order_number, o.style_name, o.buyer_name,
    u.name as created_by_name,
    sm.name as master_name,
    (SELECT file_path FROM photos WHERE leftover_stock_id = ls.id ORDER BY uploaded_at ASC LIMIT 1) as thumbnail
  FROM leftover_stock ls
  LEFT JOIN fabric_types ft ON ls.fabric_type_id = ft.id
  LEFT JOIN embroidery_types et ON ls.embroidery_type_id = et.id
  LEFT JOIN printing_types pt ON ls.printing_type_id = pt.id
  LEFT JOIN condition_options co ON ls.condition_id = co.id
  LEFT JOIN reason_options ro ON ls.reason_id = ro.id
  LEFT JOIN storage_locations sl ON ls.storage_location_id = sl.id
  LEFT JOIN vendors v ON ls.vendor_id = v.id
  LEFT JOIN orders o ON ls.order_id = o.id
  LEFT JOIN users u ON ls.created_by = u.id
  LEFT JOIN stock_masters sm ON ls.master_id = sm.id
`;
function buildFilterQuery(query) {
  const conditions = [];
  const params = [];
  if (query.search) {
    const s = `%${query.search}%`;
    conditions.push(`(ft.name LIKE ? OR ls.color_name LIKE ? OR ls.pantone_name LIKE ? OR ls.lot_code LIKE ?
      OR o.order_number LIKE ? OR ls.embroidery_description LIKE ? OR ls.printing_description LIKE ?
      OR ls.other_design_notes LIKE ? OR ls.condition_notes LIKE ? OR v.name LIKE ?)`);
    for (let i = 0; i < 10; i++) params.push(s);
  }
  if (query.status) {
    const statuses = query.status.split(',');
    conditions.push(`ls.status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  } else if (!query.all_statuses) {
    conditions.push("ls.status = 'Available'");
  }
  if (query.fabric_type_id) {
    const ids = query.fabric_type_id.split(',').map(Number);
    conditions.push(`ls.fabric_type_id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }
  if (query.vendor_id) {
    conditions.push('ls.vendor_id = ?');
    params.push(parseInt(query.vendor_id));
  }
  if (query.storage_location_id) {
    conditions.push('ls.storage_location_id = ?');
    params.push(parseInt(query.storage_location_id));
  }
  if (query.has_embroidery === 'true') conditions.push('ls.has_embroidery = 1');
  if (query.has_printing === 'true') conditions.push('ls.has_printing = 1');
  if (query.date_from) {
    conditions.push('ls.date_logged >= ?');
    params.push(query.date_from);
  }
  if (query.date_to) {
    conditions.push('ls.date_logged <= ?');
    params.push(query.date_to);
  }
  if (query.order_id) {
    conditions.push('ls.order_id = ?');
    params.push(parseInt(query.order_id));
  }
  return {
    conditions,
    params
  };
}
function buildSortClause(query) {
  const map = {
    'date_logged_desc': 'ls.date_logged DESC',
    'date_logged_asc': 'ls.date_logged ASC',
    'remaining_desc': 'ls.remaining_quantity_meters DESC',
    'remaining_asc': 'ls.remaining_quantity_meters ASC',
    'fabric_type_asc': 'ft.name ASC'
  };
  return map[query.sort] || 'ls.date_logged DESC';
}

// GET /api/stock/colors
router.get('/colors', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const rows = await db.all('SELECT DISTINCT color_name FROM leftover_stock ORDER BY color_name');
  res.json(rows.map(r => r.color_name));
});

// GET /api/stock/export/csv
router.get('/export/csv', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const {
    conditions,
    params
  } = buildFilterQuery(req.query);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = await db.all(`${BASE_SELECT} ${where} ORDER BY ${buildSortClause(req.query)}`, params);
  const headers = ['Lot Code', 'Fabric Type', 'Color', 'Pantone Code', 'Pantone Name', 'Has Embroidery', 'Embroidery Type', 'Has Printing', 'Printing Type', 'Vendor', 'Order Number', 'Condition', 'Date Logged', 'Original Qty (m)', 'Remaining Qty (m)', 'Reason', 'Location', 'Status', 'Created By'];
  const csvRows = rows.map(r => [r.lot_code, r.fabric_type_name, r.color_name, r.pantone_code || '', r.pantone_name || '', r.has_embroidery ? 'Yes' : 'No', r.embroidery_type_name || '', r.has_printing ? 'Yes' : 'No', r.printing_type_name || '', r.vendor_name || '', r.order_number || '', r.condition_name, r.date_logged, r.original_quantity_meters, r.remaining_quantity_meters, r.reason_name, r.storage_location_name || r.storage_location_other_text || '', r.status, r.created_by_name]);
  const esc = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...csvRows.map(r => r.map(esc).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leftover_stock_export.csv"');
  res.send(csv);
});

// GET /api/stock
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const {
    conditions,
    params
  } = buildFilterQuery(req.query);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const orderBy = buildSortClause(req.query);
  const countSql = `SELECT COUNT(*) as total FROM leftover_stock ls
    LEFT JOIN fabric_types ft ON ls.fabric_type_id = ft.id
    LEFT JOIN vendors v ON ls.vendor_id = v.id
    LEFT JOIN orders o ON ls.order_id = o.id
    ${where}`;
  const {
    total
  } = await db.get(countSql, params);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const rows = await db.all(`${BASE_SELECT} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({
    data: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit
  });
});

// GET /api/stock/:id
router.get('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const entry = await db.get(`${BASE_SELECT} WHERE ls.id = ?`, [id]);
  if (!entry) return res.status(404).json({
    error: 'Entry not found'
  });
  const photos = await db.all('SELECT * FROM photos WHERE leftover_stock_id = ? ORDER BY uploaded_at ASC', [id]);
  const usage = await db.all(`SELECT ul.*, u.name as logged_by_name FROM fabric_usage_log ul
    LEFT JOIN users u ON ul.logged_by = u.id WHERE ul.leftover_stock_id = ? ORDER BY ul.date_used DESC`, [id]);
  const adjustments = await db.all(`SELECT sa.*, u.name as adjusted_by_name FROM stock_adjustments sa
    LEFT JOIN users u ON sa.adjusted_by = u.id WHERE sa.leftover_stock_id = ? ORDER BY sa.created_at DESC`, [id]);
  const order = entry.order_id ? await db.get('SELECT * FROM orders WHERE id = ?', [entry.order_id]) : null;
  res.json({
    ...entry,
    photos,
    usage_history: usage,
    adjustment_history: adjustments,
    order
  });
});

// POST /api/stock
router.post('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const b = req.body;
  if (!b.fabric_type_id) return res.status(400).json({
    error: 'fabric_type_id required'
  });
  if (!b.color_name?.trim()) return res.status(400).json({
    error: 'color_name required'
  });
  if (!b.original_quantity_meters || b.original_quantity_meters <= 0) return res.status(400).json({
    error: 'original_quantity_meters must be > 0'
  });
  if (!b.condition_id) return res.status(400).json({
    error: 'condition_id required'
  });
  if (!b.reason_id) return res.status(400).json({
    error: 'reason_id required'
  });

  // Validate Other text
  const condRow = await db.get('SELECT is_other FROM condition_options WHERE id = ?', [b.condition_id]);
  if (!condRow) return res.status(400).json({
    error: 'Invalid condition_id'
  });
  if (condRow.is_other && !b.condition_notes?.trim()) return res.status(400).json({
    error: 'condition_notes required for Other condition'
  });
  const reasonRow = await db.get('SELECT is_other FROM reason_options WHERE id = ?', [b.reason_id]);
  if (!reasonRow) return res.status(400).json({
    error: 'Invalid reason_id'
  });
  if (reasonRow.is_other && !b.reason_other_text?.trim()) return res.status(400).json({
    error: 'reason_other_text required for Other reason'
  });
  try {
    const id = await db.transaction(async () => {
      const lotCode = await generateLotCode(db);
      const r = await db.run(`
        INSERT INTO leftover_stock (
          lot_code, fabric_type_id, color_name, pantone_code, pantone_name, color_display,
          has_embroidery, embroidery_type_id, embroidery_description,
          has_printing, printing_type_id, printing_description, other_design_notes,
          vendor_id, order_id, condition_id, condition_notes, date_logged,
          original_quantity_meters, remaining_quantity_meters,
          reason_id, reason_other_text, storage_location_id, storage_location_other_text,
          status, master_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?)`, [lotCode, b.fabric_type_id, b.color_name.trim(), b.pantone_code || null, b.pantone_name || null, b.color_display || null, b.has_embroidery ? 1 : 0, b.embroidery_type_id || null, b.embroidery_description || null, b.has_printing ? 1 : 0, b.printing_type_id || null, b.printing_description || null, b.other_design_notes || null, b.vendor_id || null, b.order_id || null, b.condition_id, b.condition_notes || null, b.date_logged || new Date().toISOString().split('T')[0], b.original_quantity_meters, b.original_quantity_meters, b.reason_id, b.reason_other_text || null, b.storage_location_id || null, b.storage_location_other_text || null, b.master_id || null, req.user.id]);
      return r.lastInsertRowid;
    });
    res.status(201).json(await db.get(`${BASE_SELECT} WHERE ls.id = ?`, [id]));
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to create: ' + err.message
    });
  }
});

// PUT /api/stock/:id
router.put('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM leftover_stock WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({
    error: 'Entry not found'
  });
  const b = req.body;
  const fields = ['fabric_type_id', 'color_name', 'pantone_code', 'pantone_name', 'color_display', 'has_embroidery', 'embroidery_type_id', 'embroidery_description', 'has_printing', 'printing_type_id', 'printing_description', 'other_design_notes', 'vendor_id', 'order_id', 'condition_id', 'condition_notes', 'date_logged', 'reason_id', 'reason_other_text', 'storage_location_id', 'storage_location_other_text', 'status'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) {
      let val = b[f];
      if (f === 'has_embroidery' || f === 'has_printing') val = val ? 1 : 0;
      updates.push(`${f} = ?`);
      params.push(val === '' ? null : val);
    }
  }
  if (!updates.length) return res.status(400).json({
    error: 'No fields to update'
  });
  updates.push("updated_at = datetime('now')");
  params.push(id);
  await db.run(`UPDATE leftover_stock SET ${updates.join(', ')} WHERE id = ?`, params);
  saveDb();
  res.json(await db.get(`${BASE_SELECT} WHERE ls.id = ?`, [id]));
});

// DELETE /api/stock/:id (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM leftover_stock WHERE id = ?', [id]);
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
    const photos = await db.all(`SELECT file_path FROM photos WHERE leftover_stock_id = ?`, [id]);
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
    await db.exec(`DELETE FROM photos WHERE leftover_stock_id = ${id}`);
    await db.exec(`DELETE FROM fabric_usage_log WHERE leftover_stock_id = ${id}`);
    await db.exec(`DELETE FROM stock_adjustments WHERE leftover_stock_id = ${id}`);
    await db.exec(`DELETE FROM leftover_stock WHERE id = ${id}`);
  }))();
  saveDb();
  res.json({
    message: 'Deleted successfully'
  });
});
module.exports = router;