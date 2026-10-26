const nodemailer = require('nodemailer');

class BaseEmailProvider {
  async sendMail(options) {
    throw new Error('sendMail() must be implemented by subclass');
  }
  async verify() {
    return true;
  }
}

/**
 * Standard SMTP Provider using Nodemailer
 * Supports Gmail App Passwords, AWS SES SMTP, SendGrid SMTP, Mailgun SMTP, custom SMTP.
 */
class SmtpEmailProvider extends BaseEmailProvider {
  constructor() {
    super();
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    this.defaultFrom = process.env.EMAIL_FROM || (user ? `BulkMailer <${user}>` : 'BulkMailer <noreply@example.com>');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true'
        }
      });
    } else {
      // Create a test/stream transport if no credentials configured
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'windows'
      });
    }
  }

  async verify() {
    if (!this.transporter || !process.env.SMTP_USER) {
      return { ok: false, message: 'SMTP credentials not configured in .env' };
    }
    try {
      await this.transporter.verify();
      return { ok: true, message: 'SMTP connection verified successfully.' };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  async sendMail({ to, subject, html, text, from, replyTo, cc, bcc, attachments = [] }) {
    if (!this.transporter) {
      this.initTransporter();
    }

    const mailOptions = {
      from: from || this.defaultFrom,
      to,
      subject,
      html,
      text,
      replyTo,
      cc,
      bcc,
      attachments: attachments.map(att => ({
        filename: att.filename,
        path: att.path,
        content: att.content,
        contentType: att.contentType
      }))
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

/**
 * Mock Provider for Dry-Run mode and Automated Testing
 */
class MockEmailProvider extends BaseEmailProvider {
  constructor() {
    super();
    this.sentEmails = [];
  }

  async sendMail(options) {
    // Artificial latency of 20ms
    await new Promise(r => setTimeout(r, 20));

    // Simulated rejection for test emails ending with @reject.test or invalid domains
    if (options.to && (options.to.includes('reject.test') || options.to.includes('fail@example.com'))) {
      const err = new Error('550 5.1.1 User unknown / Mailbox does not exist');
      err.responseCode = 550;
      throw err;
    }

    const record = {
      ...options,
      messageId: `<mock-${Date.now()}-${Math.random().toString(36).substring(7)}@bulkmailer.local>`,
      timestamp: new Date().toISOString()
    };
    this.sentEmails.push(record);
    return record;
  }

  async verify() {
    return { ok: true, message: 'Mock provider active.' };
  }

  clear() {
    this.sentEmails = [];
  }
}

/**
 * Architecture hook for alternative providers (Resend, SendGrid, Amazon SES)
 * Example implementation ready to plug in SDKs:
 */
class ResendEmailProvider extends BaseEmailProvider {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.RESEND_API_KEY;
  }
  async sendMail(options) {
    // e.g. await resend.emails.send(...)
    throw new Error('Resend provider selected but RESEND_API_KEY is not configured.');
  }
}

// Factory
let activeProvider = null;

const getEmailProvider = (overrideMode = null) => {
  if (overrideMode === 'mock') {
    return new MockEmailProvider();
  }

  if (activeProvider && !overrideMode) {
    return activeProvider;
  }

  const providerType = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

  switch (providerType) {
    case 'mock':
      activeProvider = new MockEmailProvider();
      break;
    case 'resend':
      activeProvider = new ResendEmailProvider();
      break;
    case 'smtp':
    default:
      activeProvider = new SmtpEmailProvider();
      break;
  }

  return activeProvider;
};

const setEmailProvider = (provider) => {
  activeProvider = provider;
};

module.exports = {
  getEmailProvider,
  setEmailProvider,
  SmtpEmailProvider,
  MockEmailProvider,
  ResendEmailProvider
};
