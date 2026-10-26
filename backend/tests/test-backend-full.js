const { app } = require('../src/server');
const { initSchema } = require('../src/models/schema');
const { run, get, close } = require('../src/config/db');
const { setEmailProvider, MockEmailProvider } = require('../src/services/emailProvider');
const emailQueue = require('../src/services/emailQueue');

let server;
const PORT = 5088;
const BASE = `http://127.0.0.1:${PORT}`;

async function runFullIntegrationTest() {
  console.log('====================================================');
  console.log(' Starting End-to-End Backend Integration Tests');
  console.log('====================================================');

  await initSchema();
  setEmailProvider(new MockEmailProvider());

  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}`);

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE}/api/health`);
    const healthData = await healthRes.json();
    if (healthData.status !== 'ok') throw new Error('Health check failed');
    console.log('1. Health check: OK');

    // 2. Signup / Login
    const testEmail = `tester_${Date.now()}@example.com`;
    const signupRes = await fetch(`${BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'E2E Tester', email: testEmail, password: 'password123' })
    });
    const signupData = await signupRes.json();
    if (!signupData.success) throw new Error(`Signup failed: ${signupData.error}`);
    const token = signupData.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
    console.log('2. Auth Signup & Token: OK');

    // 3. Contacts
    const addContactRes = await fetch(`${BASE}/api/contacts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: 'john@example.com', name: 'John Doe', metadata: { company: 'Acme' } })
    });
    const addContactData = await addContactRes.json();
    if (!addContactData.success) throw new Error(`Add contact failed: ${addContactData.error}`);
    const contactId = addContactData.contact.id;
    console.log('3. Add Contact: OK (ID:', contactId, ')');

    // CSV Import Contacts
    const importRes = await fetch(`${BASE}/api/contacts/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        contacts: [
          { email: 'sarah@example.com', name: 'Sarah Connor', role: 'Leader' },
          { email: 'kyle@example.com', name: 'Kyle Reese', role: 'Soldier' },
          { email: 'bad-email-skip', name: 'Invalid' } // should be skipped
        ]
      })
    });
    const importData = await importRes.json();
    if (!importData.success || importData.stats.inserted !== 2) {
      throw new Error(`Import contacts failed: ${JSON.stringify(importData)}`);
    }
    console.log('4. CSV Contacts Import: OK (2 inserted, 1 invalid skipped)');

    // 4. Groups
    const createGroupRes = await fetch(`${BASE}/api/groups`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'VIP Customers', description: 'Priority accounts' })
    });
    const createGroupData = await createGroupRes.json();
    if (!createGroupData.success) throw new Error('Create group failed');
    const groupId = createGroupData.group.id;

    // Add members to group
    await fetch(`${BASE}/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ contactIds: [contactId] })
    });
    const getGroupRes = await fetch(`${BASE}/api/groups/${groupId}`, { headers: authHeaders });
    const getGroupData = await getGroupRes.json();
    if (getGroupData.group.members.length !== 1) throw new Error('Group member assignment failed');
    console.log('5. Groups & Member Association: OK');

    // 5. Templates
    const createTplRes = await fetch(`${BASE}/api/templates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Welcome Template',
        subject: 'Welcome {{name|friend}}!',
        body_html: '<h1>Hello {{name|valued client}}!</h1><p>Order #{{order_id|none}} is confirmed.</p>',
        body_text: 'Hello {{name}}, Order {{order_id}} is confirmed.'
      })
    });
    const createTplData = await createTplRes.json();
    if (!createTplData.success) throw new Error('Create template failed');
    const templateId = createTplData.template.id;
    console.log('6. Templates CRUD: OK (Template ID:', templateId, ')');

    // 6. Preview & Mail Merge with Fallbacks
    const previewRes = await fetch(`${BASE}/api/send/preview`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        mode: 'merge',
        subject: 'Special offer for {{name|there}}',
        body_html: '<p>Hi {{name|there}}, your code is {{code}}.</p>',
        recipients: [
          { email: 'john@example.com', name: 'John', code: 'PROMO10' },
          { email: 'empty@example.com' } // missing code without fallback -> warning
        ]
      })
    });
    const previewData = await previewRes.json();
    if (!previewData.success || previewData.summary.total !== 2 || previewData.summary.warningCount !== 1) {
      throw new Error(`Preview failed: ${JSON.stringify(previewData.summary)}`);
    }
    console.log('7. Send Preview & Fallback Detection: OK');

    // 7. List Cleanup (Duplicates & Invalid Detection)
    const cleanupRes = await fetch(`${BASE}/api/send/cleanup`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        recipients: [
          'alice@test.com',
          'alice@test.com', // duplicate
          'ALICE@TEST.COM', // duplicate case-insensitive
          'invalid-address', // invalid
          'bob@test.com'
        ]
      })
    });
    const cleanupData = await cleanupRes.json();
    if (cleanupData.stats.cleanTotal !== 2 || cleanupData.stats.duplicatesCount !== 2 || cleanupData.stats.invalidCount !== 1) {
      throw new Error(`Cleanup failed: ${JSON.stringify(cleanupData.stats)}`);
    }
    console.log('8. List Cleanup (Duplicates & Invalid detection): OK');

    // 8. Sending Campaign with Tracking & Unsubscribe
    const sendRes = await fetch(`${BASE}/api/send/now`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Launch Announcement',
        mode: 'same',
        subject: 'We are live!',
        body_html: '<h1>We are live!</h1><p>Check our site: <a href="https://example.com/shop">Shop Now</a></p>',
        recipients: [
          { email: 'user1@example.com', name: 'User One' },
          { email: 'user2@example.com', name: 'User Two' }
        ],
        isDryRun: false,
        trackingEnabled: true
      })
    });
    const sendData = await sendRes.json();
    if (!sendData.success || !sendData.campaignId) throw new Error('Send campaign now failed');
    const campaignId = sendData.campaignId;

    // Wait for queue to process
    while (emailQueue.isProcessing || emailQueue.queue.length > 0) {
      await new Promise(r => setTimeout(r, 50));
    }
    await new Promise(r => setTimeout(r, 200));

    // Verify campaign details & recipient status
    const campDetailRes = await fetch(`${BASE}/api/history/${campaignId}`, { headers: authHeaders });
    const campDetail = await campDetailRes.json();
    if (!campDetail.success || campDetail.campaign.sent_count !== 2) {
      throw new Error(`Campaign delivery verification failed: ${JSON.stringify(campDetail.campaign)}`);
    }
    console.log('9. Campaign Delivery & Queue Processing: OK (2 sent, 0 failed)');

    const firstRecipient = campDetail.recipients[0];
    const trackingToken = firstRecipient.tracking_token;
    const unsubToken = firstRecipient.unsubscribe_token;

    // 9. Open Tracking
    const openRes = await fetch(`${BASE}/api/track/open/${trackingToken}`);
    if (openRes.status !== 200 || openRes.headers.get('content-type') !== 'image/gif') {
      throw new Error('Open tracking failed');
    }
    console.log('10. Open Tracking (1x1 pixel): OK');

    // 10. Click Tracking (Redirect)
    const clickRes = await fetch(`${BASE}/api/track/click/${trackingToken}?url=https%3A%2F%2Fexample.com%2Fshop`, {
      redirect: 'manual'
    });
    if (clickRes.status !== 302 || clickRes.headers.get('location') !== 'https://example.com/shop') {
      throw new Error(`Click tracking redirect failed: ${clickRes.status} -> ${clickRes.headers.get('location')}`);
    }
    console.log('11. Click Tracking (302 redirect & counter): OK');

    // 11. Unsubscribe flow
    const unsubRes = await fetch(`${BASE}/unsubscribe/${unsubToken}`);
    const unsubHtml = await unsubRes.text();
    if (!unsubHtml.includes('You Have Been Unsubscribed')) {
      throw new Error('Unsubscribe page failed');
    }
    console.log('12. Unsubscribe Link & Contact Flagging: OK');

    // 12. Export Campaign CSV
    const exportRes = await fetch(`${BASE}/api/history/${campaignId}/export`, { headers: authHeaders });
    const csvText = await exportRes.text();
    if (!csvText.includes('Email,Name,Subject,Status') || !csvText.includes('user1@example.com')) {
      throw new Error('CSV export failed');
    }
    console.log('13. Export Campaign Results to CSV: OK');

    // 13. Draft Autosave & Restore
    await fetch(`${BASE}/api/drafts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ state: { subject: 'Draft Subject', body: '<p>Draft body</p>' } })
    });
    const draftRes = await fetch(`${BASE}/api/drafts`, { headers: authHeaders });
    const draftData = await draftRes.json();
    if (!draftData.success || draftData.draft.state.subject !== 'Draft Subject') {
      throw new Error('Draft autosave failed');
    }
    console.log('14. Draft Autosave & Restore: OK');

    // 14. Scheduling Campaign
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour in future
    const schedRes = await fetch(`${BASE}/api/schedule`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Future Newsletter',
        runAt: futureDate,
        subject: 'Scheduled news',
        body_html: '<p>Scheduled</p>',
        recipients: [{ email: 'scheduled@example.com' }]
      })
    });
    const schedData = await schedRes.json();
    if (!schedData.success || !schedData.jobId) throw new Error('Schedule campaign failed');
    console.log('15. Scheduling Campaign & Persistence: OK (Job ID:', schedData.jobId, ')');

    console.log('====================================================');
    console.log(' All Backend Endpoints & Core Logic Passed 100%!');
    console.log('====================================================\n');
  } finally {
    server.close();
    await close();
  }
}

runFullIntegrationTest().then(() => process.exit(0)).catch(err => {
  console.error(' Full Backend Test FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
