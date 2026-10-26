const { get, run, all } = require('../config/db');
const { scheduleCampaign, cancelScheduledJob } = require('../services/scheduler');
const crypto = require('crypto');

const createSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title = 'Scheduled Campaign',
      mode = 'same',
      subject = '',
      body_html = '',
      body_text = '',
      recipients = [],
      runAt,
      isDryRun = false,
      trackingEnabled = true,
      settings = {}
    } = req.body;

    if (!runAt || isNaN(new Date(runAt).getTime())) {
      return res.status(400).json({ success: false, error: 'A valid runAt date/time is required.' });
    }

    if (new Date(runAt) <= new Date()) {
      return res.status(400).json({ success: false, error: 'Scheduled time must be in the future.' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one recipient is required.' });
    }

    // 1. Create Campaign
    const campResult = await run(
      `INSERT INTO campaigns 
       (user_id, title, mode, subject, body_html, body_text, status, total_recipients, is_dry_run, tracking_enabled, settings_json, scheduled_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim(),
        mode,
        subject,
        body_html,
        body_text,
        recipients.length,
        isDryRun ? 1 : 0,
        trackingEnabled ? 1 : 0,
        JSON.stringify(settings),
        new Date(runAt).toISOString()
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

    // 3. Register in scheduled_jobs table
    const job = await scheduleCampaign(userId, campaignId, runAt);

    return res.status(201).json({
      success: true,
      message: 'Campaign successfully scheduled.',
      campaignId,
      jobId: job.jobId,
      runAt: job.runAt
    });
  } catch (err) {
    console.error('createSchedule error:', err);
    return res.status(500).json({ success: false, error: 'Failed to schedule campaign.' });
  }
};

const getSchedules = async (req, res) => {
  try {
    const userId = req.user.id;
    const jobs = await all(
      `SELECT sj.*, c.title, c.mode, c.subject, c.total_recipients 
       FROM scheduled_jobs sj 
       JOIN campaigns c ON sj.campaign_id = c.id 
       WHERE sj.user_id = ? 
       ORDER BY sj.run_at ASC`,
      [userId]
    );

    return res.json({ success: true, schedules: jobs });
  } catch (err) {
    console.error('getSchedules error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve scheduled campaigns.' });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { runAt } = req.body;

    if (!runAt || isNaN(new Date(runAt).getTime())) {
      return res.status(400).json({ success: false, error: 'Valid future runAt date is required.' });
    }

    const job = await get('SELECT * FROM scheduled_jobs WHERE id = ? AND user_id = ?', [id, userId]);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Scheduled job not found.' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Cannot update a job with status '${job.status}'.` });
    }

    const newRunAtIso = new Date(runAt).toISOString();
    await run('UPDATE scheduled_jobs SET run_at = ? WHERE id = ?', [newRunAtIso, id]);
    await run('UPDATE campaigns SET scheduled_at = ? WHERE id = ?', [newRunAtIso, job.campaign_id]);

    const updated = await get('SELECT * FROM scheduled_jobs WHERE id = ?', [id]);
    return res.json({ success: true, schedule: updated });
  } catch (err) {
    console.error('updateSchedule error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update scheduled campaign.' });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await cancelScheduledJob(id, userId);
    return res.json(result);
  } catch (err) {
    console.error('deleteSchedule error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to cancel schedule.' });
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule
};
