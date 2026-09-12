const crypto = require('crypto');

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const supabase = require('../config/supabase');

const { serializeUser } = require('../utils/serializers');

const { sendPasswordResetEmail } = require('../utils/mailer');

const { seedDefaultGroups } = require('./discussionController');

const { getPlan } = require('../config/plans');

const { logBillingEvent, BILLING_EVENTS } = require('../utils/billingAudit');

const { getActiveGateway } = require('../utils/paymentGateways');

const genTxnRefNo = () => `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

// NOTE: the 7-day free trial itself is started later, when a SuperAdmin
// approves the organization (see organizationController.updateOrgStatus) —
// not here at raw registration, since a still-Pending org can't log in or
// use the platform yet and shouldn't burn trial days sitting in the queue.

// Roles selectable via the public self-registration form. "Executive
// Director" is intentionally excluded here - that's a leadership title only
// an Organization Admin can grant (via POST /api/users), never something an
// anonymous visitor can request for themselves.

const SELF_REGISTERABLE_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership'
];

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Password policy for the public staff self-registration form:
// exactly 8 characters, with at least one letter and one number.
const STAFF_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8}$/;

const STAFF_PASSWORD_MESSAGE =
  'Password must be exactly 8 characters long and include at least one letter and one number.';

// Password maximum length for all password creation/update endpoints.
const PASSWORD_MAX_LENGTH = 8;

// Email validation.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EMAIL_MESSAGE = 'Please enter a valid email address.';

const PASSWORD_LENGTH_MESSAGE =
  'Password must not exceed 8 characters.';

const isValidEmail = (email) => {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
};

const isValidPasswordLength = (password) => {
  return typeof password === 'string' && password.length <= PASSWORD_MAX_LENGTH;
};

// Very small in-memory throttle to slow down abuse of the forgot-password
// endpoint (e.g. someone hammering it to spam an inbox or brute-force
// enumerate accounts). Keyed by email; resets automatically after the window.

const forgotPasswordAttempts = new Map(); // email -> timestamp of last request

const FORGOT_PASSWORD_COOLDOWN_MS = 60 * 1000; // 1 request per email per minute

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const signToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      orgId: user.org_id,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/login
// body: { email, password, roleDomain } roleDomain: 'SuperAdmin' | 'OrgAdmin' | 'Staff'

const login = async (req, res) => {
  const { email, password, roleDomain } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please enter both email and password.'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: EMAIL_MESSAGE
    });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.'
    });
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password.'
    });
  }

  if (user.status === 'Pending') {
    return res.status(403).json({
      success: false,
      error: 'Your account is pending Admin approval.'
    });
  }

  if (user.status === 'Suspended' || user.status === 'Rejected') {
    return res.status(403).json({
      success: false,
      error: 'Your account access has been restricted.'
    });
  }

  if (roleDomain === 'SuperAdmin' && user.role !== 'SuperAdmin') {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized access to Super Admin Portal.'
    });
  }

  if (roleDomain === 'OrgAdmin' && user.role !== 'OrgAdmin') {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized access to Organization Administration.'
    });
  }

  if (
    roleDomain === 'Staff' &&
    ['SuperAdmin', 'OrgAdmin'].includes(user.role)
  ) {
    return res.status(403).json({
      success: false,
      error: 'Please use the Admin login page.'
    });
  }

  const token = signToken(user);

  // Fire-and-forget: never let login-tracking block the actual login.
  supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .then(({ error: loginErr }) => {
      if (loginErr) {
        console.error(
          '[login] Failed to record last_login_at:',
          loginErr.message
        );
      }
    });

  return res.json({
    success: true,
    token,
    user: serializeUser(user)
  });
};

// POST /api/auth/register-organization
// body: { orgName, adminName, email, password, plan }

const registerOrganization = async (req, res) => {
  const { orgName, adminName, email, password, plan } = req.body;

  if (!orgName || !adminName || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all required fields.'
    });
  }

  // Backend email validation.
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: EMAIL_MESSAGE
    });
  }

  // Backend password maximum-length protection.
  if (!isValidPasswordLength(password)) {
    return res.status(400).json({
      success: false,
      error: PASSWORD_LENGTH_MESSAGE
    });
  }

  const planConfig = getPlan(plan) || getPlan('Basic');

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'Email already registered.'
    });
  }

  // The org sits in 'Pending' until a SuperAdmin approves it — the 7-day
  // free trial (trial_start_date/trial_end_date/payment_due_at) is only
  // set at that approval step, not here.

  const now = new Date();

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      email,
      sub_plan: planConfig.key,
      status: 'Pending',
      payment_status: 'Unpaid',
      subscription_status: 'TrialPending',
      registration_date: now.toISOString(),
      amount_due: planConfig.price,
      plan_price: planConfig.price,
      billing_cycle: planConfig.billingCycle
    })
    .select()
    .single();

  if (orgErr) {
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: adminUser, error: userErr } = await supabase
    .from('users')
    .insert({
      full_name: adminName,
      email,
      password_hash: passwordHash,
      role: 'OrgAdmin',
      org_id: org.id,
      status: 'Pending'
    })
    .select()
    .single();

  if (userErr) {
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }

  // Seed the 3 default discussion channels.
  await seedDefaultGroups(org.id, adminUser.id);

  // Create the org's very first payment record.
  const gateway = getActiveGateway();

  const txnRefNo = genTxnRefNo();

  const { error: paymentErr } = await supabase
    .from('payments')
    .insert({
      org_id: org.id,
      plan: planConfig.key,
      amount: planConfig.price,
      currency: planConfig.currency,
      method: gateway.name,
      gateway: gateway.name,
      status: 'Pending',
      txn_ref_no: txnRefNo,
      org_snapshot_plan: planConfig.key,
      initiated_by: adminUser.id
    });

  if (paymentErr) {
    console.error(
      '[authController] Failed to create initial payment record:',
      paymentErr.message
    );
  }

  await logBillingEvent({
    orgId: org.id,
    userId: adminUser.id,
    eventType: BILLING_EVENTS.ORG_REGISTERED,
    metadata: {
      orgName,
      adminEmail: email
    }
  });

  await logBillingEvent({
    orgId: org.id,
    userId: adminUser.id,
    eventType: BILLING_EVENTS.PLAN_SELECTED,
    amount: planConfig.price,
    currency: planConfig.currency,
    newStatus: 'TrialPending',
    metadata: {
      plan: planConfig.key
    }
  });

  if (!paymentErr) {
    await logBillingEvent({
      orgId: org.id,
      userId: adminUser.id,
      eventType: BILLING_EVENTS.PAYMENT_REQUEST_CREATED,
      amount: planConfig.price,
      currency: planConfig.currency,
      txnRefNo,
      gateway: gateway.name,
      metadata: {
        plan: planConfig.key
      }
    });
  }

  return res.json({
    success: true,
    orgId: org.id,
    plan: planConfig.key,
    amountDue: planConfig.price
  });
};

// POST /api/auth/register-staff
// public self-registration -> goes Pending
// body: { fullName, email, password, role, orgId }

const registerStaff = async (req, res) => {
  const { fullName, email, password, role, orgId } = req.body;

  if (!fullName || !email || !password || !role || !orgId) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all fields.'
    });
  }

  // Backend email validation.
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: EMAIL_MESSAGE
    });
  }

  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role selected.'
    });
  }

  // Staff password must be exactly 8 characters,
  // with at least one letter and one number.
  if (!STAFF_PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      success: false,
      error: STAFF_PASSWORD_MESSAGE
    });
  }

  // Extra backend max-length protection.
  if (!isValidPasswordLength(password)) {
    return res.status(400).json({
      success: false,
      error: PASSWORD_LENGTH_MESSAGE
    });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, status')
    .eq('id', orgId)
    .maybeSingle();

  if (!org || org.status !== 'Active') {
    return res.status(400).json({
      success: false,
      error: 'Please select a currently active organization.'
    });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({
      success: false,
      error: 'Email already registered.'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { error } = await supabase
    .from('users')
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role,
      org_id: orgId,
      status: 'Pending'
    });

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }

  return res.json({
    success: true
  });
};

// POST /api/auth/change-password (protected)
// body: { currentPassword, newPassword }

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Please provide your current and new password.'
    });
  }

  // Preserve existing minimum of 6 characters,
  // but now enforce maximum of 8 characters.
  if (newPassword.length < 6 || newPassword.length > 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be between 6 and 8 characters.'
    });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !user) {
    return res.status(404).json({
      success: false,
      error: 'User not found.'
    });
  }

  const match = await bcrypt.compare(
    currentPassword,
    user.password_hash
  );

  if (!match) {
    return res.status(401).json({
      success: false,
      error: 'Current password is incorrect.'
    });
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  const { error: updateErr } = await supabase
    .from('users')
    .update({
      password_hash: newHash
    })
    .eq('id', user.id);

  if (updateErr) {
    return res.status(500).json({
      success: false,
      error: 'Could not update password. Please try again.'
    });
  }

  return res.json({
    success: true,
    message: 'Password updated successfully.'
  });
};

// GET /api/auth/me (protected) - refetch current user

const me = async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !user) {
    return res.status(404).json({
      success: false,
      error: 'User not found.'
    });
  }

  return res.json({
    success: true,
    user: serializeUser(user)
  });
};

// POST /api/auth/forgot-password
// body: { email }

const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we've sent a password reset link to it.";

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your email address.'
    });
  }

  // Backend email validation.
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: EMAIL_MESSAGE
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Basic per-email cooldown to prevent spamming an inbox / brute-force probing.
  const lastAttempt = forgotPasswordAttempts.get(normalizedEmail);

  if (
    lastAttempt &&
    Date.now() - lastAttempt < FORGOT_PASSWORD_COOLDOWN_MS
  ) {
    // Still return the generic message.
    return res.json({
      success: true,
      message: GENERIC_FORGOT_PASSWORD_MESSAGE
    });
  }

  forgotPasswordAttempts.set(normalizedEmail, Date.now());

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) throw error;

    // Only accounts that can actually log in should be able to reset a password.
    if (user && user.status !== 'Rejected') {
      const rawToken = crypto.randomBytes(32).toString('hex');

      const tokenHash = hashToken(rawToken);

      const expiresAt = new Date(
        Date.now() + RESET_TOKEN_TTL_MS
      ).toISOString();

      const { error: updateErr } = await supabase
        .from('users')
        .update({
          reset_token_hash: tokenHash,
          reset_token_expires: expiresAt
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      const clientUrl =
        process.env.CLIENT_URL || 'http://localhost:5173';

      const resetUrl =
        `${clientUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;

      try {
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.full_name,
          resetUrl
        });
      } catch (mailErr) {
        console.error(
          '[Forgot Password] Failed to send email:',
          mailErr.message
        );
      }
    }

    return res.json({
      success: true,
      message: GENERIC_FORGOT_PASSWORD_MESSAGE
    });
  } catch (err) {
    console.error(
      '[Forgot Password] error:',
      err.message
    );

    return res.json({
      success: true,
      message: GENERIC_FORGOT_PASSWORD_MESSAGE
    });
  }
};

// GET /api/auth/reset-password/:token/validate

const validateResetToken = async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Invalid reset link.'
    });
  }

  const tokenHash = hashToken(token);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, reset_token_expires')
    .eq('reset_token_hash', tokenHash)
    .maybeSingle();

  if (error || !user) {
    return res.status(400).json({
      success: false,
      error: 'This reset link is invalid or has already been used.'
    });
  }

  if (
    new Date(user.reset_token_expires).getTime() < Date.now()
  ) {
    return res.status(400).json({
      success: false,
      error: 'This reset link has expired. Please request a new one.'
    });
  }

  return res.json({
    success: true
  });
};

// POST /api/auth/reset-password
// body: { token, newPassword }

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing reset token or new password.'
    });
  }

  // Preserve existing minimum of 6 characters,
  // but enforce maximum of 8 characters.
  if (newPassword.length < 6 || newPassword.length > 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be between 6 and 8 characters.'
    });
  }

  const tokenHash = hashToken(token);

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('reset_token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'This reset link is invalid or has already been used.'
    });
  }

  if (
    new Date(user.reset_token_expires).getTime() < Date.now()
  ) {
    return res.status(400).json({
      success: false,
      error: 'This reset link has expired. Please request a new one.'
    });
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  // Clear the token (single use) at the same time the password is updated.
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      password_hash: newHash,
      reset_token_hash: null,
      reset_token_expires: null
    })
    .eq('id', user.id);

  if (updateErr) {
    return res.status(500).json({
      success: false,
      error: 'Could not reset password. Please try again.'
    });
  }

  return res.json({
    success: true,
    message:
      'Your password has been reset. You can now log in with your new password.'
  });
};

module.exports = {
  login,
  registerOrganization,
  registerStaff,
  changePassword,
  me,
  forgotPassword,
  validateResetToken,
  resetPassword
};