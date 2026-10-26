const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { spawn } = require('child_process');

const runScript = (scriptName) => {
  return new Promise((resolve, reject) => {
    console.log(`\n==============================================`);
    console.log(`>>> Running: ${scriptName}`);
    console.log(`==============================================\n`);

    const child = spawn('node', [path.join(__dirname, scriptName)], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test script ${scriptName} exited with code ${code}`));
      }
    });
  });
};

async function main() {
  const tests = [
    'test-db-schema.js',
    'test-auth.js',
    'test-sending-queue.js',
    'test-backend-full.js',
    'test-security.js'
  ];

  const startTime = Date.now();

  for (const t of tests) {
    await runScript(t);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n==============================================`);
  console.log(` ALL ${tests.length} TEST SUITES PASSED IN ${duration}s!`);
  console.log(`==============================================\n`);
}

main().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
