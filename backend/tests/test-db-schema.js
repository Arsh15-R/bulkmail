const { initSchema } = require('../src/models/schema');
const { get, all, run, close } = require('../src/config/db');

async function testSchema() {
  console.log('Testing Database Schema Initialization...');
  await initSchema();
  console.log('Schema successfully initialized.');

  // Verify all tables were created
  const tables = await all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  const tableNames = tables.map(t => t.name);
  console.log('Created Tables:', tableNames);

  const requiredTables = [
    'users', 'groups', 'contacts', 'group_contacts', 'templates',
    'campaigns', 'campaign_recipients', 'tracking_events',
    'scheduled_jobs', 'drafts', 'daily_send_logs'
  ];

  for (const table of requiredTables) {
    if (!tableNames.includes(table)) {
      throw new Error(`Missing expected table: ${table}`);
    }
  }

  // Quick sanity insert and read
  const testUser = await run(
    "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
    ['Test Admin', 'admin@example.com', 'hashed_pw_here']
  );
  console.log('Inserted test user ID:', testUser.lastID);

  const readUser = await get("SELECT * FROM users WHERE id = ?", [testUser.lastID]);
  console.log('Fetched user:', readUser.email, readUser.name, 'Daily Limit:', readUser.daily_send_limit);

  // Clean up test user
  await run("DELETE FROM users WHERE id = ?", [testUser.lastID]);
  console.log('Cleaned up test user.');

  console.log(' Stage 1: Database schema verification passed successfully!');
  await close();
  process.exit(0);
}

testSchema().catch(err => {
  console.error('Schema test failed:', err);
  process.exit(1);
});
