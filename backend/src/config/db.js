const path = require('path');
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}
const { Pool, types } = require('pg');
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));
const { supabase } = require('./supabase');

const getConnectionString = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DATABASE_URL) return process.env.SUPABASE_DATABASE_URL;

  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
  const projectRef = process.env.SUPABASE_PROJECT_REF || 'pkofxyqunqjwwffivfru';
  if (dbPassword) {
    return `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
  }
  return null;
};

const connectionString = getConnectionString();

let pgPool = null;

if (connectionString) {
  pgPool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pgPool.on('error', (err) => {
    console.error('⚠️ Unexpected Supabase PostgreSQL client pool error:', err.message);
  });
} else {
  console.warn(
    '⚠️ [Supabase DB] DATABASE_URL not yet set in backend/.env.\n' +
    '   Please configure DATABASE_URL=postgresql://postgres.pkofxyqunqjwwffivfru:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
  );
}

// Convert standard '?' placeholders to PostgreSQL '$1, $2, ...' and SQLite compatibility functions
const convertPlaceholders = (sql) => {
  let index = 1;
  let pgSql = sql
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/DO UPDATE SET count = count \+ 1/gi, 'DO UPDATE SET count = daily_send_logs.count + 1');

  if (/insert\s+or\s+ignore\s+into/i.test(pgSql)) {
    pgSql = pgSql.replace(/insert\s+or\s+ignore\s+into/gi, 'INSERT INTO');
    if (!/on\s+conflict/i.test(pgSql)) {
      pgSql += ' ON CONFLICT DO NOTHING';
    }
  }

  return pgSql.replace(/\?/g, () => `$${index++}`);
};

const ensurePool = () => {
  if (!pgPool) {
    const currentConn = getConnectionString();
    if (!currentConn) {
      throw new Error(
        'Supabase PostgreSQL database is not configured. Please set DATABASE_URL in backend/.env'
      );
    }
    pgPool = new Pool({
      connectionString: currentConn,
      ssl: currentConn.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  }
  return pgPool;
};

const get = async (sql, params = []) => {
  const pool = ensurePool();
  const res = await pool.query(convertPlaceholders(sql), params);
  return res.rows[0];
};

const all = async (sql, params = []) => {
  const pool = ensurePool();
  const res = await pool.query(convertPlaceholders(sql), params);
  return res.rows || [];
};

const run = async (sql, params = []) => {
  const pool = ensurePool();
  let pgSql = sql;
  const isInsert = /^\s*insert\s+into/i.test(sql);
  const hasNoIdColumn = /insert\s+into\s+group_contacts/i.test(sql);
  if (isInsert && !/returning/i.test(sql) && !hasNoIdColumn) {
    pgSql = `${sql} RETURNING id`;
  }

  const res = await pool.query(convertPlaceholders(pgSql), params);
  return {
    lastID: res.rows?.[0]?.id || 0,
    changes: res.rowCount || 0
  };
};

const exec = async (sql) => {
  const pool = ensurePool();
  return pool.query(sql);
};

const ping = async () => {
  const pool = ensurePool();
  const res = await pool.query('SELECT NOW() as now;');
  return res.rows[0]?.now;
};

const close = async () => {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
};

module.exports = {
  db: pgPool,
  pgPool,
  supabase,
  isPostgres: true,
  get,
  all,
  run,
  exec,
  ping,
  close
};
