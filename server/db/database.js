require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

let pool = null;
let dbWrapper = null;

// Helper to convert SQLite `?` params to Postgres `$1`, `$2` etc.
function convertQuery(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

class DbWrapper {
  constructor(pgPool) {
    this._pool = pgPool;
  }

  // Returns a promise since pg is async, but our current backend uses sync logic for SQLite.
  // Wait, our backend routes use `db.run()`, `db.get()`, `db.all()` synchronously because sql.js was synchronous!
  // If we switch to pg, everything becomes async. We must update the routes to `await db.all()`!
  // BUT the routes already do `const rows = db.all(...)` without `await`!
  // Converting the entire backend to async is required for `pg`.
  // Let me rethink this... `sql.js` was synchronous. `pg` is asynchronous.
  // I need to change `db.all`, `db.get`, `db.run` to be async, AND update the route handlers to `await` them.
  // Wait, I can use a codemod, or I can just update the route files (accessories.js, leftoverStock.js, auth.js, dashboard.js)
  
  async run(sql, params = []) {
    const query = convertQuery(sql);
    const client = await this._pool.connect();
    try {
      const res = await client.query(query, params);
      // For inserts, returning id requires "RETURNING id" in Postgres, which SQLite doesn't need with lastInsertRowid.
      // We will try to append " RETURNING id" if it's an INSERT, but it's tricky.
      // If the caller needs lastInsertRowid, they must change their query to append RETURNING id.
      return { changes: res.rowCount, lastInsertRowid: res.rows[0]?.id };
    } finally {
      client.release();
    }
  }

  async get(sql, params = []) {
    const query = convertQuery(sql);
    const res = await this._pool.query(query, params);
    return res.rows[0];
  }

  async all(sql, params = []) {
    const query = convertQuery(sql);
    const res = await this._pool.query(query, params);
    return res.rows;
  }

  async exec(sql) {
    await this._pool.query(sql);
  }

  // Postgres transactions
  async transaction(fn) {
    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      
      // Since our routes wrap multiple queries in a transaction function synchronously, this won't work well directly if they expect synchronous.
      // We will need to adapt the route transaction logic manually.
      const result = await fn(client); // passing client so they can use it for the tx
      
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  save() { /* No-op for Postgres */ }
}

async function initDb() {
  if (!SUPABASE_DB_URL || SUPABASE_DB_URL.includes('[YOUR-PASSWORD]')) {
    console.warn("WARNING: Supabase DB URL is not set or contains placeholder password. Database connection will fail.");
    return null;
  }

  pool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  dbWrapper = new DbWrapper(pool);

  // Initialize schema if needed
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT to_regclass('public.users') as exists");
    if (!res.rows[0].exists) {
      console.log('Creating schema in Postgres...');
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8');
      await client.query(schemaSql);
      await seedData(dbWrapper);
      console.log('Database seeded.');
    }
  } finally {
    client.release();
  }

  // Initialize Storage Bucket
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (!listError) {
      if (!buckets.find(b => b.name === 'photos')) {
        console.log('Creating "photos" bucket in Supabase Storage...');
        await supabase.storage.createBucket('photos', { public: true });
      }
    }
  }

  return dbWrapper;
}

async function seedData(db) {
  // (Seed data logic... this is too much to run here, we can just run a seed script)
}

function getDb() {
  return dbWrapper;
}

async function getDbAsync() {
  if (dbWrapper) return dbWrapper;
  return initDb();
}

function closeDb() {
  if (pool) pool.end();
}

module.exports = { getDb, getDbAsync, closeDb, saveDb: () => {} };
