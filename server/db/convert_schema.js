const fs = require('fs');
const path = require('path');

let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Replacements for PostgreSQL
schema = schema.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
schema = schema.replace(/COLLATE NOCASE/gi, '');
schema = schema.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
schema = schema.replace(/date\('now'\)/gi, 'CURRENT_DATE');
schema = schema.replace(/REAL/gi, 'NUMERIC');
schema = schema.replace(/INTEGER/gi, 'INTEGER');
schema = schema.replace(/INSERT OR IGNORE/gi, 'INSERT');

// Remove trigger for sqlite and create functions for Postgres
schema = schema.replace(/CREATE TRIGGER IF NOT EXISTS prevent_original_qty_change[\s\S]*?END;/gi, '');
schema = schema.replace(/CREATE TRIGGER IF NOT EXISTS prevent_acc_original_qty_change[\s\S]*?END;/gi, '');

// Postgres Triggers
const pgTriggers = `
CREATE OR REPLACE FUNCTION prevent_original_qty_change_fn() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_quantity_meters <> OLD.original_quantity_meters THEN
    RAISE EXCEPTION 'original_quantity_meters is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_original_qty_change
BEFORE UPDATE ON leftover_stock
FOR EACH ROW
EXECUTE FUNCTION prevent_original_qty_change_fn();

CREATE OR REPLACE FUNCTION prevent_acc_original_qty_change_fn() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_quantity <> OLD.original_quantity THEN
    RAISE EXCEPTION 'original_quantity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_acc_original_qty_change
BEFORE UPDATE ON accessory_stock
FOR EACH ROW
EXECUTE FUNCTION prevent_acc_original_qty_change_fn();
`;

schema = schema + '\n' + pgTriggers;

// SQLite "CREATE TABLE IF NOT EXISTS" is standard, but SQLite handles CHECK constraints slightly differently. The checks should work in PG as well.
// We also need to fix `next_val INTEGER NOT NULL DEFAULT 1` in `lot_code_seq` to work properly with PG sequences, or we can just keep the table mechanism.
// Keeping the table mechanism is fine. However, in PG, we must use `ON CONFLICT DO NOTHING` for `INSERT OR IGNORE`.
schema = schema.replace(/INSERT INTO lot_code_seq \(id, next_val\) VALUES \(1, 1\);/g, 'INSERT INTO lot_code_seq (id, next_val) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;');

fs.writeFileSync(path.join(__dirname, 'schema.pg.sql'), schema);
console.log('Postgres schema generated.');
