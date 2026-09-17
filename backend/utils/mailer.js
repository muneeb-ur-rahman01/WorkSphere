const { BrevoClient } = require('@getbrevo/brevo');

require('dotenv').config();

// ============================================================
// WorkSphere Mailer
// Sends transactional emails via Brevo HTTPS API.
// Configure:
// BREVO_API_KEY
// BREVO_FROM_EMAIL
// BREVO_FROM_NAME
// in backend/.env
// ============================================================

const brevoApiKey = process.env.BREVO_API_KEY;

const FROM_EMAIL =
  process.env.BREVO_FROM_EMAIL || 'worksphere.thf@gmail.com';

const FROM_NAME =
  process.env.BREVO_FROM_NAME || 'WorkSphere';

const isConfigured = !!brevoApiKey;

let brevo = null;

if (isConfigured) {
  brevo = new BrevoClient({
    apiKey: brevoApiKey
  });

  console.log('[WorkSphere] Brevo config check:', {
    apiKey: 'SET',
    fromEmail: FROM_EMAIL,
    fromName: FROM_NAME
  });
} else {
  console.warn(
    '[WorkSphere] WARNING: BREVO_API_KEY is not set. ' +
    'Emails will be logged to the console instead of actually being sent.'
  );
}

// ============================================================
// Common Brevo sender
// ============================================================

const sendEmail = async ({
  to,
  subject,
  text,
  html
}) => {
  if (!isConfigured) {
    console.log('\n[WorkSphere] Brevo not configured — email will not be sent:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}\n`);

    return {
      delivered: false,
      reason: 'BREVO_NOT_CONFIGURED'
    };
  }

  try {
    console.log('[WorkSphere] Sending email via Brevo:', {
      to,
      subject
    });

    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: FROM_NAME,
        email: FROM_EMAIL
      },
      to: [
        {
          email: to
        }
      ],
      subject,
      textContent: text,
      htmlContent: html
    });

    console.log('[WorkSphere] Brevo email sent successfully:', {
      messageId: result?.messageId || result?.message_id || 'UNKNOWN'
    });

    return {
      delivered: true,
      messageId: result?.messageId || result?.message_id
    };
  } catch (error) {
    console.error('[WorkSphere] Brevo email FAILED:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      response: error.response,
      body: error.body
    });

    throw error;
  }
};

// ============================================================
// Password reset email
// ============================================================

const sendPasswordResetEmail = async ({
  to,
  fullName,
  resetUrl
}) => {
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
      Hello ${fullName ? escapeHtml(fullName) : 'there'},
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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
};

// ============================================================
// Registration accepted
// ============================================================

// Sent when an OrgAdmin approves a pending staff registration request
// (Employee/Intern/Volunteer/Membership signing up for a specific org).
const sendRegistrationAcceptedEmail = async ({
  to,
  fullName,
  orgName
}) => {
  const subject = 'Your WorkSphere registration has been approved';

  const LOGO_URL = 'https://work-sphere-self.vercel.app/logo.png';

  const text =
    `Hello ${fullName || 'there'},\n\n` +
    `Your registration request for ${orgName || 'your organization'} has been approved.\n\n` +
    `You can now log in to WorkSphere using the credentials you provided during registration.\n\n` +
    `Organization: ${orgName || 'N/A'}\n` +
    `Email: ${to}\n` +
    `Login: Please visit WorkSphere to log in.\n\n` +
    `Your account is now active and ready to use.\n\n` +
    `This is an automated message from WorkSphere. Please do not reply to this email.\n\n` +
    `Best Regards,\n` +
    `WorkSphere\n` +
    `Workforce Management & Organizational Operations Platform`;

  const html = `
    <div style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

        <div style="background:#ffffff;border-radius:14px;padding:40px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">

          <!-- LOGO -->
          <div style="text-align:center;margin-bottom:28px;">
            <img
              src="${LOGO_URL}"
              alt="WorkSphere"
              style="display:block;width:90px;height:90px;object-fit:contain;margin:0 auto;"
            />
          </div>

          <h2 style="margin:0 0 24px;color:#4338ca;font-size:24px;text-align:center;">
            Registration Approved
          </h2>

          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
            Hello ${fullName ? escapeHtml(fullName) : 'there'},
          </p>

          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;">
            Your registration request for
            <strong>${orgName ? escapeHtml(orgName) : 'your organization'}</strong>
            has been approved.
          </p>

          <p style="font-size:15px;line-height:1.7;margin:0 0 24px;">
            You can now log in to WorkSphere using the credentials you provided during registration.
          </p>

          <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:24px 0;">

            <p style="margin:0 0 12px;font-size:14px;">
              <strong>Organization:</strong>
              ${orgName ? escapeHtml(orgName) : 'N/A'}
            </p>

            <p style="margin:0 0 12px;font-size:14px;">
              <strong>Email:</strong>
              ${escapeHtml(to)}
            </p>

            <p style="margin:0;font-size:14px;">
              <strong>Login:</strong>
              Please visit WorkSphere to log in.
            </p>

          </div>

          <p style="font-size:15px;line-height:1.7;margin:0 0 24px;">
            Your account is now active and ready to use.
          </p>

          <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 28px;">
            This is an automated message from WorkSphere.
            Please do not reply to this email.
          </p>

          <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
            <p style="font-size:14px;line-height:1.6;margin:0;color:#374151;">
              Best Regards,<br/>
              <strong>WorkSphere</strong><br/>
              Workforce Management &amp; Organizational Operations Platform
            </p>
          </div>

        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    text,
    html
  });
};

// ============================================================
// Registration rejected
// ============================================================

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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
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

// ============================================================
// Trial started
// ============================================================

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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
};

// ============================================================
// Trial expiring
// ============================================================

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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
};

// ============================================================
// Trial expired
// ============================================================

// Sent the moment a trial expires without an active paid subscription.
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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
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

  return sendEmail({
    to,
    subject: emailSubject,
    text,
    html
  });
};

// ============================================================
// Query response
// ============================================================

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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
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

  return sendEmail({
    to,
    subject,
    text,
    html
  });
};

// ============================================================
// HTML escape helper
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Exports
// ============================================================

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