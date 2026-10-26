const { renderTemplate, renderEmail } = require('../src/services/mailMerge');
const emailQueue = require('../src/services/emailQueue');
const { setEmailProvider, MockEmailProvider } = require('../src/services/emailProvider');
const { initSchema } = require('../src/models/schema');
const { run, get, close } = require('../src/config/db');

async function testSendingQueue() {
  console.log(' Starting Stage 3: Sending Logic, Mail Merge & Queue Tests...\n');
  await initSchema();

  // Test 1: Mail Merge Engine
  console.log('1. Testing Mail Merge Engine...');
  const tpl = 'Hello {{name|Valued Customer}}, your order #{{order_id}} is {{status|pending}}. Special note: {{note}}';
  
  // Case A: With values
  const resA = renderTemplate(tpl, { name: 'Alice', order_id: '1001', note: 'Fragile' });
  if (resA.text !== 'Hello Alice, your order #1001 is pending. Special note: Fragile') {
    throw new Error(`Merge failed for Case A: ${resA.text}`);
  }
  console.log(' Template with values and fallback used correctly.');

  // Case B: Missing value without fallback
  const resB = renderTemplate(tpl, { order_id: '1002' });
  if (!resB.missingPlaceholders.includes('note')) {
    throw new Error(`Expected 'note' to be reported in missingPlaceholders, got: ${JSON.stringify(resB.missingPlaceholders)}`);
  }
  if (!resB.text.includes('Valued Customer')) {
    throw new Error('Expected fallback Valued Customer to be applied');
  }
  console.log(' Missing placeholder without fallback detected and flagged.');

  // Case C: HTML Sanitization
  const dirtyHtml = '<p>Hi {{name}}</p><script>alert("hack")</script><a href="http://example.com" onclick="steal()">Click</a>';
  const resC = renderEmail({ htmlTemplate: dirtyHtml, data: { name: 'Bob' } });
  if (resC.html.includes('<script>') || resC.html.includes('onclick')) {
    throw new Error(`Sanitizer failed to strip dangerous script/handlers: ${resC.html}`);
  }
  console.log(' HTML successfully sanitized, dangerous tags & handlers stripped.');

  // Test 2: Email Queue and Fault-Tolerant Processing
  console.log('\n2. Testing Email Queue with Mock Provider...');
  const mockProvider = new MockEmailProvider();
  setEmailProvider(mockProvider);

  // Create test user
  await run("DELETE FROM users WHERE email = 'queue_user@example.com'");
  const userRes = await run(
    "INSERT INTO users (name, email, password_hash, daily_send_limit) VALUES (?, ?, ?, ?)",
    ['Queue User', 'queue_user@example.com', 'hash', 100]
  );
  const userId = userRes.lastID;

  // Insert an unsubscribed contact
  await run(
    "INSERT INTO contacts (user_id, email, name, is_unsubscribed) VALUES (?, ?, ?, 1)",
    [userId, 'unsub@example.com', 'Unsubscribed Contact']
  );

  // Create Campaign
  const campRes = await run(
    "INSERT INTO campaigns (user_id, title, mode, status, total_recipients, tracking_enabled) VALUES (?, ?, ?, 'draft', 3, 1)",
    [userId, 'Queue Test Campaign', 'same']
  );
  const campaignId = campRes.lastID;

  // Insert 3 recipients:
  // Recipient 1: Valid email
  await run(
    `INSERT INTO campaign_recipients (campaign_id, email, name, subject, body_html, status) 
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [campaignId, 'alice@example.com', 'Alice', 'Hello Alice', '<p>Welcome Alice</p>']
  );

  // Recipient 2: Simulated SMTP Failure (fail@example.com triggers 550 error in MockProvider)
  await run(
    `INSERT INTO campaign_recipients (campaign_id, email, name, subject, body_html, status) 
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [campaignId, 'fail@example.com', 'Bad Email', 'Hello Bad', '<p>Will fail</p>']
  );

  // Recipient 3: Unsubscribed contact (should be skipped!)
  await run(
    `INSERT INTO campaign_recipients (campaign_id, email, name, subject, body_html, status) 
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [campaignId, 'unsub@example.com', 'Unsub', 'Hello Unsub', '<p>Will skip</p>']
  );

  console.log('Enqueuing campaign #', campaignId);
  const events = [];
  emailQueue.on('recipient_progress', (data) => {
    events.push(data);
    console.log(` -> Event: ${data.email} | Status: ${data.status} | Reason/Error: ${data.reason || data.error || 'OK'}`);
  });

  // Enqueue with delay 50ms for test
  await emailQueue.enqueueCampaign(campaignId, userId, { delayMs: 50, isDryRun: false });

  // Wait for queue to finish processing
  while (emailQueue.isProcessing || emailQueue.queue.length > 0) {
    await new Promise(r => setTimeout(r, 50));
  }
  // Extra pause for DB commit
  await new Promise(r => setTimeout(r, 100));

  // Verify DB state
  const updatedCampaign = await get("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
  console.log(`Campaign completed! Sent: ${updatedCampaign.sent_count}, Failed/Bounced: ${updatedCampaign.failed_count + updatedCampaign.bounced_count}, Skipped: ${updatedCampaign.skipped_count}`);

  if (updatedCampaign.sent_count !== 1) {
    throw new Error(`Expected 1 sent email, got: ${updatedCampaign.sent_count}`);
  }
  if (updatedCampaign.bounced_count !== 1 && updatedCampaign.failed_count !== 1) {
    throw new Error(`Expected 1 failed/bounced email, got: failed=${updatedCampaign.failed_count}, bounced=${updatedCampaign.bounced_count}`);
  }
  if (updatedCampaign.skipped_count !== 1) {
    throw new Error(`Expected 1 skipped email, got: ${updatedCampaign.skipped_count}`);
  }
  if (updatedCampaign.status !== 'completed') {
    throw new Error(`Expected campaign status to be 'completed', got: ${updatedCampaign.status}`);
  }

  console.log(' Verified: Single failure DID NOT stop the remaining batch!');
  console.log(' Verified: Unsubscribed recipient was correctly skipped!');
  console.log(' Stage 3: Sending logic, Mail Merge & Queue verified 100% successfully!\n');

  // Cleanup
  await run("DELETE FROM campaigns WHERE id = ?", [campaignId]);
  await run("DELETE FROM contacts WHERE user_id = ?", [userId]);
  await run("DELETE FROM users WHERE id = ?", [userId]);

  await close();
  process.exit(0);
}

testSendingQueue().catch(err => {
  console.error(' Stage 3 test failed:', err);
  process.exit(1);
});
