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

const REGISTRATION_PAYMENT_PERIOD_DAYS = 10;

// Roles selectable via the public self-registration form. "Executive
// Director" is intentionally excluded here - that's a leadership title only
// an Organization Admin can grant (via POST /api/users), never something an
// anonymous visitor can request for themselves.
const SELF_REGISTERABLE_ROLES = ['Employee', 'Intern', 'Volunteer', 'Membership'];

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Password policy for the public staff self-registration form: at least 8
// characters, with at least one letter and one number. Keep in sync with
// frontend/src/utils/passwordValidation.js (which shows the same rule
// client-side before the request is even sent).
const STAFF_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const STAFF_PASSWORD_MESSAGE =
  'Password must be at least 8 characters long and include at least one letter and one number.';

// Very small in-memory throttle to slow down abuse of the forgot-password
// endpoint (e.g. someone hammering it to spam an inbox or brute-force
// enumerate accounts). Keyed by email; resets automatically after the window.
const forgotPasswordAttempts = new Map(); // email -> timestamp of last request
const FORGOT_PASSWORD_COOLDOWN_MS = 60 * 1000; // 1 request per email per minute

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role, orgId: user.org_id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/login
// body: { email, password, roleDomain } roleDomain: 'SuperAdmin' | 'OrgAdmin' | 'Staff'
const login = async (req, res) => {
  const { email, password, roleDomain } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please enter both email and password.' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  if (!user) return res.status(401).json({ success: false, error: 'Invalid email or password.' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ success: false, error: 'Invalid email or password.' });

  if (user.status === 'Pending') {
    return res.status(403).json({ success: false, error: 'Your account is pending Admin approval.' });
  }
  if (user.status === 'Suspended' || user.status === 'Rejected') {
    return res.status(403).json({ success: false, error: 'Your account access has been restricted.' });
  }

  if (roleDomain === 'SuperAdmin' && user.role !== 'SuperAdmin') {
    return res.status(403).json({ success: false, error: 'Unauthorized access to Super Admin Portal.' });
  }
  if (roleDomain === 'OrgAdmin' && user.role !== 'OrgAdmin') {
    return res.status(403).json({ success: false, error: 'Unauthorized access to Organization Administration.' });
  }
  if (roleDomain === 'Staff' && ['SuperAdmin', 'OrgAdmin'].includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Please use the Admin login page.' });
  }

  const token = signToken(user);
  return res.json({ success: true, token, user: serializeUser(user) });
};

// POST /api/auth/register-organization
// body: { orgName, adminName, email, password, plan }
const registerOrganization = async (req, res) => {
  const { orgName, adminName, email, password, plan } = req.body;
  if (!orgName || !adminName || !email || !password) {
    return res.status(400).json({ success: false, error: 'Please fill in all required fields.' });
  }

  const planConfig = getPlan(plan) || getPlan('Basic');

  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
  if (existing) return res.status(409).json({ success: false, error: 'Email already registered.' });

  // Every new org gets a 10-day window to pay before operations are
  // blocked (see backend/middleware/subscriptionAccess.js and the hourly
  // sweep in backend/utils/subscriptionScheduler.js).
  const now = new Date();
  const paymentDueAt = new Date(now.getTime() + REGISTRATION_PAYMENT_PERIOD_DAYS * 24 * 60 * 60 * 1000);

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
      payment_due_at: paymentDueAt.toISOString(),
      amount_due: planConfig.price,
      plan_price: planConfig.price,
      billing_cycle: planConfig.billingCycle
    })
    .select()
    .single();

  if (orgErr) return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const { data: adminUser, error: userErr } = await supabase.from('users').insert({
    full_name: adminName,
    email,
    password_hash: passwordHash,
    role: 'OrgAdmin',
    org_id: org.id,
    status: 'Pending' // activated once SuperAdmin approves the organization
  }).select().single();

  if (userErr) return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });

  // Seed the 3 default discussion channels (Software Dev / Public Health /
  // Open Discussion) so the org has a working Discussion tab from day one.
  await seedDefaultGroups(org.id, adminUser.id);

  // Create the org's very first payment record right away — a 'Pending'
  // invoice for the plan they picked at signup — so the Billing → Payment
  // History table is never empty, regardless of which plan (Basic /
  // Standard / Premium) was chosen. This row is picked up and reused (not
  // duplicated) the moment the OrgAdmin clicks "Pay Now", since
  // initiatePayment() already looks for an existing Pending payment for the
  // same org+plan before minting a new one (see paymentController.js).
  const gateway = getActiveGateway();
  const txnRefNo = genTxnRefNo();
  const { error: paymentErr } = await supabase.from('payments').insert({
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
    console.error('[authController] Failed to create initial payment record:', paymentErr.message);
  }

  await logBillingEvent({
    orgId: org.id,
    userId: adminUser.id,
    eventType: BILLING_EVENTS.ORG_REGISTERED,
    metadata: { orgName, adminEmail: email }
  });
  await logBillingEvent({
    orgId: org.id,
    userId: adminUser.id,
    eventType: BILLING_EVENTS.PLAN_SELECTED,
    amount: planConfig.price,
    currency: planConfig.currency,
    newStatus: 'TrialPending',
    metadata: { plan: planConfig.key, paymentDueAt: paymentDueAt.toISOString() }
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
      metadata: { plan: planConfig.key }
    });
  }

  return res.json({ success: true, orgId: org.id, plan: planConfig.key, paymentDueAt: paymentDueAt.toISOString(), amountDue: planConfig.price });
};

// POST /api/auth/register-staff  (public self-registration -> goes Pending)
// body: { fullName, email, password, role, orgId }
const registerStaff = async (req, res) => {
  const { fullName, email, password, role, orgId } = req.body;
  if (!fullName || !email || !password || !role || !orgId) {
    return res.status(400).json({ success: false, error: 'Please fill in all fields.' });
  }
  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role selected.' });
  }
  if (!STAFF_PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ success: false, error: STAFF_PASSWORD_MESSAGE });
  }

  const { data: org } = await supabase.from('organizations').select('id, status').eq('id', orgId).maybeSingle();
  if (!org || org.status !== 'Active') {
    return res.status(400).json({ success: false, error: 'Please select a currently active organization.' });
  }

  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
  if (existing) return res.status(409).json({ success: false, error: 'Email already registered.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const { error } = await supabase.from('users').insert({
    full_name: fullName,
    email,
    password_hash: passwordHash,
    role,
    org_id: orgId,
    status: 'Pending' // a Registration Request - the org's admin must approve it before this account can log in
  });

  if (error) return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  return res.json({ success: true });
};

// POST /api/auth/change-password (protected)
// body: { currentPassword, newPassword }
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Please provide your current and new password.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
  }

  const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  if (error || !user) return res.status(404).json({ success: false, error: 'User not found.' });

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return res.status(401).json({ success: false, error: 'Current password is incorrect.' });

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error: updateErr } = await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id);
  if (updateErr) return res.status(500).json({ success: false, error: 'Could not update password. Please try again.' });

  return res.json({ success: true, message: 'Password updated successfully.' });
};

// GET /api/auth/me (protected) - refetch current user (used after login/refresh)
const me = async (req, res) => {
  const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  if (error || !user) return res.status(404).json({ success: false, error: 'User not found.' });
  return res.json({ success: true, user: serializeUser(user) });
};

// POST /api/auth/forgot-password
// body: { email }
// Always responds with the same generic success message whether or not the
// email is registered, so this endpoint can't be used to enumerate accounts.
const GENERIC_FORGOT_PASSWORD_MESSAGE =
  "If an account exists for that email, we've sent a password reset link to it.";

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Please enter your email address.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // Basic per-email cooldown to prevent spamming an inbox / brute-force probing.
  const lastAttempt = forgotPasswordAttempts.get(normalizedEmail);
  if (lastAttempt && Date.now() - lastAttempt < FORGOT_PASSWORD_COOLDOWN_MS) {
    // Still return the generic message - don't reveal that throttling kicked in
    // for a specific address, just slow down the actual send.
    return res.json({ success: true, message: GENERIC_FORGOT_PASSWORD_MESSAGE });
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
      const rawToken = crypto.randomBytes(32).toString('hex'); // sent to the user, never stored
      const tokenHash = hashToken(rawToken); // only the hash is persisted
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

      const { error: updateErr } = await supabase
        .from('users')
        .update({ reset_token_hash: tokenHash, reset_token_expires: expiresAt })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password/${rawToken}`;

      try {
        await sendPasswordResetEmail({ to: user.email, fullName: user.full_name, resetUrl });
      } catch (mailErr) {
        console.error('[Forgot Password] Failed to send email:', mailErr.message);
        // Don't leak delivery failures to the client - still respond generically.
      }
    }

    return res.json({ success: true, message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  } catch (err) {
    console.error('[Forgot Password] error:', err.message);
    // Even on unexpected errors, avoid confirming/denying account existence.
    return res.json({ success: true, message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  }
};

// GET /api/auth/reset-password/:token/validate
// Lets the frontend check a token is valid *before* showing the reset form,
// without consuming it, so a stale/broken link gives a clear message upfront.
const validateResetToken = async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ success: false, error: 'Invalid reset link.' });

  const tokenHash = hashToken(token);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, reset_token_expires')
    .eq('reset_token_hash', tokenHash)
    .maybeSingle();

  if (error || !user) {
    return res.status(400).json({ success: false, error: 'This reset link is invalid or has already been used.' });
  }

  if (new Date(user.reset_token_expires).getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'This reset link has expired. Please request a new one.' });
  }

  return res.json({ success: true });
};

// POST /api/auth/reset-password
// body: { token, newPassword }
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, error: 'Missing reset token or new password.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
  }

  const tokenHash = hashToken(token);

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('reset_token_hash', tokenHash)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, error: 'Server error. Please try again.' });
  if (!user) {
    return res.status(400).json({ success: false, error: 'This reset link is invalid or has already been used.' });
  }
  if (new Date(user.reset_token_expires).getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'This reset link has expired. Please request a new one.' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  // Clear the token (single use) at the same time the password is updated.
  const { error: updateErr } = await supabase
    .from('users')
    .update({ password_hash: newHash, reset_token_hash: null, reset_token_expires: null })
    .eq('id', user.id);

  if (updateErr) {
    return res.status(500).json({ success: false, error: 'Could not reset password. Please try again.' });
  }

  return res.json({ success: true, message: 'Your password has been reset. You can now log in with your new password.' });
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
