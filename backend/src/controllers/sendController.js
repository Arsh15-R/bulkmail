const validator = require('validator');
const crypto = require('crypto');
const { get, run, all } = require('../config/db');
const { renderEmail } = require('../services/mailMerge');
const emailQueue = require('../services/emailQueue');
const { getEmailProvider } = require('../services/emailProvider');

/**
 * Preview endpoint: validates and renders emails before sending.
 */
const previewCampaign = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mode = 'same', // same, single, merge, custom
      subject = '',
      body_html = '',
      body_text = '',
      recipients = [],
      cc,
      bcc,
      replyTo,
      attachments = []
    } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one recipient is required.' });
    }

    // Fetch existing unsubscribed & bounced emails for this user to warn beforehand
    const unsubscribedRows = await all(
      'SELECT email FROM contacts WHERE user_id = ? AND is_unsubscribed = 1',
      [userId]
    );
    const bouncedRows = await all(
      'SELECT email FROM contacts WHERE user_id = ? AND is_bounced = 1',
      [userId]
    );

    const unsubscribedSet = new Set(unsubscribedRows.map(r => r.email.toLowerCase()));
    const bouncedSet = new Set(bouncedRows.map(r => r.email.toLowerCase()));

    const renderedList = [];
    let validCount = 0;
    let invalidCount = 0;
    let warningCount = 0;
    let unsubscribedCount = 0;
    let bouncedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const item = recipients[i];
      let toEmail = '';
      let toName = '';
      let rowData = {};
      let rowSubject = subject;
      let rowHtml = body_html;
      let rowText = body_text;
      let rowCc = item.cc || cc || '';
      let rowBcc = item.bcc || bcc || '';
      let rowReplyTo = item.replyTo || replyTo || '';
      let rowAttachments = [...attachments, ...(item.attachments || [])];

      if (typeof item === 'string') {
        toEmail = item.trim();
      } else if (typeof item === 'object' && item !== null) {
        toEmail = (item.email || item.to || '').trim();
        toName = (item.name || '').trim();
        rowData = { ...item };
      }

      const cleanEmail = toEmail.toLowerCase();
      const isValidEmail = validator.isEmail(cleanEmail);
      const isUnsubscribed = unsubscribedSet.has(cleanEmail);
      const isBounced = bouncedSet.has(cleanEmail);

      if (isUnsubscribed) unsubscribedCount++;
      if (isBounced) bouncedCount++;

      let missingPlaceholders = [];
      let finalSubject = rowSubject;
      let finalHtml = rowHtml;
      let finalText = rowText;

      if (mode === 'merge') {
        const rendered = renderEmail({
          subjectTemplate: rowSubject,
          htmlTemplate: rowHtml,
          textTemplate: rowText,
          data: rowData
        });
        finalSubject = rendered.subject;
        finalHtml = rendered.html;
        finalText = rendered.text;
        missingPlaceholders = rendered.missingPlaceholders;
      } else if (mode === 'custom') {
        finalSubject = item.subject || rowSubject;
        finalHtml = item.body_html || item.html || rowHtml;
        finalText = item.body_text || item.text || rowText;
      }

      const hasWarnings = !isValidEmail || isUnsubscribed || isBounced || missingPlaceholders.length > 0;

      if (isValidEmail) validCount++;
      else invalidCount++;

      if (hasWarnings) warningCount++;

      renderedList.push({
        index: i,
        email: cleanEmail,
        name: toName || rowData.name || '',
        subject: finalSubject,
        html: finalHtml,
        text: finalText,
        cc: rowCc,
        bcc: rowBcc,
        replyTo: rowReplyTo,
        attachments: rowAttachments,
        isValidEmail,
        isUnsubscribed,
        isBounced,
        missingPlaceholders,
        hasWarnings
      });
    }

    return res.json({
      success: true,
      summary: {
        total: recipients.length,
        validCount,
        invalidCount,
        warningCount,
        unsubscribedCount,
        bouncedCount
      },
      previews: renderedList
    });
  } catch (err) {
    console.error('previewCampaign error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate campaign preview.' });
  }
};

/**
 * List Cleanup: Detects duplicates, invalid syntax, unsubscribed and bounced emails.
 */
const cleanupList = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipients = [] } = req.body;

    if (!Array.isArray(recipients)) {
      return res.status(400).json({ success: false, error: 'Recipients array is required.' });
    }

    const unsubscribedRows = await all(
      'SELECT email FROM contacts WHERE user_id = ? AND is_unsubscribed = 1',
      [userId]
    );
    const bouncedRows = await all(
      'SELECT email FROM contacts WHERE user_id = ? AND is_bounced = 1',
      [userId]
    );

    const unsubSet = new Set(unsubscribedRows.map(r => r.email.toLowerCase()));
    const bounceSet = new Set(bouncedRows.map(r => r.email.toLowerCase()));

    const seen = new Set();
    const cleanList = [];
    const duplicates = [];
    const invalidEmails = [];
    const unsubscribed = [];
    const bounced = [];

    for (const r of recipients) {
      let email = '';
      if (typeof r === 'string') email = r.trim().toLowerCase();
      else if (typeof r === 'object' && r !== null) email = (r.email || r.to || '').trim().toLowerCase();

      if (!email || !validator.isEmail(email)) {
        invalidEmails.push(r);
        continue;
      }

      if (seen.has(email)) {
        duplicates.push(r);
        continue;
      }

      if (unsubSet.has(email)) {
        unsubscribed.push(r);
        continue;
      }

      if (bounceSet.has(email)) {
        bounced.push(r);
        continue;
      }

      seen.add(email);
      cleanList.push(r);
    }

    return res.json({
      success: true,
      cleanList,
      stats: {
        originalTotal: recipients.length,
        cleanTotal: cleanList.length,
        duplicatesCount: duplicates.length,
        invalidCount: invalidEmails.length,
        unsubscribedCount: unsubscribed.length,
        bouncedCount: bounced.length
      },
      details: {
        duplicates,
        invalidEmails,
        unsubscribed,
        bounced
      }
    });
  } catch (err) {
    console.error('cleanupList error:', err);
    return res.status(500).json({ success: false, error: 'Failed to clean recipient list.' });
  }
};

/**
 * Send campaign immediately (or enqueues into background email queue).
 */
const sendCampaignNow = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title = 'Campaign',
      mode = 'same',
      subject = '',
      body_html = '',
      body_text = '',
      recipients = [],
      isDryRun = false,
      trackingEnabled = true,
      delayMs = 500,
      settings = {}
    } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No recipients provided.' });
    }

    const settingsJson = JSON.stringify({
      ...settings,
      delayMs
    });

    // 1. Create Campaign row
    const campResult = await run(
      `INSERT INTO campaigns 
       (user_id, title, mode, subject, body_html, body_text, status, total_recipients, is_dry_run, tracking_enabled, settings_json) 
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        userId,
        title.trim() || `Campaign ${new Date().toLocaleDateString()}`,
        mode,
        subject,
        body_html,
        body_text,
        recipients.length,
        isDryRun ? 1 : 0,
        trackingEnabled ? 1 : 0,
        settingsJson
      ]
    );

    const campaignId = campResult.lastID;

    // 2. Insert Recipients
    for (const r of recipients) {
      const email = (r.email || r.to || '').trim();
      const name = (r.name || '').trim();
      const rSubject = r.subject || subject;
      const rHtml = r.html || r.body_html || body_html;
      const rText = r.text || r.body_text || body_text;
      const rCc = r.cc || settings.cc || null;
      const rBcc = r.bcc || settings.bcc || null;
      const rReplyTo = r.replyTo || settings.replyTo || null;
      const rAttachments = JSON.stringify(r.attachments || settings.attachments || []);
      const rMergeData = r.mergeData ? JSON.stringify(r.mergeData) : null;
      const trackingToken = crypto.randomBytes(20).toString('hex');
      const unsubscribeToken = crypto.randomBytes(20).toString('hex');

      await run(
        `INSERT INTO campaign_recipients 
         (campaign_id, email, name, subject, body_html, body_text, cc, bcc, reply_to, attachments_json, merge_data_json, tracking_token, unsubscribe_token, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          campaignId,
          email,
          name,
          rSubject,
          rHtml,
          rText,
          rCc,
          rBcc,
          rReplyTo,
          rAttachments,
          rMergeData,
          trackingToken,
          unsubscribeToken
        ]
      );
    }

    // 3. Enqueue campaign in background queue
    await emailQueue.enqueueCampaign(campaignId, userId, { isDryRun, delayMs });

    return res.status(201).json({
      success: true,
      message: isDryRun ? 'Dry-run campaign queued.' : 'Campaign queued for delivery.',
      campaignId,
      totalRecipients: recipients.length
    });
  } catch (err) {
    console.error('sendCampaignNow error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate campaign delivery.' });
  }
};

/**
 * Send test email to logged in user.
 */
const sendTestEmail = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { subject = 'Test Email', body_html = '<p>Test email body</p>', body_text = 'Test email body' } = req.body;

    const provider = getEmailProvider();
    await provider.sendMail({
      to: userEmail,
      subject: `[TEST] ${subject}`,
      html: body_html,
      text: body_text
    });

    return res.json({
      success: true,
      message: `Test email successfully sent to ${userEmail}.`
    });
  } catch (err) {
    console.error('sendTestEmail error:', err);
    return res.status(500).json({ success: false, error: `Failed to send test email: ${err.message}` });
  }
};

/**
 * Server-Sent Events (SSE) progress stream for a campaign.
 * Securely enforces user ownership before establishing the stream.
 */
const streamCampaignProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId } = req.params;

    // Verify campaign ownership to prevent unauthorized SSE eavesdropping
    const campaign = await get('SELECT id FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, userId]);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found or access denied.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onProgress = (data) => {
      if (String(data.campaignId) === String(campaignId)) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    const onCompleted = (data) => {
      if (String(data.campaignId) === String(campaignId)) {
        res.write(`event: completed\ndata: ${JSON.stringify(data)}\n\n`);
        res.end();
      }
    };

    emailQueue.on('recipient_progress', onProgress);
    emailQueue.on('campaign_completed', onCompleted);

    req.on('close', () => {
      emailQueue.removeListener('recipient_progress', onProgress);
      emailQueue.removeListener('campaign_completed', onCompleted);
    });
  } catch (err) {
    console.error('streamCampaignProgress error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Failed to establish progress stream.' });
    }
  }
};

/**
 * Verify SMTP credentials and connection to Gmail/SMTP server
 */
const verifySmtpConnection = async (req, res) => {
  try {
    const provider = getEmailProvider();
    const result = await provider.verify();
    return res.json({
      success: result.ok,
      message: result.message,
      configuredUser: process.env.SMTP_USER || null,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      provider: process.env.EMAIL_PROVIDER || 'mock'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  previewCampaign,
  cleanupList,
  sendCampaignNow,
  sendTestEmail,
  streamCampaignProgress,
  verifySmtpConnection
};
