const { run, all } = require('../src/config/db');

async function updateSchema() {
  console.log('Migrating users table for Google OAuth...');
  try {
    await run('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
    console.log('✓ password_hash is now optional (DROP NOT NULL)');
  } catch (err) {
    console.log('Notice on password_hash:', err.message);
  }

  try {
    await run('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT');
    console.log('✓ google_id column added');
  } catch (err) {
    console.log('Notice on google_id:', err.message);
  }

  try {
    await run('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT');
    console.log('✓ avatar_url column added');
  } catch (err) {
    console.log('Notice on avatar_url:', err.message);
  }

  try {
    await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local'");
    console.log('✓ auth_provider column added');
  } catch (err) {
    console.log('Notice on auth_provider:', err.message);
  }

  const columns = await all(
    "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position ASC"
  );
  console.log('Current users schema columns:');
  console.table(columns);
  process.exit(0);
}

updateSchema().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
