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
const {
  validate
} = require('../middleware/validate');
const {
  adjustmentSchema
} = require('../validation/adjustmentSchema');
const router = express.Router({
  mergeParams: true
});

// GET /api/stock/:id/adjustments — List adjustment history (viewable by all)
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const stockId = parseInt(req.params.id);
  const adjustments = await db.all(`SELECT sa.*, u.name as adjusted_by_name
     FROM stock_adjustments sa
     LEFT JOIN users u ON sa.adjusted_by = u.id
     WHERE sa.leftover_stock_id = ?
     ORDER BY sa.created_at DESC`, [stockId]);
  res.json(adjustments);
});

// POST /api/stock/:id/adjustments — Adjust stock (admin only, transactional)
router.post('/', requireAuth, requireAdmin, validate(adjustmentSchema), async (req, res) => {
  const db = await getDbAsync();
  const stockId = parseInt(req.params.id);
  try {
    const result = await db.transaction(async () => {
      // 1. Get current entry state
      const entry = await db.get('SELECT * FROM leftover_stock WHERE id = ?', [stockId]);
      if (!entry) {
        throw {
          status: 404,
          message: 'Entry not found'
        };
      }

      // 2. Block if Disposed
      if (entry.status === 'Disposed') {
        throw {
          status: 400,
          message: 'Cannot adjust stock on a disposed entry. This stock has been marked as disposed and is no longer trackable.'
        };
      }
      const {
        quantity_delta_meters,
        quantity_delta: qd,
        reason
      } = req.body;
      const delta = quantity_delta_meters ?? qd; // accept both old and new field name
      if (!delta || delta === 0) throw {
        status: 400,
        message: 'quantity_delta cannot be 0'
      };

      // 3. Validate resulting quantity won't go negative
      const newRemaining = entry.remaining_quantity_meters + delta;
      if (newRemaining < 0) {
        throw {
          status: 400,
          message: `Adjustment of ${delta}m would bring remaining to ${newRemaining}m, which is negative.`
        };
      }

      // 4. Write adjustment row
      const adjResult = await db.run(`INSERT INTO stock_adjustments (leftover_stock_id, quantity_delta, reason, adjusted_by) VALUES (?, ?, ?, ?)`, [stockId, delta, reason, req.user.id]);

      // 5. Update remaining_quantity_meters
      // 6. Re-evaluate status per §4 rule 5:
      //    - remaining hits 0 → "Used"
      //    - remaining goes back above 0 and was "Used" → "Available"
      //    - "Disposed" takes precedence (already blocked above)
      let newStatus = entry.status;
      if (newRemaining === 0) {
        newStatus = 'Used';
      } else if (newRemaining > 0 && entry.status === 'Used') {
        newStatus = 'Available';
      }
      await db.run(`UPDATE leftover_stock SET remaining_quantity_meters = ?, status = ?, updated_at = datetime('now') WHERE id = ?`, [newRemaining, newStatus, stockId]);
      return {
        adjustment_id: adjResult.lastInsertRowid,
        new_remaining: newRemaining,
        new_status: newStatus
      };
    });
    res.status(201).json({
      message: 'Stock adjusted successfully',
      ...result
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message
      });
    }
    console.error('Stock adjustment error:', err);
    res.status(500).json({
      error: 'Failed to adjust stock: ' + err.message
    });
  }
});
module.exports = router;