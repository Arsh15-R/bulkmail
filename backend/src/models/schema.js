const { exec } = require('../config/db');

const initSchema = async () => {
  const pgSchemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT,
      avatar_url TEXT,
      auth_provider TEXT DEFAULT 'local',
      daily_send_limit INTEGER DEFAULT 500,
      dark_mode INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      metadata_json TEXT,
      is_unsubscribed INTEGER DEFAULT 0,
      unsubscribed_at TIMESTAMPTZ,
      is_bounced INTEGER DEFAULT 0,
      bounced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, email)
    );

    CREATE TABLE IF NOT EXISTS group_contacts (
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, contact_id)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT,
      body_html TEXT NOT NULL,
      body_text TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      scheduled_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
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
      sent_at TIMESTAMPTZ,
      is_opened INTEGER DEFAULT 0,
      opened_at TIMESTAMPTZ,
      is_clicked INTEGER DEFAULT 0,
      clicked_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      target_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      run_at TIMESTAMPTZ NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      compose_state_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_send_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_user_email ON contacts(user_id, email);
    CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);
    CREATE INDEX IF NOT EXISTS idx_recipients_tracking_token ON campaign_recipients(tracking_token);
    CREATE INDEX IF NOT EXISTS idx_recipients_unsubscribe_token ON campaign_recipients(unsubscribe_token);
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run ON scheduled_jobs(status, run_at);
  `;

  await exec(pgSchemaSql);
};

module.exports = { initSchema };
