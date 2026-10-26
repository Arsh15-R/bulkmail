const { initSchema } = require('../src/models/schema');
const { get, all, run, close } = require('../src/config/db');

async function testSchema() {
  console.log('Testing Supabase PostgreSQL Schema Initialization...');
  await initSchema();
  console.log('Schema successfully initialized.');

  // Verify all tables were created in Supabase public schema
  const tables = await all(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  const tableNames = tables.map((t) => t.name);
  console.log('Created Tables:', tableNames);

  const requiredTables = [
    'users',
    'groups',
    'contacts',
    'group_contacts',
    'templates',
    'campaigns',
    'campaign_recipients',
    'tracking_events',
    'scheduled_jobs',
    'drafts',
    'daily_send_logs'
  ];

  for (const table of requiredTables) {
    if (!tableNames.includes(table)) {
      throw new Error(`Missing expected table in Supabase: ${table}`);
    }
  }

  // Quick sanity insert and read
  const testUser = await run(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    ['Test Admin', 'admin@example.com', 'hashed_pw_here']
  );
  console.log('Inserted test user ID:', testUser.lastID);

  const readUser = await get('SELECT * FROM users WHERE id = ?', [testUser.lastID]);
  console.log('Fetched user:', readUser.email, readUser.name, 'Daily Limit:', readUser.daily_send_limit);

  // Clean up test user
  await run('DELETE FROM users WHERE id = ?', [testUser.lastID]);
  console.log('Cleaned up test user.');

  console.log(' Stage 1: Supabase database schema verification passed successfully!');
  await close();
  process.exit(0);
}

testSchema().catch((err) => {
  console.error('Supabase schema test failed:', err);
  process.exit(1);
});
