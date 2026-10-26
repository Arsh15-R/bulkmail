const { app } = require('../src/server');
const { initSchema } = require('../src/models/schema');
const { run, close } = require('../src/config/db');

// Lightweight HTTP tester using Node's native fetch or http module
let server;
const PORT = 5099;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

async function runAuthTests() {
  console.log(' Starting Stage 2: Auth Verification Tests...');
  await initSchema();

  // Clean test user if exists
  await run("DELETE FROM users WHERE email = 'auth_tester@example.com'");

  server = app.listen(PORT);

  try {
    // 1. Test Signup
    console.log('1. Testing User Signup...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auth Tester',
        email: 'auth_tester@example.com',
        password: 'securePassword123'
      })
    });
    const signupData = await signupRes.json();
    if (!signupData.success || !signupData.token) {
      throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
    }
    console.log(' Signup successful! Token received.');

    // 2. Test Duplicate Signup
    console.log('2. Testing Duplicate Signup rejection...');
    const dupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auth Tester Again',
        email: 'auth_tester@example.com',
        password: 'securePassword123'
      })
    });
    if (dupRes.status !== 409) {
      throw new Error(`Expected 409 Conflict on duplicate signup, got: ${dupRes.status}`);
    }
    console.log(' Duplicate signup correctly rejected with 409 Conflict.');

    // 3. Test Login
    console.log('3. Testing User Login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'auth_tester@example.com',
        password: 'securePassword123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    const token = loginData.token;
    console.log(' Login successful! JWT verified.');

    // 4. Test Authenticated Profile (/api/auth/me)
    console.log('4. Testing Authenticated /api/auth/me...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (!meData.success || meData.user.email !== 'auth_tester@example.com') {
      throw new Error(`Auth me failed: ${JSON.stringify(meData)}`);
    }
    console.log(' /api/auth/me returned correct user profile:', meData.user.email, 'Daily limit:', meData.user.daily_send_limit);

    // 5. Test Settings Update (dark mode)
    console.log('5. Testing updateSettings (dark mode = 1)...');
    const settingsRes = await fetch(`${BASE_URL}/auth/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ dark_mode: 1 })
    });
    const settingsData = await settingsRes.json();
    if (!settingsData.success || settingsData.user.dark_mode !== 1) {
      throw new Error(`Update settings failed: ${JSON.stringify(settingsData)}`);
    }
    console.log(' User settings updated: dark_mode = 1.');

    // Clean up
    await run("DELETE FROM users WHERE email = 'auth_tester@example.com'");
    console.log(' Test user cleaned up.');

    console.log(' Stage 2: Auth verification passed 100% successfully!\n');
  } finally {
    server.close();
    await close();
  }
}

runAuthTests().then(() => process.exit(0)).catch(err => {
  console.error(' Auth test failed:', err);
  if (server) server.close();
  process.exit(1);
});
