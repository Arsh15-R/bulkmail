const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

let supabaseInstance = null;

const createSupabaseClient = () => {
  const url = process.env.SUPABASE_URL || supabaseUrl;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    supabaseKey;

  if (!url || !key) {
    return null;
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      realtime: {
        transport: ws,
        timeout: 10000
      },
      global: {
        headers: { 'x-application-name': 'bulkmailer-backend' }
      }
    });
  } catch (err) {
    console.warn('⚠️ Supabase JS Client initialization warning:', err.message);
    return null;
  }
};

supabaseInstance = createSupabaseClient();

const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
};

module.exports = {
  get supabase() {
    return getSupabase();
  },
  getSupabase,
  supabaseUrl,
  supabaseKey
};
