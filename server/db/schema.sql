-- ============================================================
-- Fabric & Accessories Tracker — Database Schema v2
-- ============================================================

-- Sequence table for lot codes (shared, prefix distinguishes type)
CREATE TABLE IF NOT EXISTS lot_code_seq (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_val INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO lot_code_seq (id, next_val) VALUES (1, 1);

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pin_hash   TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Vendors ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  contact_person TEXT,
  phone          TEXT,
  notes          TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Storage Locations (now admin-configurable, not hardcoded) ─
CREATE TABLE IF NOT EXISTS storage_locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Reference Tables: Pattern A (growable, no "Other")
-- ============================================================

CREATE TABLE IF NOT EXISTS fabric_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS embroidery_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS printing_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accessory_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  default_unit TEXT NOT NULL DEFAULT 'pieces' CHECK (default_unit IN ('pieces','meters','cones')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Reference Tables: Pattern B (fixed + "Other" escape hatch)
-- ============================================================

CREATE TABLE IF NOT EXISTS condition_options (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_other   INTEGER NOT NULL DEFAULT 0,
  item_type  TEXT NOT NULL DEFAULT 'both' CHECK (item_type IN ('fabric', 'accessory', 'both')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reason_options (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_other   INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Stock Masters (quick-add templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_masters (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  fabric_type_id        INTEGER REFERENCES fabric_types(id),
  has_embroidery        INTEGER NOT NULL DEFAULT 0,
  embroidery_type_id    INTEGER REFERENCES embroidery_types(id),
  embroidery_description TEXT,
  has_printing          INTEGER NOT NULL DEFAULT 0,
  printing_type_id      INTEGER REFERENCES printing_types(id),
  printing_description  TEXT,
  other_design_notes    TEXT,
  default_reason_id     INTEGER REFERENCES reason_options(id),
  vendor_id             INTEGER REFERENCES vendors(id),
  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accessory_masters (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  accessory_type_id     INTEGER REFERENCES accessory_types(id),
  default_material      TEXT,
  default_size_spec     TEXT,
  brand_notes           TEXT,
  default_unit_type     TEXT NOT NULL DEFAULT 'pieces' CHECK (default_unit_type IN ('pieces','meters','cones')),
  default_reason_id     INTEGER REFERENCES reason_options(id),
  vendor_id             INTEGER REFERENCES vendors(id),
  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  style_name   TEXT NOT NULL,
  buyer_name   TEXT,
  order_date   TEXT,
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Core Entity: Leftover Fabric Stock
-- ============================================================
CREATE TABLE IF NOT EXISTS leftover_stock (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_code                    TEXT NOT NULL UNIQUE,

  -- Fabric identity
  fabric_type_id              INTEGER NOT NULL REFERENCES fabric_types(id),

  -- Color (Pantone-first, free-text fallback)
  color_name                  TEXT NOT NULL,
  pantone_code                TEXT,
  pantone_name                TEXT,
  color_display               TEXT,  -- hex approximation for UI swatches only

  -- Design attributes
  has_embroidery              INTEGER NOT NULL DEFAULT 0,
  embroidery_type_id          INTEGER REFERENCES embroidery_types(id),
  embroidery_description      TEXT,
  has_printing                INTEGER NOT NULL DEFAULT 0,
  printing_type_id            INTEGER REFERENCES printing_types(id),
  printing_description        TEXT,
  other_design_notes          TEXT,

  -- Vendor
  vendor_id                   INTEGER REFERENCES vendors(id),

  -- Order link
  order_id                    INTEGER REFERENCES orders(id),

  -- Condition
  condition_id                INTEGER NOT NULL REFERENCES condition_options(id),
  condition_notes             TEXT,

  -- Quantity (meters)
  date_logged                 TEXT NOT NULL DEFAULT (date('now')),
  original_quantity_meters    REAL NOT NULL CHECK (original_quantity_meters > 0),
  remaining_quantity_meters   REAL NOT NULL CHECK (remaining_quantity_meters >= 0),

  -- Reason
  reason_id                   INTEGER NOT NULL REFERENCES reason_options(id),
  reason_other_text           TEXT,

  -- Location (FK to storage_locations, or text override)
  storage_location_id         INTEGER REFERENCES storage_locations(id),
  storage_location_other_text TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'Available' CHECK (
    status IN ('Available', 'Reserved', 'Used', 'Disposed')
  ),

  -- Master reference (if created via quick-add)
  master_id                   INTEGER REFERENCES stock_masters(id),

  created_by                  INTEGER NOT NULL REFERENCES users(id),
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Accessory Stock
-- ============================================================
CREATE TABLE IF NOT EXISTS accessory_stock (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_code                 TEXT NOT NULL UNIQUE,

  accessory_type_id        INTEGER NOT NULL REFERENCES accessory_types(id),

  -- Color
  color_name               TEXT NOT NULL DEFAULT 'N/A',
  pantone_code             TEXT,
  pantone_name             TEXT,
  color_display            TEXT,

  -- Specs
  size_spec                TEXT,   -- e.g. "15mm", "20cm", "YKK #5"
  material                 TEXT,   -- e.g. "Plastic", "Metal", "Nylon"
  brand_notes              TEXT,

  -- Vendor
  vendor_id                INTEGER REFERENCES vendors(id),

  -- Order link
  order_id                 INTEGER REFERENCES orders(id),

  -- Quantity
  unit_type                TEXT NOT NULL DEFAULT 'pieces' CHECK (unit_type IN ('pieces','meters','cones')),
  original_quantity        REAL NOT NULL CHECK (original_quantity > 0),
  remaining_quantity       REAL NOT NULL CHECK (remaining_quantity >= 0),

  -- Condition & Reason (reuse same tables)
  condition_id             INTEGER NOT NULL REFERENCES condition_options(id),
  condition_notes          TEXT,
  reason_id                INTEGER NOT NULL REFERENCES reason_options(id),
  reason_other_text        TEXT,

  -- Location
  storage_location_id      INTEGER REFERENCES storage_locations(id),
  storage_location_other_text TEXT,

  status TEXT NOT NULL DEFAULT 'Available' CHECK (
    status IN ('Available', 'Reserved', 'Used', 'Disposed')
  ),

  -- Master reference (if created via quick-add)
  master_id                INTEGER REFERENCES accessory_masters(id),

  created_by               INTEGER NOT NULL REFERENCES users(id),
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Photos (works for both fabric and accessory stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS photos (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  leftover_stock_id    INTEGER REFERENCES leftover_stock(id),
  accessory_stock_id   INTEGER REFERENCES accessory_stock(id),
  file_path            TEXT NOT NULL,
  uploaded_at          TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (leftover_stock_id IS NOT NULL AND accessory_stock_id IS NULL) OR
    (leftover_stock_id IS NULL AND accessory_stock_id IS NOT NULL)
  )
);

-- ============================================================
-- Fabric Usage Log
-- ============================================================
CREATE TABLE IF NOT EXISTS fabric_usage_log (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  leftover_stock_id    INTEGER NOT NULL REFERENCES leftover_stock(id),
  quantity_used_meters REAL NOT NULL CHECK (quantity_used_meters > 0),
  date_used            TEXT NOT NULL DEFAULT (date('now')),
  used_for             TEXT,
  logged_by            INTEGER NOT NULL REFERENCES users(id),
  notes                TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Accessory Usage Log
-- ============================================================
CREATE TABLE IF NOT EXISTS accessory_usage_log (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  accessory_stock_id  INTEGER NOT NULL REFERENCES accessory_stock(id),
  quantity_used       REAL NOT NULL CHECK (quantity_used > 0),
  date_used           TEXT NOT NULL DEFAULT (date('now')),
  used_for            TEXT,
  logged_by           INTEGER NOT NULL REFERENCES users(id),
  notes               TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Stock Adjustments (admin-only, works for both types)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  leftover_stock_id   INTEGER REFERENCES leftover_stock(id),
  accessory_stock_id  INTEGER REFERENCES accessory_stock(id),
  quantity_delta      REAL NOT NULL CHECK (quantity_delta != 0),
  reason              TEXT NOT NULL,
  adjusted_by         INTEGER NOT NULL REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (leftover_stock_id IS NOT NULL AND accessory_stock_id IS NULL) OR
    (leftover_stock_id IS NULL AND accessory_stock_id IS NOT NULL)
  )
);

-- ============================================================
-- Trigger: prevent original_quantity_meters change on fabric
-- ============================================================
CREATE TRIGGER IF NOT EXISTS prevent_original_qty_change
BEFORE UPDATE OF original_quantity_meters ON leftover_stock
BEGIN
  SELECT RAISE(ABORT, 'original_quantity_meters is immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_acc_original_qty_change
BEFORE UPDATE OF original_quantity ON accessory_stock
BEGIN
  SELECT RAISE(ABORT, 'original_quantity is immutable');
END;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_status          ON leftover_stock(status);
CREATE INDEX IF NOT EXISTS idx_stock_fabric_type     ON leftover_stock(fabric_type_id);
CREATE INDEX IF NOT EXISTS idx_stock_vendor          ON leftover_stock(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stock_location        ON leftover_stock(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_lot_code        ON leftover_stock(lot_code);
CREATE INDEX IF NOT EXISTS idx_stock_date_logged     ON leftover_stock(date_logged);
CREATE INDEX IF NOT EXISTS idx_stock_order           ON leftover_stock(order_id);
CREATE INDEX IF NOT EXISTS idx_acc_status            ON accessory_stock(status);
CREATE INDEX IF NOT EXISTS idx_acc_type              ON accessory_stock(accessory_type_id);
CREATE INDEX IF NOT EXISTS idx_acc_vendor            ON accessory_stock(vendor_id);
CREATE INDEX IF NOT EXISTS idx_photos_stock          ON photos(leftover_stock_id);
CREATE INDEX IF NOT EXISTS idx_photos_acc            ON photos(accessory_stock_id);
CREATE INDEX IF NOT EXISTS idx_usage_stock           ON fabric_usage_log(leftover_stock_id);
CREATE INDEX IF NOT EXISTS idx_acc_usage             ON accessory_usage_log(accessory_stock_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_stock     ON stock_adjustments(leftover_stock_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_acc       ON stock_adjustments(accessory_stock_id);
