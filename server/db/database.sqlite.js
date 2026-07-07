const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'fabric_tracker.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
let rawDb = null;
let dbReady = null;

function saveDb() {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

let isDirty = false;
let saveTimer = null;

function markDirty() {
  isDirty = true;
  if (!saveTimer) {
    saveTimer = setInterval(() => {
      if (isDirty) { saveDb(); isDirty = false; }
    }, 5000);
  }
}

class DbWrapper {
  constructor(sqlDb) { this._db = sqlDb; }

  run(sql, params = []) {
    this._db.run(sql, params);
    markDirty();
    const lastId = this._db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0];
    const changes = this._db.getRowsModified();
    return { lastInsertRowid: lastId, changes };
  }

  get(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      stmt.free();
      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
      const vals = stmt.get();
      const row = {};
      cols.forEach((c, i) => { row[c] = vals[i]; });
      rows.push(row);
    }
    stmt.free();
    return rows;
  }

  exec(sql) { this._db.run(sql); markDirty(); }

  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN IMMEDIATE');
      try {
        const result = fn(...args);
        this._db.run('COMMIT');
        markDirty();
        return result;
      } catch (e) {
        this._db.run('ROLLBACK');
        throw e;
      }
    };
  }

  save() { saveDb(); }
}

async function initDb() {
  const SQL = await initSqlJs();
  let sqlDb;
  const isNew = !fs.existsSync(DB_PATH);

  if (isNew) {
    sqlDb = new SQL.Database();
    console.log('Creating new database at:', DB_PATH);
  } else {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
    console.log('Database loaded from:', DB_PATH);
  }

  rawDb = sqlDb;
  db = new DbWrapper(sqlDb);
  db.exec('PRAGMA foreign_keys = ON;');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  sqlDb.exec(schema);
  markDirty();

  if (isNew) {
    seedData();
    console.log('Database seeded with initial data.');
  }

  saveDb();
  return db;
}

function seedData() {
  const salt = bcrypt.genSaltSync(10);

  // ── Users ────────────────────────────────────────────────────
  db.run('INSERT INTO users (name, pin_hash, role) VALUES (?, ?, ?)', ['Admin', bcrypt.hashSync('3947', salt), 'admin']);
  db.run('INSERT INTO users (name, pin_hash, role) VALUES (?, ?, ?)', ['Staff', bcrypt.hashSync('7261', salt), 'staff']);

  // ── Vendors ──────────────────────────────────────────────────
  const vendors = [
    ['Khatri Textiles', 'Ramesh Khatri', '9876543210'],
    ['Surat Silk House', 'Vijay Shah', '9765432109'],
    ['Mumbai Fabric Co.', 'Amit Patel', '9654321098'],
    ['Arvind Mills', 'Sales Team', '9543210987'],
    ['YKK Zippers India', 'Support', '9432109876'],
    ['Bombay Buttons', 'Rekha Sharma', '9321098765'],
  ];
  for (const [name, contact, phone] of vendors) {
    db.run('INSERT INTO vendors (name, contact_person, phone) VALUES (?, ?, ?)', [name, contact, phone]);
  }

  // ── Storage Locations ────────────────────────────────────────
  const locations = ['Dyeing Unit', 'Umargaon Factory', 'Kalyan Factory', 'Sakinaka Office', 'Vasai Job Worker'];
  for (const loc of locations) {
    db.run('INSERT INTO storage_locations (name) VALUES (?)', [loc]);
  }

  // ── Fabric Types ─────────────────────────────────────────────
  const fabricTypes = ['Cotton', 'Polyester', 'Satin', 'Silk', 'Chiffon', 'Georgette', 'Velvet', 'Linen', 'Rayon', 'Denim', 'Net', 'Crepe', 'Twill', 'Muslin', 'Interlock'];
  for (const ft of fabricTypes) db.run('INSERT INTO fabric_types (name) VALUES (?)', [ft]);

  // ── Embroidery Types ─────────────────────────────────────────
  const embroideryTypes = ['Thread Embroidery', 'Sequin/Beadwork', 'Zari Work', 'Applique', 'Mirror Work', 'Cutdana', 'Smocking', 'Shadow Work'];
  for (const et of embroideryTypes) db.run('INSERT INTO embroidery_types (name) VALUES (?)', [et]);

  // ── Printing Types ───────────────────────────────────────────
  const printingTypes = ['Screen Print', 'Digital/Sublimation Print', 'Block Print', 'Foil Print', 'Discharge Print', 'Pigment Print', 'Reactive Print'];
  for (const pt of printingTypes) db.run('INSERT INTO printing_types (name) VALUES (?)', [pt]);

  // ── Accessory Types ──────────────────────────────────────────
  const accessoryTypes = [
    ['Buttons', 'pieces'],
    ['Zippers', 'pieces'],
    ['Elastic', 'meters'],
    ['Loop Ends / Cord Locks', 'pieces'],
    ['Hangers', 'pieces'],
    ['Woven Labels / Tags', 'pieces'],
    ['Velcro / Hook & Loop', 'meters'],
    ['Snaps / Press Studs', 'pieces'],
    ['Rivets', 'pieces'],
    ['Drawstrings / Cords', 'meters'],
    ['Lace / Trim', 'meters'],
    ['Shoulder Pads', 'pieces'],
    ['Threads', 'cones'],
    ['Safety Pins', 'pieces'],
    ['Applique Patches', 'pieces'],
    ['Ribbons / Bows', 'meters'],
    ['Suspender Clips', 'pieces'],
    ['Poppers / KAM Snaps', 'pieces'],
    ['Hook & Eye', 'pieces'],
    ['Twill Tape', 'meters'],
    ['Seam Binding', 'meters'],
    ['Interlining / Fusible', 'meters'],
  ];
  for (const [name, unit] of accessoryTypes) {
    db.run('INSERT INTO accessory_types (name, default_unit) VALUES (?, ?)', [name, unit]);
  }

  // ── Condition Options ────────────────────────────────────────
  const conditions = ['Good / Reusable', 'Minor Stains', 'Major Stains', 'Water Damage', 'Color Fading/Bleeding', 'Torn/Frayed Edges', 'Odor Issue'];
  for (const c of conditions) db.run('INSERT INTO condition_options (name, is_other) VALUES (?, 0)', [c]);
  db.run('INSERT INTO condition_options (name, is_other) VALUES (?, 1)', ['Other']);

  // ── Reason Options ───────────────────────────────────────────
  const reasons = [
    'Short Supply from Vendor', 'Lower Consumption than Estimated',
    'Excess/Buffer Stock Ordered', 'Cutting Wastage',
    'Order Cancelled/Reduced', 'Defect Found After Cutting',
    'Returned from Job Worker', 'Sample/Swatch Leftover',
    'End of Roll / Short Piece',
  ];
  for (const r of reasons) db.run('INSERT INTO reason_options (name, is_other) VALUES (?, 0)', [r]);
  db.run('INSERT INTO reason_options (name, is_other) VALUES (?, 1)', ['Other']);

  // ── Stock Masters ────────────────────────────────────────────
  // (fabric_type_id refs: 1=Cotton,2=Poly,3=Satin,4=Silk,5=Chiffon,6=Georgette,7=Velvet,8=Linen)
  const masters = [
    ['Plain Cotton', 1, 0, null, null, 0, null, null, null],
    ['Printed Linen', 8, 0, null, null, 1, 1, 'Screen Print', null],
    ['Zari Georgette', 6, 1, 3, 'Zari border work', 0, null, null, null],
    ['Digital Print Silk', 4, 0, null, null, 1, 2, 'Digital all-over print', null],
    ['Sequin Satin', 3, 1, 2, 'Sequin embellishment', 0, null, null, null],
    ['Plain Velvet', 7, 0, null, null, 0, null, null, null],
    ['Chiffon with Embroidery', 5, 1, 1, 'Thread embroidery border', 0, null, null, null],
  ];
  for (const [name, ftId, hasEmb, embId, embDesc, hasPrint, printId, printDesc, notes] of masters) {
    db.run(
      `INSERT INTO stock_masters (name, fabric_type_id, has_embroidery, embroidery_type_id, embroidery_description, has_printing, printing_type_id, printing_description, other_design_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, ftId, hasEmb, embId, embDesc, hasPrint, printId, printDesc, notes]
    );
  }

  // ── Orders ───────────────────────────────────────────────────
  db.run('INSERT INTO orders (order_number, style_name, buyer_name, order_date) VALUES (?, ?, ?, ?)', ['ORD-2026-001', 'Summer Blouse A', 'H&M India', '2026-06-01']);
  db.run('INSERT INTO orders (order_number, style_name, buyer_name, order_date) VALUES (?, ?, ?, ?)', ['ORD-2026-002', 'Formal Shirt B', 'Zara Export', '2026-06-15']);
  db.run('INSERT INTO orders (order_number, style_name, buyer_name, order_date) VALUES (?, ?, ?, ?)', ['ORD-2026-003', 'Kids Party Dress C', 'Mango Exports', '2026-05-20']);

  // ── Sample Fabric Stock ──────────────────────────────────────
  const s = `INSERT INTO leftover_stock (
    lot_code, fabric_type_id, color_name, pantone_code, pantone_name, color_display,
    has_embroidery, has_printing, vendor_id, order_id,
    condition_id, date_logged, original_quantity_meters, remaining_quantity_meters,
    reason_id, storage_location_id, status, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(s, ['FAB-000001', 1, 'Ivory', '12-0712', 'Ivory', '#FFFFF0', 0, 0, 1, 1, 1, '2026-06-20', 200, 200, 2, 1, 'Available', 1]);
  db.run(s, ['FAB-000002', 4, 'Navy Blue', '19-3832', 'Naval', '#000080', 1, 0, 2, 2, 2, '2026-06-22', 50, 45, 1, 2, 'Available', 2]);
  db.run(s, ['FAB-000003', 2, 'Red', '19-1664', 'Fiesta', '#DC143C', 0, 1, 1, 1, 1, '2026-06-10', 120, 0, 3, 3, 'Used', 1]);
  db.run(s, ['FAB-000004', 6, 'Peach', '13-1220', 'Peach Amber', '#FFDAB9', 1, 1, 2, 3, 4, '2026-06-18', 30, 30, 7, 4, 'Available', 1]);
  db.run(s, ['FAB-000005', 3, 'Black', '19-0303', 'Jet Black', '#000000', 1, 0, 3, 3, 1, '2026-06-25', 100, 75, 4, 1, 'Reserved', 2]);
  db.run(s, ['FAB-000006', 10, 'Indigo', '19-3748', 'Blueprint', '#4B0082', 0, 0, 4, null, 6, '2026-06-05', 60, 15, 6, 5, 'Available', 1]);
  db.run(s, ['FAB-000007', 5, 'Emerald', '17-0145', 'Foliage', '#50C878', 0, 0, 2, null, 1, '2026-07-01', 90, 90, 2, 3, 'Available', 2]);

  db.run('UPDATE lot_code_seq SET next_val = 8 WHERE id = 1', []);

  // ── Sample Accessory Stock ───────────────────────────────────
  const as = `INSERT INTO accessory_stock (
    lot_code, accessory_type_id, color_name, pantone_code, pantone_name, color_display,
    size_spec, material, vendor_id, order_id,
    unit_type, original_quantity, remaining_quantity,
    condition_id, reason_id, storage_location_id, status, created_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(as, ['ACC-000001', 1, 'White', '11-0601', 'Bright White', '#FFFFFF', '15mm', 'Plastic', 6, 1, 'pieces', 500, 480, 1, 2, 1, 'Available', 1]);
  db.run(as, ['ACC-000002', 2, 'Black', '19-0303', 'Jet Black', '#000000', '20cm YKK #3', 'Nylon', 5, 2, 'pieces', 200, 150, 1, 1, 2, 'Available', 1]);
  db.run(as, ['ACC-000003', 3, 'White', '11-0601', 'Bright White', '#FFFFFF', '25mm', 'Polyester', 4, null, 'meters', 50, 30, 1, 3, 3, 'Available', 2]);
  db.run(as, ['ACC-000004', 18, 'Silver', '14-4102', 'Glacier Grey', '#C0C0C0', '12mm', 'Metal', 6, 3, 'pieces', 1000, 750, 1, 2, 1, 'Available', 1]);

  // Usage logs
  db.run(`INSERT INTO fabric_usage_log (leftover_stock_id, quantity_used_meters, date_used, used_for, logged_by) VALUES (?, ?, ?, ?, ?)`, [3, 120, '2026-06-18', 'ORD-2026-001 full batch', 1]);
  db.run(`INSERT INTO fabric_usage_log (leftover_stock_id, quantity_used_meters, date_used, used_for, logged_by) VALUES (?, ?, ?, ?, ?)`, [5, 25, '2026-06-28', 'Sample set for buyer', 2]);
  db.run(`INSERT INTO accessory_usage_log (accessory_stock_id, quantity_used, date_used, used_for, logged_by) VALUES (?, ?, ?, ?, ?)`, [1, 20, '2026-06-22', 'ORD-2026-001 children blouses', 1]);
  db.run(`INSERT INTO accessory_usage_log (accessory_stock_id, quantity_used, date_used, used_for, logged_by) VALUES (?, ?, ?, ?, ?)`, [2, 50, '2026-06-25', 'ORD-2026-002 formal shirts', 1]);

  // Adjustment
  db.run(`INSERT INTO stock_adjustments (leftover_stock_id, quantity_delta, reason, adjusted_by) VALUES (?, ?, ?, ?)`, [2, -5, 'Physical count mismatch: only 45m found vs 50m recorded', 1]);
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

async function getDbAsync() {
  if (db) return db;
  if (!dbReady) dbReady = initDb();
  return dbReady;
}

function closeDb() {
  if (saveTimer) clearInterval(saveTimer);
  if (db) { saveDb(); console.log('Database saved and closed.'); }
}

process.on('exit', closeDb);
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

if (require.main === module) {
  initDb().then(() => { console.log('Done.'); closeDb(); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { getDb, getDbAsync, closeDb, saveDb };
