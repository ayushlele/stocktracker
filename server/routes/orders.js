const express = require('express');
const {
  getDb,
  getDbAsync
} = require('../db/database');
const {
  requireAuth
} = require('../middleware/auth');
const {
  validate
} = require('../middleware/validate');
const {
  createOrderSchema,
  editOrderSchema
} = require('../validation/orderSchema');
const router = express.Router();

// GET /api/orders — List all orders, searchable
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const {
    search
  } = req.query;
  let sql = `SELECT * FROM orders`;
  const params = [];
  if (search) {
    sql += ` WHERE order_number LIKE ? OR style_name LIKE ? OR buyer_name LIKE ?`;
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }
  sql += ' ORDER BY created_at DESC';
  const rows = await db.all(sql, params);
  res.json(rows);
});

// GET /api/orders/:id — Get single order with linked leftover entries
router.get('/:id', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [parseInt(req.params.id)]);
  if (!order) {
    return res.status(404).json({
      error: 'Order not found'
    });
  }

  // Get linked leftover entries
  const entries = await db.all(`SELECT ls.id, ls.lot_code, ls.color_name, ls.pantone_name, ls.color_display, ls.remaining_quantity_meters, ls.original_quantity_meters,
            ls.status, ft.name as fabric_type_name
     FROM leftover_stock ls
     LEFT JOIN fabric_types ft ON ls.fabric_type_id = ft.id
     WHERE ls.order_id = ?
     ORDER BY ls.created_at DESC`, [parseInt(req.params.id)]);
  res.json({
    ...order,
    leftover_entries: entries
  });
});

// POST /api/orders — Create new order
router.post('/', requireAuth, validate(createOrderSchema), async (req, res) => {
  const db = await getDbAsync();
  const {
    order_number,
    style_name,
    buyer_name,
    order_date,
    notes
  } = req.body;
  const result = await db.run(`INSERT INTO orders (order_number, style_name, buyer_name, order_date, notes)
     VALUES (?, ?, ?, ?, ?)`, [order_number, style_name, buyer_name || null, order_date || null, notes || null]);
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(order);
});

// PUT /api/orders/:id — Edit order
router.put('/:id', requireAuth, validate(editOrderSchema), async (req, res) => {
  const db = await getDbAsync();
  const id = parseInt(req.params.id);
  const existing = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({
      error: 'Order not found'
    });
  }
  const {
    order_number,
    style_name,
    buyer_name,
    order_date,
    notes
  } = req.body;
  const updates = [];
  const params = [];
  if (order_number !== undefined) {
    updates.push('order_number = ?');
    params.push(order_number);
  }
  if (style_name !== undefined) {
    updates.push('style_name = ?');
    params.push(style_name);
  }
  if (buyer_name !== undefined) {
    updates.push('buyer_name = ?');
    params.push(buyer_name || null);
  }
  if (order_date !== undefined) {
    updates.push('order_date = ?');
    params.push(order_date || null);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes || null);
  }
  if (updates.length === 0) {
    return res.status(400).json({
      error: 'No fields to update'
    });
  }
  updates.push("updated_at = datetime('now')");
  params.push(id);
  await db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
  res.json(order);
});
module.exports = router;