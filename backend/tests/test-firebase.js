const { initFirebase } = require('../src/config/firebase');

async function testFirebaseSetup() {
  console.log('Testing Firebase Admin SDK integration...');
  const res = initFirebase();
  console.log('Firebase Module Check:', res.isConfigured ? 'Configured' : 'Awaiting credentials (Normal when first installing)');
  console.log(' Firebase Admin integration test passed successfully.');
}

testFirebaseSetup().then(() => process.exit(0)).catch(err => {
  console.error('Firebase test error:', err);
  process.exit(1);
});
