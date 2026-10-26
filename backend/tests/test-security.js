const assert = require('assert');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { app } = require('../src/server');
const { initSchema } = require('../src/models/schema');
const { run, get, close } = require('../src/config/db');
const { renderEmail } = require('../src/services/mailMerge');

const PORT = 5092;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;
let server;

async function runSecurityTests() {
  console.log('\n====================================================');
  console.log(' Starting Stage 5: Comprehensive Security Suite');
  console.log('====================================================\n');

  await initSchema();

  // Create two distinct test users to test cross-tenant IDOR
  await run("DELETE FROM users WHERE email IN ('sec_user1@example.com', 'sec_user2@example.com')");

  server = app.listen(PORT);

  try {
    // 1. Setup User 1 & User 2
    console.log('1. Setting up User 1 and User 2 accounts...');
    const user1Res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sec User One',
        email: 'sec_user1@example.com',
        password: 'Password123'
      })
    });
    const user1Data = await user1Res.json();
    assert.strictEqual(user1Data.success, true, 'User 1 signup failed');
    const token1 = user1Data.token;
    const user1Id = user1Data.user.id;

    const user2Res = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sec User Two',
        email: 'sec_user2@example.com',
        password: 'Password123'
      })
    });
    const user2Data = await user2Res.json();
    assert.strictEqual(user2Data.success, true, 'User 2 signup failed');
    const token2 = user2Data.token;
    const user2Id = user2Data.user.id;

    console.log(' User 1 (ID:', user1Id, ') and User 2 (ID:', user2Id, ') ready.');

    // 2. Test Bcrypt ReDoS / Overlong Password rejection
    console.log('\n2. Testing Bcrypt ReDoS Protection (>72 char password)...');
    const longPassword = 'A'.repeat(150);
    const redosRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker',
        email: 'attacker@example.com',
        password: longPassword
      })
    });
    assert.strictEqual(redosRes.status, 400, 'Expected 400 rejection for overlong password');
    console.log(' Overlong password (>72 chars) safely rejected with 400 Bad Request.');

    // 3. Test Email CRLF / Header Injection Stripping
    console.log('\n3. Testing CRLF / Email Header Injection Sanitization...');
    const crlfSubject = 'Normal Subject\r\nBcc: evil@hacker.com\r\nSubject: Injected';
    const rendered = renderEmail({
      subjectTemplate: crlfSubject,
      htmlTemplate: '<p>Hello {{name}}</p>',
      data: { name: 'Alice\r\nCc: victim@target.com' }
    });
    assert.ok(!rendered.subject.includes('\r'), 'CRLF Carriage return was not stripped from subject');
    assert.ok(!rendered.subject.includes('\n'), 'CRLF Line feed was not stripped from subject');
    assert.strictEqual(rendered.subject, 'Normal Subject Bcc: evil@hacker.com Subject: Injected');
    console.log(' CRLF control characters successfully neutralized in mail merge renderer.');

    // 4. Test IDOR Prevention in Group Membership
    console.log('\n4. Testing IDOR Prevention in Groups and Contacts...');
    // Create a contact owned by User 2
    const c2Result = await run(
      "INSERT INTO contacts (user_id, email, name) VALUES (?, 'user2_secret@example.com', 'User2 Private Contact')",
      [user2Id]
    );
    const user2ContactId = c2Result.lastID;

    // Create a group owned by User 1
    const g1Result = await run(
      "INSERT INTO groups (user_id, name) VALUES (?, 'User 1 Group')",
      [user1Id]
    );
    const user1GroupId = g1Result.lastID;

    // User 1 attempts to add User 2's contact to their group
    const idorAddRes = await fetch(`${BASE_URL}/groups/${user1GroupId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({ contactIds: [user2ContactId] })
    });
    const idorAddData = await idorAddRes.json();
    assert.strictEqual(idorAddData.success, true);
    // Verify that the cross-user contact was NOT inserted into group_contacts
    const memberCheck = await get(
      'SELECT * FROM group_contacts WHERE group_id = ? AND contact_id = ?',
      [user1GroupId, user2ContactId]
    );
    assert.strictEqual(memberCheck, undefined, 'IDOR Vulnerability: User 1 was able to link User 2 contact!');
    console.log(' IDOR Attempt Blocked: Unauthorized contact could not be added to foreign group.');

    // 5. Test SSE Progress Stream Authorization
    console.log('\n5. Testing SSE Stream Authorization (CWE-285)...');
    // Create campaign for User 2
    const camp2Result = await run(
      "INSERT INTO campaigns (user_id, title, mode, status, total_recipients) VALUES (?, 'Private Campaign', 'same', 'sending', 1)",
      [user2Id]
    );
    const user2CampId = camp2Result.lastID;

    // User 1 attempts to listen to User 2's campaign SSE stream
    const sseUnauthorizedRes = await fetch(`${BASE_URL}/send/stream/${user2CampId}?token=${token1}`);
    assert.strictEqual(sseUnauthorizedRes.status, 404, 'Expected 404 for unauthorized SSE stream access');
    console.log(' Unauthorized SSE stream access blocked with 404 / access denied.');

    // 6. Test Open Redirect Protection
    console.log('\n6. Testing Open Redirect & Protocol Whitelist (CWE-601)...');
    const fakeToken = 'non_existent_token_12345';
    // Test 6a: Token doesn't exist
    const nonExistentTokenRes = await fetch(`http://127.0.0.1:${PORT}/api/track/click/${fakeToken}?url=https://legit.com`, {
      redirect: 'manual'
    });
    assert.strictEqual(nonExistentTokenRes.status, 404, 'Expected 404 on nonexistent token');

    // Test 6b: Dangerous protocol (javascript:)
    const badProtoRes = await fetch(`http://127.0.0.1:${PORT}/api/track/click/${fakeToken}?url=javascript:alert(1)`, {
      redirect: 'manual'
    });
    assert.strictEqual(badProtoRes.status, 400, 'Expected 400 on dangerous javascript: protocol');
    console.log(' Open redirect safely blocked for dangerous protocols and non-existent tokens.');

    // 7. Test Zip Slip Protection (CWE-22)
    console.log('\n7. Testing Zip Slip (Path Traversal in ZIP extraction)...');
    const zip = new AdmZip();
    zip.addFile('normal.txt', Buffer.from('malicious slip file content'));
    // Craft raw Zip Slip entry containing relative path traversal
    zip.getEntries()[0].entryName = '../../evil_slip.txt';
    const zipBuffer = zip.toBuffer();

    const formData = new FormData();
    formData.append('zipFile', new Blob([zipBuffer], { type: 'application/zip' }), 'malicious_slip.zip');

    const zipRes = await fetch(`${BASE_URL}/upload/zip-attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: formData
    });
    const zipData = await zipRes.json();
    assert.strictEqual(zipRes.status, 400, 'Expected 400 on Zip Slip attempt');
    assert.strictEqual(zipData.success, false, 'Expected success=false on Zip Slip attempt');
    console.log(' Zip Slip attack detected and safely rejected with error:', zipData.error);

    // 8. Test Executable File Upload Whitelist (CWE-434)
    console.log('\n8. Testing File Upload Whitelist (.exe rejection)...');
    const exeFormData = new FormData();
    exeFormData.append('files', new Blob([Buffer.from('MZ...')], { type: 'application/x-msdownload' }), 'malware.exe');

    const uploadRes = await fetch(`${BASE_URL}/upload/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: exeFormData
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 400, 'Expected 400 on .exe upload');
    assert.ok(uploadData.error.includes('not allowed'), 'Expected rejection error message');
    console.log(' Executable upload rejected by strict whitelist policy:', uploadData.error);

    // 9. Test Unsubscribe XSS Escaping
    console.log('\n9. Testing Unsubscribe XSS Escaping...');
    const xssToken = 'xss_test_token_123';
    await run(
      "INSERT INTO campaign_recipients (campaign_id, email, subject, body_html, unsubscribe_token, status) VALUES (?, '<script>alert(1)</script>@test.com', 'Security Test', '<p>Test</p>', ?, 'sent')",
      [user2CampId, xssToken]
    );

    const unsubRes = await fetch(`http://127.0.0.1:${PORT}/unsubscribe/${xssToken}`);
    const unsubHtml = await unsubRes.text();
    assert.ok(!unsubHtml.includes('<script>alert(1)</script>'), 'Unescaped script tag found in HTML response!');
    assert.ok(unsubHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;@test.com'), 'Entity-escaped email expected');
    console.log(' Reflected XSS payload safely escaped to HTML entities.');

    // 10. Test Security Headers
    console.log('\n10. Testing Standard Protection Headers...');
    const healthRes = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    assert.strictEqual(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(healthRes.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.strictEqual(healthRes.headers.get('x-powered-by'), null, 'X-Powered-By header should be removed');
    console.log(' Security headers verified: X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN, X-Powered-By stripped.');

    console.log('\n====================================================');
    console.log(' ALL 10 SECURITY TEST CASES PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } finally {
    // Cleanup
    await run("DELETE FROM users WHERE email IN ('sec_user1@example.com', 'sec_user2@example.com')");
    server.close();
    await close();
  }
}

runSecurityTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n Security test failed:', err);
    if (server) server.close();
    process.exit(1);
  });
