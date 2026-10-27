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

let pgPool = null;

const createPgPool = (connectionString) => {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });

  // Attach safe error listener to prevent unhandled process crashes from idle client drops
  pool.on('error', (err) => {
    console.error('⚠️ [Supabase DB Pool Error]:', err.message);
  });

  return pool;
};

const initialConn = getConnectionString();
if (initialConn) {
  pgPool = createPgPool(initialConn);
} else {
  console.warn(
    '⚠️ [Supabase DB] DATABASE_URL not yet set in backend/.env.\n' +
    '   Please configure DATABASE_URL=postgresql://postgres.pkofxyqunqjwwffivfru:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
  );
}

// Convert standard '?' placeholders to PostgreSQL '$1, $2, ...' for Supabase PostgreSQL
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
  if (!pgPool || pgPool.ending || pgPool.ended) {
    const currentConn = getConnectionString();
    if (!currentConn) {
      throw new Error(
        'Supabase PostgreSQL database is not configured. Please set DATABASE_URL in backend/.env'
      );
    }
    pgPool = createPgPool(currentConn);
  }
  return pgPool;
};

/**
 * Checks whether an error is transient and can be retried safely.
 */
const isRetryableError = (err) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toString();
  return (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === '57P01' || // terminating connection due to administrator command
    code === '57P02' || // crash shutdown
    code === '57P03' || // cannot connect now
    code === '08006' || // connection failure
    code === '08001' || // unable to establish connection
    code === '08004' || // rejected connection
    msg.includes('connection terminated') ||
    msg.includes('connection closed') ||
    msg.includes('timeout') ||
    msg.includes('socket closed') ||
    msg.includes('client has encountered a connection error')
  );
};

/**
 * Executes a PostgreSQL query with automatic retries for transient pool / network errors.
 */
const queryWithRetry = async (sql, params = [], maxRetries = 2) => {
  let attempt = 0;
  while (true) {
    attempt++;
    const pool = ensurePool();
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (attempt <= maxRetries && isRetryableError(err)) {
        console.warn(
          `⚠️ [Supabase DB] Transient query error (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying...`
        );
        if (
          err.message &&
          (err.message.includes('terminat') || err.message.includes('connection error'))
        ) {
          try {
            if (pgPool && !pgPool.ended) await pgPool.end();
          } catch (_) {}
          pgPool = null;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        continue;
      }
      throw err;
    }
  }
};

const get = async (sql, params = []) => {
  const res = await queryWithRetry(convertPlaceholders(sql), params);
  return res.rows[0];
};

const all = async (sql, params = []) => {
  const res = await queryWithRetry(convertPlaceholders(sql), params);
  return res.rows || [];
};

const run = async (sql, params = []) => {
  let pgSql = sql;
  const isInsert = /^\s*insert\s+into/i.test(sql);
  const hasNoIdColumn = /insert\s+into\s+group_contacts/i.test(sql);
  if (isInsert && !/returning/i.test(sql) && !hasNoIdColumn) {
    pgSql = `${sql} RETURNING id`;
  }

  const res = await queryWithRetry(convertPlaceholders(pgSql), params);
  return {
    lastID: res.rows?.[0]?.id || 0,
    changes: res.rowCount || 0
  };
};

const exec = async (sql) => {
  return queryWithRetry(sql);
};

const ping = async () => {
  const res = await queryWithRetry('SELECT NOW() as now;');
  return res.rows[0]?.now;
};

const close = async () => {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
};

module.exports = {
  get db() {
    return ensurePool();
  },
  get pgPool() {
    return ensurePool();
  },
  supabase,
  isPostgres: true,
  get,
  all,
  run,
  exec,
  ping,
  close
};
