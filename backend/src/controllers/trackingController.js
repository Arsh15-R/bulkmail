const { get, run } = require('../config/db');

// 1x1 transparent GIF buffer
const TRANSPARENT_1X1_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const trackOpen = async (req, res) => {
  const { token } = req.params;

  try {
    const recipient = await get('SELECT * FROM campaign_recipients WHERE tracking_token = ?', [token]);

    if (recipient) {
      if (!recipient.is_opened) {
        await run(
          'UPDATE campaign_recipients SET is_opened = 1, opened_at = CURRENT_TIMESTAMP WHERE id = ?',
          [recipient.id]
        );
        await run('UPDATE campaigns SET opened_count = opened_count + 1 WHERE id = ?', [recipient.campaign_id]);
      }

      // Record event log
      await run(
        'INSERT INTO tracking_events (campaign_id, recipient_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [
          recipient.campaign_id,
          recipient.id,
          'open',
          req.ip || req.connection.remoteAddress,
          req.headers['user-agent'] || ''
        ]
      );
    }
  } catch (err) {
    console.error('trackOpen error:', err);
  }

  // Always return transparent gif with no-cache headers
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  return res.end(TRANSPARENT_1X1_GIF);
};

const trackClick = async (req, res) => {
  const { token } = req.params;
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing target URL.');
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    const parsed = new URL(targetUrl);
    // Strict protocol whitelist: only allow http and https to prevent javascript:, data:, file: attacks
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).send('Invalid or dangerous URL protocol.');
    }
  } catch (e) {
    return res.status(400).send('Malformed redirect URL.');
  }

  try {
    const recipient = await get('SELECT * FROM campaign_recipients WHERE tracking_token = ?', [token]);

    if (!recipient) {
      // Prevent open redirect if token is invalid or non-existent
      return res.status(404).send('Invalid tracking token.');
    }

    if (!recipient.is_clicked) {
      await run(
        'UPDATE campaign_recipients SET is_clicked = 1, clicked_at = CURRENT_TIMESTAMP WHERE id = ?',
        [recipient.id]
      );
      await run('UPDATE campaigns SET clicked_count = clicked_count + 1 WHERE id = ?', [recipient.campaign_id]);
    }

    await run(
      'INSERT INTO tracking_events (campaign_id, recipient_id, event_type, ip_address, user_agent, target_url) VALUES (?, ?, ?, ?, ?, ?)',
      [
        recipient.campaign_id,
        recipient.id,
        'click',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || '',
        targetUrl
      ]
    );

    // Safe redirect
    return res.redirect(302, targetUrl);
  } catch (err) {
    console.error('trackClick error:', err);
    return res.status(500).send('An error occurred during redirect.');
  }
};

const handleUnsubscribe = async (req, res) => {
  const { token } = req.params;

  try {
    const recipient = await get('SELECT * FROM campaign_recipients WHERE unsubscribe_token = ?', [token]);

    if (!recipient) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Unsubscribe</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin:0; background: #f8fafc;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 450px;">
            <h2 style="color: #ef4444; margin-bottom: 12px;">Invalid Link</h2>
            <p style="color: #64748b;">The unsubscribe link is invalid or has expired.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Mark contact unsubscribed if exists, or insert contact marked unsubscribed
    const campaign = await get('SELECT user_id FROM campaigns WHERE id = ?', [recipient.campaign_id]);
    const userId = campaign ? campaign.user_id : null;

    if (userId && recipient.email) {
      await run(
        `INSERT INTO contacts (user_id, email, name, is_unsubscribed, unsubscribed_at) 
         VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP) 
         ON CONFLICT(user_id, email) DO UPDATE SET is_unsubscribed = 1, unsubscribed_at = CURRENT_TIMESTAMP`,
        [userId, recipient.email.toLowerCase(), recipient.name || null]
      );
    }

    const escapeHtml = (str) => {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed Successfully</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 80vh; margin:0; background: #f8fafc;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; max-width: 450px;">
          <div style="width: 56px; height: 56px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 28px;">✓</div>
          <h2 style="color: #1e293b; margin-bottom: 12px;">You Have Been Unsubscribed</h2>
          <p style="color: #64748b; line-height: 1.5; margin-bottom: 24px;">
            <strong>${escapeHtml(recipient.email)}</strong> will no longer receive marketing or campaign emails from this sender.
          </p>
          <p style="font-size: 13px; color: #94a3b8;">You may close this window safely.</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('handleUnsubscribe error:', err);
    return res.status(500).send('An error occurred processing your request.');
  }
};

module.exports = {
  trackOpen,
  trackClick,
  handleUnsubscribe
};
