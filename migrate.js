const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'fabric_tracker.db');
const db = new Database(dbPath);

console.log('Migrating condition_options...');

try {
  // Add column
  db.exec(`ALTER TABLE condition_options ADD COLUMN item_type TEXT NOT NULL DEFAULT 'both' CHECK (item_type IN ('fabric', 'accessory', 'both'));`);
  console.log('Migration successful!');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('Column already exists.');
  } else {
    console.error('Migration failed:', err);
  }
}

db.close();
