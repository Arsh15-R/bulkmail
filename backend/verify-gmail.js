require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailConnection() {
  console.log('\n======================================================');
  console.log('   BulkMailer Gmail Connection Diagnostic Tool        ');
  console.log('======================================================\n');

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  console.log(`Provider Mode : ${process.env.EMAIL_PROVIDER || 'smtp'}`);
  console.log(`SMTP Host     : ${host}:${port} (secure: ${secure})`);
  console.log(`SMTP User     : ${user ? user : '[NOT SET - Please configure in backend/.env]'}`);
  console.log(`SMTP Pass     : ${pass ? '•••••••••••••••• (' + pass.length + ' chars)' : '[NOT SET - Please configure in backend/.env]'}`);

  if (!user || !pass) {
    console.error('\n❌ ERROR: SMTP_USER or SMTP_PASS is missing in backend/.env.');
    console.log('\nTo fix:');
    console.log('1. Open backend/.env');
    console.log('2. Set EMAIL_PROVIDER=smtp');
    console.log('3. Set SMTP_USER=your_email@gmail.com');
    console.log('4. Set SMTP_PASS=your_16_character_app_password');
    console.log('5. Re-run: node verify-gmail.js\n');
    process.exit(1);
  }

  console.log('\nConnecting to Gmail SMTP servers...');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true' }
  });

  try {
    await transporter.verify();
    console.log('\n✅ SUCCESS: Connection to Gmail SMTP verified successfully!');
    console.log(`Your Gmail account (${user}) is fully connected and ready to send emails through BulkMailer.\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ GMAIL CONNECTION FAILED:');
    console.error(err.message);

    if (err.message.includes('535') || err.message.includes('Username and Password not accepted')) {
      console.log('\n💡 Diagnosis & Solution:');
      console.log('Google rejected the password. Note that Google requires an "App Password", not your regular Gmail account password.');
      console.log('Steps to fix:');
      console.log('1. Go to https://myaccount.google.com/security');
      console.log('2. Ensure "2-Step Verification" is ON.');
      console.log('3. Go to https://myaccount.google.com/apppasswords');
      console.log('4. Create a new App Password named "BulkMailer".');
      console.log('5. Paste the 16-character code (without spaces) into SMTP_PASS in backend/.env.');
    }
    console.log('\n======================================================\n');
    process.exit(1);
  }
}

testGmailConnection();
