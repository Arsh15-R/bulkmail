const { exec } = require('../config/db');

const initSchema = async () => {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      daily_send_limit INTEGER DEFAULT 500,
      dark_mode INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      name TEXT,
      metadata_json TEXT,
      is_unsubscribed INTEGER DEFAULT 0,
      unsubscribed_at DATETIME,
      is_bounced INTEGER DEFAULT 0,
      bounced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, email)
    );

    CREATE TABLE IF NOT EXISTS group_contacts (
      group_id INTEGER NOT NULL,
      contact_id INTEGER NOT NULL,
      PRIMARY KEY (group_id, contact_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      subject TEXT,
      body_html TEXT NOT NULL,
      body_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      mode TEXT NOT NULL,
      subject TEXT,
      body_html TEXT,
      body_text TEXT,
      status TEXT DEFAULT 'draft',
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      bounced_count INTEGER DEFAULT 0,
      skipped_count INTEGER DEFAULT 0,
      opened_count INTEGER DEFAULT 0,
      clicked_count INTEGER DEFAULT 0,
      is_dry_run INTEGER DEFAULT 0,
      tracking_enabled INTEGER DEFAULT 1,
      settings_json TEXT,
      scheduled_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      contact_id INTEGER,
      email TEXT NOT NULL,
      name TEXT,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      cc TEXT,
      bcc TEXT,
      reply_to TEXT,
      attachments_json TEXT,
      merge_data_json TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      tracking_token TEXT UNIQUE,
      unsubscribe_token TEXT UNIQUE,
      sent_at DATETIME,
      is_opened INTEGER DEFAULT 0,
      opened_at DATETIME,
      is_clicked INTEGER DEFAULT 0,
      clicked_at DATETIME,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      target_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      run_at DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      compose_state_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_send_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_user_email ON contacts(user_id, email);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);
    CREATE INDEX IF NOT EXISTS idx_recipients_tracking_token ON campaign_recipients(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_recipients_unsubscribe_token ON campaign_recipients(unsubscribe_token);
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run ON scheduled_jobs(status, run_at);
  `;

  await exec(schemaSql);
};

module.exports = { initSchema };
