const { getDbAsync, saveDb } = require('./db/database');

async function wipeFabrics() {
  const db = await getDbAsync();
  console.log('Wiping fabric data...');
  
  db.run('DELETE FROM stock_adjustments WHERE leftover_stock_id IS NOT NULL');
  db.run('DELETE FROM fabric_usage_log');
  db.run('DELETE FROM photos WHERE leftover_stock_id IS NOT NULL');
  db.run('DELETE FROM leftover_stock');

  saveDb();
  console.log('Done!');
}

wipeFabrics();
