const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const isPostgres = Boolean(
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_PROVIDER === 'supabase' ||
  process.env.DATABASE_PROVIDER === 'postgres'
);

let db = null;
let pgPool = null;

if (isPostgres) {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL;

  pgPool = new Pool({
    connectionString,
    ssl: connectionString && connectionString.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  pgPool.on('error', (err) => {
    console.error('Unexpected Supabase/PostgreSQL client error:', err);
  });
} else {
  const defaultDbDir = path.resolve(__dirname, '../../data');
  const dbPath = process.env.DB_PATH || path.join(defaultDbDir, 'bulkmailer.db');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new sqlite3.Database(dbPath);

  // Enable WAL mode and foreign keys for SQLite performance and integrity
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL;');
    db.run('PRAGMA foreign_keys = ON;');
  });
}

// Helper to convert SQLite '?' placeholders to PostgreSQL '$1, $2, ...'
const convertPlaceholders = (sql) => {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
};

const get = (sql, params = []) => {
  if (isPostgres) {
    return pgPool.query(convertPlaceholders(sql), params).then((res) => res.rows[0] || null);
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  if (isPostgres) {
    return pgPool.query(convertPlaceholders(sql), params).then((res) => res.rows || []);
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

const run = (sql, params = []) => {
  if (isPostgres) {
    let pgSql = sql;
    const isInsert = /^\s*insert\s+into/i.test(sql);
    if (isInsert && !/returning/i.test(sql)) {
      pgSql = `${sql} RETURNING id`;
    }

    return pgPool.query(convertPlaceholders(pgSql), params).then((res) => ({
      lastID: res.rows?.[0]?.id || 0,
      changes: res.rowCount || 0
    }));
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const exec = (sql) => {
  if (isPostgres) {
    return pgPool.query(sql);
  }

  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const close = () => {
  if (isPostgres) {
    return pgPool.end();
  }

  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

module.exports = {
  db,
  pgPool,
  isPostgres,
  get,
  all,
  run,
  exec,
  close
};
