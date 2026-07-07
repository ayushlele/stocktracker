const express = require('express');
const {
  getDb,
  saveDb,
  getDbAsync
} = require('../db/database');
const {
  requireAuth
} = require('../middleware/auth');
const {
  validate
} = require('../middleware/validate');
const {
  usageSchema
} = require('../validation/usageSchema');
const router = express.Router({
  mergeParams: true
}); // mergeParams to get :id from parent

// GET /api/stock/:id/usage — List usage history
router.get('/', requireAuth, async (req, res) => {
  const db = await getDbAsync();
  const stockId = parseInt(req.params.id);
  const usage = await db.all(`SELECT ul.*, u.name as logged_by_name
     FROM fabric_usage_log ul
     LEFT JOIN users u ON ul.logged_by = u.id
     WHERE ul.leftover_stock_id = ?
     ORDER BY ul.date_used DESC, ul.created_at DESC`, [stockId]);
  res.json(usage);
});

// POST /api/stock/:id/usage — Log usage (transactional)
router.post('/', requireAuth, validate(usageSchema), async (req, res) => {
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

      // 2. Check status — block if Disposed
      if (entry.status === 'Disposed') {
        throw {
          status: 400,
          message: 'Cannot log usage against a disposed entry. This stock has been marked as disposed and is no longer trackable.'
        };
      }

      // 3. Validate quantity
      const {
        quantity_used_meters,
        date_used,
        used_for,
        notes
      } = req.body;
      if (quantity_used_meters > entry.remaining_quantity_meters) {
        throw {
          status: 400,
          message: `Cannot use ${quantity_used_meters}m — only ${entry.remaining_quantity_meters}m remaining (of ${entry.original_quantity_meters}m original).`
        };
      }

      // 4. Validate date — must be on or after date_logged
      const effectiveDate = date_used || new Date().toISOString().split('T')[0];
      if (effectiveDate < entry.date_logged) {
        throw {
          status: 400,
          message: `Usage date (${effectiveDate}) cannot be before the date this fabric was logged (${entry.date_logged}).`
        };
      }

      // 5. Write usage log row
      const usageResult = await db.run(`INSERT INTO fabric_usage_log
           (leftover_stock_id, quantity_used_meters, date_used, used_for, logged_by, notes)
         VALUES (?, ?, ?, ?, ?, ?)`, [stockId, quantity_used_meters, effectiveDate, used_for || null, req.user.id, notes || null]);

      // 6. Decrement remaining_quantity_meters
      const newRemaining = entry.remaining_quantity_meters - quantity_used_meters;
      let newStatus = entry.status;

      // 7. Auto-flip status to "Used" if remaining hits exactly 0
      if (newRemaining === 0) {
        newStatus = 'Used';
      }
      await db.run(`UPDATE leftover_stock SET remaining_quantity_meters = ?, status = ?, updated_at = datetime('now') WHERE id = ?`, [newRemaining, newStatus, stockId]);
      return {
        usage_log_id: usageResult.lastInsertRowid,
        new_remaining: newRemaining,
        new_status: newStatus
      };
    });
    res.status(201).json({
      message: 'Usage logged successfully',
      ...result
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        error: err.message
      });
    }
    console.error('Usage log error:', err);
    res.status(500).json({
      error: 'Failed to log usage: ' + err.message
    });
  }
});
module.exports = router;