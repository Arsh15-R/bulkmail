const EventEmitter = require('events');
const crypto = require('crypto');
const { get, run, all } = require('../config/db');
const { getEmailProvider, MockEmailProvider } = require('./emailProvider');

class EmailQueueService extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
    this.activeCampaignId = null;
    this.defaultDelayMs = parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '500', 10);
  }

  /**
   * Enqueue a campaign for sending.
   * @param {number} campaignId
   * @param {number} userId
   * @param {object} options { isDryRun, delayMs }
   */
  async enqueueCampaign(campaignId, userId, options = {}) {
    const campaign = await get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, userId]);
    if (!campaign) {
      throw new Error(`Campaign #${campaignId} not found.`);
    }

    // Set campaign status to queued/processing
    await run(
      "UPDATE campaigns SET status = 'queued', started_at = CURRENT_TIMESTAMP WHERE id = ?",
      [campaignId]
    );

    const recipients = await all(
      "SELECT * FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending' ORDER BY id ASC",
      [campaignId]
    );

    for (const recipient of recipients) {
      this.queue.push({
        campaignId,
        recipientId: recipient.id,
        userId,
        isDryRun: options.isDryRun ?? (campaign.is_dry_run === 1),
        delayMs: options.delayMs ?? this.defaultDelayMs,
        trackingEnabled: campaign.tracking_enabled === 1
      });
    }

    this.emit('queue_updated', {
      campaignId,
      totalQueued: this.queue.length,
      status: 'queued'
    });

    // Start background processor if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return { enqueuedCount: recipients.length };
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      try {
        await this.processItem(item);
      } catch (err) {
        console.error(`Unexpected error processing queue item recipient #${item.recipientId}:`, err);
      }

      // Configurable delay between sends to prevent rate limits and spam flags
      if (item.delayMs > 0 && this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, item.delayMs));
      }
    }

    this.isProcessing = false;
  }

  async processItem(item) {
    const { campaignId, recipientId, userId, isDryRun, trackingEnabled } = item;

    // Fetch recipient and user
    const recipient = await get('SELECT * FROM campaign_recipients WHERE id = ?', [recipientId]);
    if (!recipient || recipient.status !== 'pending') {
      return; // already processed or cancelled
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    const campaign = await get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);

    // Update campaign to 'processing' if still 'queued'
    if (campaign && campaign.status === 'queued') {
      await run("UPDATE campaigns SET status = 'processing' WHERE id = ?", [campaignId]);
      this.emit('campaign_status_changed', { campaignId, status: 'processing' });
    }

    // 1. Check if recipient contact is unsubscribed or bounced
    const contact = recipient.email
      ? await get('SELECT * FROM contacts WHERE user_id = ? AND email = ?', [userId, recipient.email.toLowerCase()])
      : null;

    if (contact && contact.is_unsubscribed === 1) {
      await run(
        "UPDATE campaign_recipients SET status = 'skipped', error_message = 'Contact has unsubscribed' WHERE id = ?",
        [recipientId]
      );
      await run("UPDATE campaigns SET skipped_count = skipped_count + 1 WHERE id = ?", [campaignId]);

      this.emit('recipient_progress', {
        campaignId,
        recipientId,
        email: recipient.email,
        status: 'skipped',
        reason: 'Contact has unsubscribed'
      });
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    if (contact && contact.is_bounced === 1) {
      await run(
        "UPDATE campaign_recipients SET status = 'skipped', error_message = 'Contact previously bounced' WHERE id = ?",
        [recipientId]
      );
      await run("UPDATE campaigns SET skipped_count = skipped_count + 1 WHERE id = ?", [campaignId]);

      this.emit('recipient_progress', {
        campaignId,
        recipientId,
        email: recipient.email,
        status: 'skipped',
        reason: 'Contact previously bounced'
      });
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    // 2. Check Daily Send Limit
    const today = new Date().toISOString().split('T')[0];
    const log = await get('SELECT count FROM daily_send_logs WHERE user_id = ? AND date = ?', [userId, today]);
    const sentToday = log ? log.count : 0;
    const dailyLimit = user ? user.daily_send_limit : 500;

    if (!isDryRun && sentToday >= dailyLimit) {
      const limitErrMsg = `Daily send limit reached (${sentToday}/${dailyLimit}). Email skipped.`;
      await run(
        "UPDATE campaign_recipients SET status = 'failed', error_message = ? WHERE id = ?",
        [limitErrMsg, recipientId]
      );
      await run("UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?", [campaignId]);

      this.emit('recipient_progress', {
        campaignId,
        recipientId,
        email: recipient.email,
        status: 'failed',
        error: limitErrMsg
      });
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    // 3. Prepare tokens for tracking & unsubscribe
    const trackingToken = recipient.tracking_token || crypto.randomBytes(20).toString('hex');
    const unsubscribeToken = recipient.unsubscribe_token || crypto.randomBytes(20).toString('hex');

    await run(
      "UPDATE campaign_recipients SET tracking_token = ?, unsubscribe_token = ? WHERE id = ?",
      [trackingToken, unsubscribeToken, recipientId]
    );

    // 4. Build Body with tracking & unsubscribe
    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    let finalHtml = recipient.body_html || '';

    // Click tracking URL rewrite
    if (trackingEnabled && !isDryRun) {
      // Rewrite <a href="..."> links to redirect route
      finalHtml = finalHtml.replace(/href=["'](https?:\/\/[^"']+)["']/gi, (match, url) => {
        // Do not rewrite unsubscribe link
        if (url.includes('/unsubscribe/')) return match;
        const trackingUrl = `${baseUrl}/api/track/click/${trackingToken}?url=${encodeURIComponent(url)}`;
        return `href="${trackingUrl}"`;
      });

      // Append 1x1 open tracking pixel
      const pixel = `<img src="${baseUrl}/api/track/open/${trackingToken}" width="1" height="1" style="display:none !important; border:0; width:1px; height:1px;" alt="" />`;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${pixel}</body>`);
      } else {
        finalHtml += pixel;
      }
    }

    // Unsubscribe link footer injection
    const unsubscribeUrl = `${baseUrl}/unsubscribe/${unsubscribeToken}`;
    const unsubscribeHtml = `
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; font-family: sans-serif; text-align: center;">
        You received this email from ${user ? user.name : 'BulkMailer'}.<br/>
        If you wish to stop receiving these emails, you can 
        <a href="${unsubscribeUrl}" style="color: #4f46e5; text-decoration: underline;">unsubscribe here</a>.
      </div>
    `;

    if (!finalHtml.includes('/unsubscribe/')) {
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${unsubscribeHtml}</body>`);
      } else {
        finalHtml += unsubscribeHtml;
      }
    }

    // Attachments parsing
    let attachments = [];
    if (recipient.attachments_json) {
      try {
        attachments = JSON.parse(recipient.attachments_json);
      } catch (e) {
        attachments = [];
      }
    }

    // 5. Send via Provider (or Mock if Dry Run)
    const provider = isDryRun ? new MockEmailProvider() : getEmailProvider();

    // Sanitize headers to prevent SMTP header injection (CRLF injection)
    const sanitizeHeader = (val) => val ? String(val).replace(/[\r\n\x00-\x1F\x7F]+/g, ' ').trim() : undefined;

    try {
      await provider.sendMail({
        to: sanitizeHeader(recipient.email),
        subject: sanitizeHeader(recipient.subject),
        html: finalHtml,
        text: recipient.body_text || '',
        replyTo: sanitizeHeader(recipient.reply_to),
        cc: sanitizeHeader(recipient.cc),
        bcc: sanitizeHeader(recipient.bcc),
        attachments
      });

      // Mark successful send
      await run(
        "UPDATE campaign_recipients SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error_message = NULL WHERE id = ?",
        [recipientId]
      );
      await run("UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?", [campaignId]);

      // Increment daily send log count if not dry-run
      if (!isDryRun) {
        await run(
          `INSERT INTO daily_send_logs (user_id, date, count) 
           VALUES (?, ?, 1) 
           ON CONFLICT(user_id, date) DO UPDATE SET count = daily_send_logs.count + 1`,
          [userId, today]
        );
      }

      this.emit('recipient_progress', {
        campaignId,
        recipientId,
        email: recipient.email,
        status: 'sent',
        isDryRun
      });
    } catch (sendErr) {
      // Individual email failed - DO NOT CRASH QUEUE!
      console.warn(`Failed to send email to ${recipient.email}:`, sendErr.message);

      const errorMessage = sendErr.message || 'Unknown SMTP delivery error';
      const isBounce =
        sendErr.responseCode >= 550 ||
        /mailbox unavailable|user unknown|recipient rejected|does not exist/i.test(errorMessage);

      const status = isBounce ? 'bounced' : 'failed';

      await run(
        "UPDATE campaign_recipients SET status = ?, error_message = ? WHERE id = ?",
        [status, errorMessage, recipientId]
      );

      if (isBounce) {
        await run("UPDATE campaigns SET bounced_count = bounced_count + 1 WHERE id = ?", [campaignId]);
        // Update contact in contacts table if present
        await run(
          "UPDATE contacts SET is_bounced = 1, bounced_at = CURRENT_TIMESTAMP WHERE user_id = ? AND email = ?",
          [userId, recipient.email.toLowerCase()]
        );
      } else {
        await run("UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?", [campaignId]);
      }

      this.emit('recipient_progress', {
        campaignId,
        recipientId,
        email: recipient.email,
        status,
        error: errorMessage
      });
    }

    await this.checkCampaignCompletion(campaignId);
  }

  async checkCampaignCompletion(campaignId) {
    const pending = await get(
      "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'",
      [campaignId]
    );

    if (pending && Number(pending.count) === 0) {
      await run(
        "UPDATE campaigns SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
        [campaignId]
      );
      const campaign = await get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
      this.emit('campaign_completed', { campaignId, campaign });
    }
  }
}

// Singleton queue instance
const emailQueue = new EmailQueueService();

module.exports = emailQueue;
