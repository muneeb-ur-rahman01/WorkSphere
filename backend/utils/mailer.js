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
const isConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

if (isConfigured) {
  transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  family: 4,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  logger: true,
  debug: true
});
} else {
  console.warn(
    '[WorkSphere] WARNING: SMTP_HOST / SMTP_USER / SMTP_PASS are not set. ' +
    'Password-reset emails will be logged to the console instead of actually sent. ' +
    'Copy backend/.env.example to backend/.env and fill in your SMTP credentials to send real emails.'
  );
}

console.log('[WorkSphere] SMTP config check:', {
  host: process.env.SMTP_HOST || 'MISSING',
  port: process.env.SMTP_PORT || 'MISSING',
  user: process.env.SMTP_USER ? 'SET' : 'MISSING',
  pass: process.env.SMTP_PASS ? 'SET' : 'MISSING',
  from: process.env.SMTP_FROM || 'MISSING'
});

if (transporter) {
  transporter.verify()
    .then(() => {
      console.log('[WorkSphere] SMTP connection verified successfully.');
    })
    .catch((error) => {
      console.error('[WorkSphere] SMTP verification FAILED:', {
        message: error.message,
        code: error.code,
        response: error.response,
        responseCode: error.responseCode,
        command: error.command
      });
    });
}

const FROM_ADDRESS =
  process.env.SMTP_FROM || 'WorkSphere <no-reply@WorkSphere.app>';

const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const subject = 'Reset your WorkSphere password';

  const text = `
Hello ${fullName || 'there'},

We received a request to reset your WorkSphere password.

Click the link below to reset your password:

${resetUrl}

This link will expire soon.

If you did not request a password reset, you can safely ignore this email.

Regards,
WorkSphere Team
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your WorkSphere password</title>
</head>

<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;padding:35px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <h2 style="margin-top:0;color:#111827;">
      Reset your WorkSphere password
    </h2>

    <p style="color:#4b5563;font-size:15px;">
      Hello ${fullName || 'there'},
    </p>

    <p style="color:#4b5563;font-size:15px;line-height:1.6;">
      We received a request to reset your WorkSphere password.
      Click the button below to create a new password.
    </p>

    <div style="text-align:center;margin:30px 0;">
      <a
        href="${resetUrl}"
        style="
          display:inline-block;
          background:#111827;
          color:#ffffff;
          text-decoration:none;
          padding:14px 24px;
          border-radius:8px;
          font-weight:bold;
        "
      >
        Reset Password
      </a>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;">
      If the button does not work, copy and paste this URL into your browser:
    </p>

    <p style="word-break:break-all;color:#2563eb;font-size:13px;">
      ${resetUrl}
    </p>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;">
      If you did not request a password reset, you can safely ignore this email.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;" />

    <p style="color:#9ca3af;font-size:12px;text-align:center;">
      © ${new Date().getFullYear()} WorkSphere. All rights reserved.
    </p>

  </div>
</body>
</html>
`;

  if (!isConfigured) {
    console.log(
      '\n[WorkSphere] SMTP not configured — printing password reset email instead of sending it:'
    );

    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Reset URL: ${resetUrl}\n`);

    return {
      delivered: false,
      reason: 'SMTP_NOT_CONFIGURED'
    };
  }
console.log('[WorkSphere] About to call transporter.sendMail...');
  try {
    const info = await Promise.race([
  transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject,
    text,
    html
  }),
  new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('SMTP sendMail timeout after 30 seconds')),
      30000
    )
  )
]);

    console.log('[WorkSphere] Password reset email SMTP response:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      envelope: info.envelope
    });

    return {
      delivered: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response
    };

  } catch (error) {
    console.error('[WorkSphere] Password reset email FAILED:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command
    });

    throw error;
  }
};

// Sent when an OrgAdmin approves a pending staff registration request
// (Employee/Intern/Volunteer/Membership signing up for a specific org).
const sendRegistrationAcceptedEmail = async ({
  to,
  fullName,
  orgName
}) => {
  const subject = 'Your WorkSphere registration has been accepted';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `Your request to register${orgName ? ` for ${orgName}` : ''} on WorkSphere has been accepted. ` +
    `You can now log in using your credentials.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Request Accepted</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>Your request to register${orgName ? ` for <strong>${escapeHtml(orgName)}</strong>` : ''} on WorkSphere has been accepted.
      You can now log in using your credentials.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured printing registration-accepted email instead of sending it:');
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
const sendRegistrationRejectedEmail = async ({
  to,
  fullName,
  orgName,
  reason
}) => {
  const subject =
    'Your WorkSphere registration request was not approved';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `Your request to register${orgName ? ` for ${orgName}` : ''} on WorkSphere was not approved.` +
    (reason ? ` Reason: ${reason}` : '') +
    `\n\nIf you believe this was a mistake, please contact the organization directly.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#b91c1c; margin-bottom: 4px;">Request Not Approved</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>Your request to register${orgName ? ` for <strong>${escapeHtml(orgName)}</strong>` : ''} on WorkSphere was not approved.</p>
      ${reason ? `<p style="font-size: 13px; color: #555;">Reason: ${escapeHtml(reason)}</p>` : ''}
      <p style="font-size: 13px; color: #555;">If you believe this was a mistake, please contact the organization directly.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured printing registration rejected email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
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

// ============================================================
// Free trial emails
// ============================================================

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '';

// Sent the moment a SuperAdmin approves an organization and its 7-day
// trial begins.
const sendTrialStartedEmail = async ({
  to,
  fullName,
  orgName,
  trialEndDate
}) => {
  const subject = 'Your WorkSphere 7-day free trial has started';
  const endLabel = formatDate(trialEndDate);

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `${orgName || 'Your organization'} has been approved and your 7-day free trial of WorkSphere is now active. ` +
    `You have full access to your plan's features until ${endLabel}.\n\n` +
    `You can view your trial status and choose a subscription plan at any time from the Subscription section.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Your free trial has started 🎉</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p><strong>${escapeHtml(orgName || 'Your organization')}</strong> has been approved and your <strong>7-day free trial</strong> of WorkSphere is now active.</p>
      <p>You have full access to your plan's features until <strong>${endLabel}</strong>.</p>
      <p style="font-size: 13px; color: #555;">You can view your trial status and choose a subscription plan at any time from the Subscription section.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured — printing trial-started email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
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

// Sent once, 2 days (and again with 1 day left is fine too — dedupe is
// handled by the scheduler) before a trial ends.
const sendTrialExpiringEmail = async ({
  to,
  fullName,
  orgName,
  daysRemaining,
  trialEndDate
}) => {
  const subject =
    `Your WorkSphere free trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;

  const endLabel = formatDate(trialEndDate);

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `The free trial for ${orgName || 'your organization'} on WorkSphere ends on ${endLabel} ` +
    `(${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left). ` +
    `Select a subscription plan from the Subscription section before then to avoid any interruption to your operations.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#b45309; margin-bottom: 4px;">Your free trial is ending soon</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>The free trial for <strong>${escapeHtml(orgName || 'your organization')}</strong> on WorkSphere ends on <strong>${endLabel}</strong> (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left).</p>
      <p>Select a subscription plan from the Subscription section before then to avoid any interruption to your operations.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured — printing trial-expiring email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
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

// Sent the moment a trial expires without an active paid subscription —
const sendTrialExpiredEmail = async ({
  to,
  fullName,
  orgName
}) => {
  const subject = 'Your WorkSphere free trial has ended';

  const text =
    `Hi ${fullName || 'there'},\n\n` +
    `The 7-day free trial for ${orgName || 'your organization'} on WorkSphere has ended. ` +
    `Your organization's operational features are now paused until a subscription plan is selected. ` +
    `Your data is safe and has not been deleted.\n\n` +
    `Select a plan from the Subscription section to restore full access.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#b91c1c; margin-bottom: 4px;">Your free trial has ended</h2>
      <p>Hi ${fullName ? escapeHtml(fullName) : 'there'},</p>
      <p>The 7-day free trial for <strong>${escapeHtml(orgName || 'your organization')}</strong> on WorkSphere has ended.</p>
      <p>Your organization's operational features are now paused until a subscription plan is selected. Your data is safe and has not been deleted.</p>
      <p style="margin: 28px 0;">Select a plan from the Subscription section to restore full access.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured — printing trial-expired email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
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

// ============================================================
// External User Query emails
// ============================================================

// Sent to the visitor right after they submit a query.
const sendQueryReceivedEmail = async ({
  to,
  name,
  subject
}) => {
  const emailSubject = 'We received your message — WorkSphere';

  const text =
    `Hi ${name || 'there'},\n\n` +
    `Thanks for reaching out to WorkSphere. We received your message with the subject "${subject}" ` +
    `and our team will get back to you by email shortly.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">We received your message</h2>
      <p>Hi ${name ? escapeHtml(name) : 'there'},</p>
      <p>Thanks for reaching out to WorkSphere. We received your message with the subject "<strong>${escapeHtml(subject)}</strong>" and our team will get back to you by email shortly.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured — printing query-received email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${emailSubject}\n`);
    return { delivered: false };
  }

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: emailSubject,
    text,
    html
  });

  return { delivered: true };
};

// Sent when a Super Admin replies to a query.
const sendQueryResponseEmail = async ({
  to,
  name,
  originalSubject,
  responseText
}) => {
  const subject = `Re: ${originalSubject}`;

  const text =
    `Hi ${name || 'there'},\n\n` +
    `${responseText}\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Reply from WorkSphere</h2>
      <p>Hi ${name ? escapeHtml(name) : 'there'},</p>
      <p style="white-space: pre-wrap;">${escapeHtml(responseText)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured — printing query-response email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Message: ${responseText}\n`);
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

// ============================================================
// Opportunity application emails
// ============================================================

const sendOpportunityApplicationReceivedEmail = async ({
  to,
  name,
  opportunityTitle,
  orgName
}) => {
  const subject = `Application received — ${opportunityTitle}`;

  const text =
    `Hi ${name || 'there'},\n\n` +
    `Thanks for applying to "${opportunityTitle}"${orgName ? ` at ${orgName}` : ''}. ` +
    `Your application has been received and the organization will reach out if you're shortlisted.\n\n` +
    `— The WorkSphere Team`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color:#4338ca; margin-bottom: 4px;">Application received</h2>
      <p>Hi ${name ? escapeHtml(name) : 'there'},</p>
      <p>Thanks for applying to "<strong>${escapeHtml(opportunityTitle)}</strong>"${orgName ? ` at <strong>${escapeHtml(orgName)}</strong>` : ''}.</p>
      <p style="font-size: 13px; color: #555;">Your application has been received and the organization will reach out if you're shortlisted.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
      <p style="font-size: 12px; color: #999;">WorkSphere · Medical Camp Management</p>
    </div>
  `;

  if (!isConfigured) {
    console.log('\n[WorkSphere] SMTP not configured — printing application-received email instead of sending it:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);
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