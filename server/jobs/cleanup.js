const fs = require('fs');
const path = require('path');
const { getDbAsync } = require('../db/database');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

async function runCleanup() {
  try {
    const db = await getDbAsync();
    console.log('[Cleanup Job] Running cleanup for Used stock older than 2 days...');

    await db.transaction(async () => {
      // ── 1. Cleanup Leftover Stock ──
      const oldFabrics = await db.all(`
        SELECT id FROM leftover_stock 
        WHERE status = 'Used' AND updated_at::timestamp <= NOW() - INTERVAL '2 days'
      `);

      for (const f of oldFabrics) {
        // Find photos to delete files
        const photos = await db.all(`SELECT file_path FROM photos WHERE leftover_stock_id = $1`, [f.id]);
        photos.forEach(p => {
          const filePath = path.join(UPLOADS_DIR, path.basename(p.file_path));
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.warn(e); }
          }
        });
        // Delete dependent rows
        await db.run(`DELETE FROM photos WHERE leftover_stock_id = $1`, [f.id]);
        await db.run(`DELETE FROM fabric_usage_log WHERE leftover_stock_id = $1`, [f.id]);
        await db.run(`DELETE FROM stock_adjustments WHERE leftover_stock_id = $1`, [f.id]);
        // Delete stock
        await db.run(`DELETE FROM leftover_stock WHERE id = $1`, [f.id]);
        console.log(`[Cleanup Job] Deleted leftover_stock ID: ${f.id}`);
      }

      // ── 2. Cleanup Accessory Stock ──
      const oldAccessories = await db.all(`
        SELECT id FROM accessory_stock 
        WHERE status = 'Used' AND updated_at::timestamp <= NOW() - INTERVAL '2 days'
      `);

      for (const a of oldAccessories) {
        // Find photos
        const photos = await db.all(`SELECT file_path FROM photos WHERE accessory_stock_id = $1`, [a.id]);
        photos.forEach(p => {
          const filePath = path.join(UPLOADS_DIR, path.basename(p.file_path));
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.warn(e); }
          }
        });
        // Delete dependent rows
        await db.run(`DELETE FROM photos WHERE accessory_stock_id = $1`, [a.id]);
        await db.run(`DELETE FROM accessory_usage_log WHERE accessory_stock_id = $1`, [a.id]);
        await db.run(`DELETE FROM stock_adjustments WHERE accessory_stock_id = $1`, [a.id]);
        // Delete stock
        await db.run(`DELETE FROM accessory_stock WHERE id = $1`, [a.id]);
        console.log(`[Cleanup Job] Deleted accessory_stock ID: ${a.id}`);
      }
    });
  } catch (err) {
    console.error('[Cleanup Job] Failed:', err);
  }
}

function startCleanupCron() {
  // Run once on startup
  setTimeout(runCleanup, 5000);
  // Run every 12 hours
  setInterval(runCleanup, 12 * 60 * 60 * 1000);
}

module.exports = { startCleanupCron };
