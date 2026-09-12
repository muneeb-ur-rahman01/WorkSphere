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

// Sent when an OrgAdmin rejects a pending staff registration request.
const sendRegistrationRejectedEmail = async ({ to, fullName, orgName, reason }) => {
  const subject = 'Your CampOS registration request was not approved';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `Your request to register${orgName ? ` for ${orgName}` : ''} on CampOS was not approved.` +
    (reason ? ` Reason: ${reason}` : '') +
    `\n\nIf you believe this was a mistake, please contact the organization directly.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#b91c1c; margin-bottom: 4px;">Request Not Approved</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>Your request to register${orgName ? ` for <strong>${escapeHtml(orgName)}</strong>` : ''} on CampOS was not approved.</p>
      ${reason ? `<p style="font-size: 13px; color: #555;">Reason: ${escapeHtml(reason)}</p>` : ''}
      <p style="font-size: 13px; color: #555;">If you believe this was a mistake, please contact the organization directly.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing registration-rejected email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
  return { delivered: true };
};

// ============================================================
// Free trial emails (see backend/middleware/subscriptionAccess.js and
// backend/utils/subscriptionScheduler.js for the trial state machine that
// triggers these).
// ============================================================

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

// Sent the moment a SuperAdmin approves an organization and its 7-day
// trial begins.
const sendTrialStartedEmail = async ({ to, fullName, orgName, trialEndDate }) => {
  const subject = 'Your CampOS 7-day free trial has started';
  const endLabel = formatDate(trialEndDate);

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `${orgName || 'Your organization'} has been approved and your 7-day free trial of CampOS is now active. ` +
    `You have full access to your plan's features until ${endLabel}.\n\n` +
    `You can view your trial status and choose a subscription plan at any time from the Subscription section.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Your free trial has started 🎉</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p><strong>${escapeHtml(orgName || 'Your organization')}</strong> has been approved and your <strong>7-day free trial</strong> of CampOS is now active.</p>
      <p>You have full access to your plan's features until <strong>${endLabel}</strong>.</p>
      <p style="font-size: 13px; color: #555;">You can view your trial status and choose a subscription plan at any time from the Subscription section.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing trial-started email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
  return { delivered: true };
};

// Sent once, 2 days (and again with 1 day left is fine too — dedupe is
// handled by the scheduler) before a trial ends.
const sendTrialExpiringEmail = async ({ to, fullName, orgName, daysRemaining, trialEndDate }) => {
  const subject = `Your CampOS free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
  const endLabel = formatDate(trialEndDate);

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `The free trial for ${orgName || 'your organization'} on CampOS ends on ${endLabel} ` +
    `(${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left). ` +
    `Select a subscription plan from the Subscription section before then to avoid any interruption to your operations.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#b45309; margin-bottom: 4px;">Your free trial is ending soon</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>The free trial for <strong>${escapeHtml(orgName || 'your organization')}</strong> on CampOS ends on <strong>${endLabel}</strong> (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left).</p>
      <p>Select a subscription plan from the Subscription section before then to avoid any interruption to your operations.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing trial-expiring email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
  return { delivered: true };
};

// Sent the moment a trial expires without an active paid subscription —
// operations are locked at the same time (see subscriptionScheduler.js).
const sendTrialExpiredEmail = async ({ to, fullName, orgName }) => {
  const subject = 'Your CampOS free trial has ended';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `The 7-day free trial for ${orgName || 'your organization'} on CampOS has ended. ` +
    `Your organization's operational features are now paused until a subscription plan is selected. ` +
    `Your data is safe and has not been deleted.\n\n` +
    `Select a plan from the Subscription section to restore full access.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#b91c1c; margin-bottom: 4px;">Your free trial has ended</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>The 7-day free trial for <strong>${escapeHtml(orgName || 'your organization')}</strong> on CampOS has ended.</p>
      <p>Your organization's operational features are now paused until a subscription plan is selected. Your data is safe and has not been deleted.</p>
      <p style="margin: 28px 0;">Select a plan from the Subscription section to restore full access.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing trial-expired email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
  return { delivered: true };
};

// ============================================================
// External User Query emails (Home Page floating Query widget -> Super
// Admin inbox). See backend/controllers/queryController.js.
// ============================================================

// Sent to the visitor right after they submit a query, so they know it
// was received even before a Super Admin looks at it.
const sendQueryReceivedEmail = async ({ to, name, subject }) => {
  const emailSubject = 'We received your message — CampOS';

  const text =
    `Hi ${name || 'there'},\n\n` +
    `Thanks for reaching out to CampOS. We received your message with the subject "${subject}" ` +
    `and our team will get back to you by email shortly.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">We received your message</h2>
      <p>Hi ${name ? escapeHtml(name) : 'there'},</p>
      <p>Thanks for reaching out to CampOS. We received your message with the subject "<strong>${escapeHtml(subject)}</strong>" and our team will get back to you by email shortly.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing query-received email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${emailSubject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject: emailSubject, text, html });
  return { delivered: true };
};

// Sent when a Super Admin replies to a query directly from the Queries
// inbox — the actual response workflow, connected back to the original
// query (subject line references it).
const sendQueryResponseEmail = async ({ to, name, originalSubject, responseText }) => {
  const subject = `Re: ${originalSubject}`;

  const text =
    `Hi ${name || 'there'},\n\n` +
    `${responseText}\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Reply from CampOS</h2>
      <p>Hi ${name ? escapeHtml(name) : 'there'},</p>
      <p style="white-space: pre-wrap;">${escapeHtml(responseText)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing query-response email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Message: ${responseText}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
  return { delivered: true };
};

// ============================================================
// Opportunity application emails (see
// backend/controllers/opportunityController.js).
// ============================================================

// Sent to an applicant right after they submit an internal application
// (i.e. the opportunity had no external application_link).
const sendOpportunityApplicationReceivedEmail = async ({ to, name, opportunityTitle, orgName }) => {
  const subject = `Application received — ${opportunityTitle}`;

  const text =
    `Hi ${name || 'there'},\n\n` +
    `Thanks for applying to "${opportunityTitle}"${orgName ? ` at ${orgName}` : ''}. ` +
    `Your application has been received and the organization will reach out if you're shortlisted.\n\n` +
    `— The CampOS Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Application received</h2>
      <p>Hi ${name ? escapeHtml(name) : 'there'},</p>
      <p>Thanks for applying to "<strong>${escapeHtml(opportunityTitle)}</strong>"${orgName ? ` at <strong>${escapeHtml(orgName)}</strong>` : ''}.</p>
      <p style="font-size: 13px; color: #555;">Your application has been received and the organization will reach out if you're shortlisted.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">CampOS · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[CampOS] SMTP not configured — printing application-received email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
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

module.exports = {
  sendPasswordResetEmail,
  sendRegistrationAcceptedEmail,
  sendRegistrationRejectedEmail,
  sendTrialStartedEmail,
  sendTrialExpiringEmail,
  sendTrialExpiredEmail,
  sendQueryReceivedEmail,
  sendQueryResponseEmail,
  sendOpportunityApplicationReceivedEmail
};
