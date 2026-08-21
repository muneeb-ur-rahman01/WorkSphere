const nodemailer = require('nodemailer');

// ============================================================
// Mailer
// Sends transactional emails (currently: password reset) via SMTP.
// Configure SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
// in backend/.env (see .env.example). Works with any standard SMTP
// provider (Gmail App Password, SendGrid, Mailgun, Postmark, AWS SES, etc).
//
// If SMTP isn't configured yet (e.g. local dev), we don't crash the
// app - we just log the email (and the reset link) to the console so
// the flow is still testable end-to-end without real credentials.
// ============================================================

let transporter = null;
const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for other ports (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  console.warn(
    '[CampOS] WARNING: SMTP_HOST / SMTP_USER / SMTP_PASS are not set. ' +
    'Password-reset emails will be logged to the console instead of actually sent. ' +
    'Copy backend/.env.example to backend/.env and fill in your SMTP credentials to send real emails.'
  );
}

const FROM_ADDRESS = process.env.SMTP_FROM || 'CampOS <no-reply@campos.app>';

const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const subject = 'Reset your CampOS password';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `We received a request to reset the password for your CampOS account (${to}).\n\n` +
    `Reset your password using the link below. This link is valid for 1 hour and can only be used once:\n` +
    `${resetUrl}\n\n` +
    `If you didn't request this, you can safely ignore this email - your password will not be changed.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Reset your password</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>We received a request to reset the password for your CampOS account (<strong>${escapeHtml(to)}</strong>).</p>
      <p style="margin: 28px 0;">
        <a href="${resetUrl}"
           style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 13px; color: #555;">Or copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color:#4f46e5; word-break: break-all;">${resetUrl}</a>
      </p>
      <p style="font-size: 13px; color: #555;">This link is valid for <strong>1 hour</strong> and can only be used once.</p>
      <p style="font-size: 13px; color: #555;">If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing password reset email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Reset URL: ${resetUrl}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    text,
    html
  });

  return { delivered: true };
};

// Sent when an OrgAdmin approves a pending staff registration request
// (Employee/Intern/Volunteer/Membership signing up for a specific org).
const sendRegistrationAcceptedEmail = async ({ to, fullName, orgName }) => {
  const subject = 'Your CampOS registration has been accepted';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `Your request to register${orgName ? ` for ${orgName}` : ''} on CampOS has been accepted. ` +
    `You can now log in using your credentials.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Request Accepted</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>Your request to register${orgName ? ` for <strong>${escapeHtml(orgName)}</strong>` : ''} on CampOS has been accepted.
      You can now log in using your credentials.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing registration-accepted email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Message: Your request has been accepted. You can now log in using your credentials.\n`);
    return { delivered: false };
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    text,
    html
  });

  return { delivered: true };
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendPasswordResetEmail, sendRegistrationAcceptedEmail };
