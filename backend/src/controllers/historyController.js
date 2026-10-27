const { get, run, all } = require('../config/db');
const emailQueue = require('../services/emailQueue');

const getCampaigns = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    let query = 'SELECT * FROM campaigns WHERE user_id = ?';
    const params = [userId];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    const countRow = await get(`SELECT COUNT(*) as total FROM (${query}) AS count_subquery`, params);
    const total = countRow ? Number(countRow.total) : 0;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const campaigns = await all(query, params);

    return res.json({
      success: true,
      campaigns,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getCampaigns error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve campaign history.' });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const recipients = await all(
      'SELECT * FROM campaign_recipients WHERE campaign_id = ? ORDER BY id ASC',
      [id]
    );

    return res.json({
      success: true,
      campaign,
      recipients
    });
  } catch (err) {
    console.error('getCampaignById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve campaign details.' });
  }
};

const retryFailedRecipients = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    // Find failed/bounced recipients
    const failedRecipients = await all(
      "SELECT * FROM campaign_recipients WHERE campaign_id = ? AND status IN ('failed', 'bounced')",
      [id]
    );

    if (failedRecipients.length === 0) {
      return res.status(400).json({ success: false, error: 'No failed recipients found to retry in this campaign.' });
    }

    // Create a new retry campaign
    const retryCampResult = await run(
      `INSERT INTO campaigns 
       (user_id, title, mode, subject, body_html, body_text, status, total_recipients, is_dry_run, tracking_enabled, settings_json) 
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        userId,
        `Retry: ${campaign.title}`,
        campaign.mode,
        campaign.subject,
        campaign.body_html,
        campaign.body_text,
        failedRecipients.length,
        campaign.is_dry_run,
        campaign.tracking_enabled,
        campaign.settings_json
      ]
    );

    const retryCampId = retryCampResult.lastID;

    // Copy recipients with pending status
    for (const r of failedRecipients) {
      await run(
        `INSERT INTO campaign_recipients 
         (campaign_id, email, name, subject, body_html, body_text, cc, bcc, reply_to, attachments_json, merge_data_json, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          retryCampId,
          r.email,
          r.name,
          r.subject,
          r.body_html,
          r.body_text,
          r.cc,
          r.bcc,
          r.reply_to,
          r.attachments_json,
          r.merge_data_json
        ]
      );
    }

    // Enqueue retry campaign
    await emailQueue.enqueueCampaign(retryCampId, userId, {
      isDryRun: campaign.is_dry_run === 1
    });

    return res.status(201).json({
      success: true,
      message: `Retrying ${failedRecipients.length} failed recipient(s).`,
      campaignId: retryCampId,
      retriedCount: failedRecipients.length
    });
  } catch (err) {
    console.error('retryFailedRecipients error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retry recipients.' });
  }
};

const exportCampaignCsv = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await get('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const recipients = await all(
      'SELECT email, name, subject, status, error_message, sent_at, is_opened, opened_at, is_clicked, clicked_at FROM campaign_recipients WHERE campaign_id = ?',
      [id]
    );

    // Build CSV with Formula Injection (CWE-1236) prevention
    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Prepend single quote if field starts with dangerous formula triggers: =, +, -, @, \t, \r
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Email', 'Name', 'Subject', 'Status', 'Error', 'Sent At', 'Opened', 'Opened At', 'Clicked', 'Clicked At'];
    const rows = recipients.map(r => [
      sanitizeCsvCell(r.email),
      sanitizeCsvCell(r.name),
      sanitizeCsvCell(r.subject),
      sanitizeCsvCell(r.status),
      sanitizeCsvCell(r.error_message),
      sanitizeCsvCell(r.sent_at),
      r.is_opened ? 'Yes' : 'No',
      sanitizeCsvCell(r.opened_at),
      r.is_clicked ? 'Yes' : 'No',
      sanitizeCsvCell(r.clicked_at)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    const filename = `campaign_${id}_export.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('exportCampaignCsv error:', err);
    return res.status(500).json({ success: false, error: 'Failed to export campaign CSV.' });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const campaign = await get('SELECT id, title FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found or access denied.' });
    }

    // Cascade delete in PostgreSQL takes care of campaign_recipients, tracking_events, etc.
    await run('DELETE FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);

    return res.json({
      success: true,
      message: `Campaign #${id} and associated mail records deleted successfully.`
    });
  } catch (err) {
    console.error('deleteCampaign error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete campaign.' });
  }
};

const deleteRecipient = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipientId } = req.params;

    const recipient = await get(
      `SELECT cr.id, cr.campaign_id, cr.status 
       FROM campaign_recipients cr 
       JOIN campaigns c ON cr.campaign_id = c.id 
       WHERE cr.id = ? AND c.user_id = ?`,
      [recipientId, userId]
    );

    if (!recipient) {
      return res.status(404).json({ success: false, error: 'Recipient mail record not found or access denied.' });
    }

    await run('DELETE FROM campaign_recipients WHERE id = ?', [recipientId]);

    const campaignId = recipient.campaign_id;
    const counts = await get(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
         SUM(CASE WHEN status IN ('failed', 'bounced') THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
       FROM campaign_recipients WHERE campaign_id = ?`,
      [campaignId]
    );

    await run(
      `UPDATE campaigns SET 
         total_recipients = ?, 
         sent_count = ?, 
         failed_count = ?, 
         skipped_count = ? 
       WHERE id = ?`,
      [
        Number(counts.total || 0),
        Number(counts.sent || 0),
        Number(counts.failed || 0),
        Number(counts.skipped || 0),
        campaignId
      ]
    );

    return res.json({
      success: true,
      message: 'Recipient mail record deleted successfully.'
    });
  } catch (err) {
    console.error('deleteRecipient error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete recipient mail record.' });
  }
};

const bulkDeleteCampaigns = async (req, res) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Campaign IDs array is required.' });
    }

    const validIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id) && id > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid campaign IDs provided.' });
    }

    for (const id of validIds) {
      await run('DELETE FROM campaigns WHERE id = ? AND user_id = ?', [id, userId]);
    }

    return res.json({
      success: true,
      message: `Successfully deleted ${validIds.length} campaign(s).`,
      deletedCount: validIds.length
    });
  } catch (err) {
    console.error('bulkDeleteCampaigns error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete campaigns.' });
  }
};

module.exports = {
  getCampaigns,
  getCampaignById,
  retryFailedRecipients,
  exportCampaignCsv,
  deleteCampaign,
  deleteRecipient,
  bulkDeleteCampaigns
};
