const express = require('express');
const {
  getDb,
  getDbAsync
} = require('../db/database');
const {
  requireAuth,
  requireAdmin
} = require('../middleware/auth');

/**
 * Factory: creates an Express router for a reference data table.
 *
 * @param {string} tableName - DB table name
 * @param {object} options
 * @param {boolean} options.hasOther - If true, rows with is_other=1 are protected from edit/deactivation
 * @param {boolean} options.adminOnlyWrite - If true, POST requires admin (Pattern B). Otherwise any auth user can add (Pattern A inline add).
 */
function createRefRouter(tableName, {
  hasOther = false,
  adminOnlyWrite = false
} = {}) {
  const router = express.Router();

  // GET / — List all
  router.get('/', requireAuth, async (req, res) => {
    const db = await getDbAsync();
    const activeOnly = req.query.active_only === 'true';
    let sql = `SELECT * FROM ${tableName}`;
    if (activeOnly) sql += ' WHERE is_active = 1';
    sql += ' ORDER BY name';
    const rows = await db.all(sql);
    res.json(rows);
  });

  // POST / — Create new entry
  const postMiddleware = adminOnlyWrite ? [requireAuth, requireAdmin] : [requireAuth];
  router.post('/', ...postMiddleware, async (req, res) => {
    const {
      name
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Name is required'
      });
    }
    const db = await getDbAsync();
    const trimmed = name.trim();

    // Case-insensitive duplicate check
    const existing = await db.get(`SELECT * FROM ${tableName} WHERE name ILIKE ?`, [trimmed]);
    if (existing) {
      if (!existing.is_active) {
        // Reactivate
        await db.run(`UPDATE ${tableName} SET is_active = 1 WHERE id = ?`, [existing.id]);
        existing.is_active = 1;
      }
      return res.json(existing);
    }
    const colsList = hasOther ? ['name', 'is_other'] : ['name'];
    const valsList = hasOther ? ['?', '0'] : ['?'];
    const insertParams = [trimmed];
    if (tableName === 'accessory_types' && req.body.default_unit) {
      colsList.push('default_unit');
      valsList.push('?');
      insertParams.push(req.body.default_unit);
    }
    if (tableName === 'condition_options' && req.body.item_type) {
      colsList.push('item_type');
      valsList.push('?');
      insertParams.push(req.body.item_type);
    }
    const cols = `(${colsList.join(', ')})`;
    const vals = `(${valsList.join(', ')})`;
    const result = await db.run(`INSERT INTO ${tableName} ${cols} VALUES ${vals}`, insertParams);
    const row = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [result.lastInsertRowid]);
    res.status(201).json(row);
  });

  // PUT /:id — Update name / toggle is_active (admin only)
  router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    const {
      id
    } = req.params;
    const db = await getDbAsync();
    const existing = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [parseInt(id)]);
    if (!existing) {
      return res.status(404).json({
        error: 'Not found'
      });
    }

    // Protect "Other" system rows
    if (hasOther && existing.is_other) {
      return res.status(400).json({
        error: 'Cannot modify the system "Other" entry'
      });
    }
    const {
      name,
      is_active
    } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined && name.trim()) {
      // Check for case-insensitive duplicate
      const dup = await db.get(`SELECT * FROM ${tableName} WHERE name ILIKE ? AND id != ?`, [name.trim(), parseInt(id)]);
      if (dup) {
        return res.status(400).json({
          error: `"${name.trim()}" already exists`
        });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (tableName === 'accessory_types' && req.body.default_unit !== undefined) {
      updates.push('default_unit = ?');
      params.push(req.body.default_unit);
    }
    if (tableName === 'condition_options' && req.body.item_type !== undefined) {
      updates.push('item_type = ?');
      params.push(req.body.item_type);
    }
    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      });
    }
    params.push(parseInt(id));
    await db.run(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`, params);
    const row = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [parseInt(id)]);
    res.json(row);
  });
  return router;
}
module.exports = {
  createRefRouter
};