const { getDbAsync, saveDb } = require('./db/database');

async function migrate() {
  const db = await getDbAsync();
  
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS accessory_masters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        accessory_type_id INTEGER REFERENCES accessory_types(id),
        default_material TEXT,
        default_size_spec TEXT,
        brand_notes TEXT,
        default_unit_type TEXT NOT NULL DEFAULT 'pieces' CHECK (default_unit_type IN ('pieces','meters','cones')),
        default_reason_id INTEGER REFERENCES reason_options(id),
        vendor_id INTEGER REFERENCES vendors(id),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    console.log("accessory_masters created");
  } catch (e) {
    console.log(e.message);
  }

  try {
    db.exec('ALTER TABLE accessory_stock ADD COLUMN master_id INTEGER REFERENCES accessory_masters(id)');
    console.log("master_id added");
  } catch (e) {
    console.log("column might exist:", e.message);
  }

  saveDb();
}

migrate();
