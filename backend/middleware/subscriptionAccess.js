const supabase = require('../config/supabase');
const { getPlan } = require('../config/plans');

// ============================================================
// Centralized subscription/feature-access authorization.
//
// This is the ONLY place that decides whether an organization can use a
// paid feature or perform normal operations. Every route that needs to
// enforce billing state — not just hide a button in the UI — goes through
// requireOperational / requireFeature below, so a user can't bypass the
// restriction by calling the API directly.
//
// Subscription lifecycle (organizations.subscription_status):
//   TrialPending -> Active      (payment verified during/after the 7-day trial)
//   TrialPending -> PastDue     (7-day trial window elapsed, unpaid)
//   Active       -> PastDue     (renewal period elapsed, unpaid)
//   PastDue      -> Suspended   (extended non-payment; reserved for manual/future use)
//   PastDue/Suspended -> Active (payment verified — see paymentController.handleCallback)
//   *            -> Cancelled   (org cancels; reserved for future use)
//
// Free trial (organizations.trial_start_date / trial_end_date):
//   Set exactly once, when a SuperAdmin approves an org (status -> Active
//   for the first time) — see organizationController.updateOrgStatus.
//   payment_due_at is kept in sync with trial_end_date so the existing
//   hourly sweep (subscriptionScheduler.suspendOverdueOrganizations) and
//   requireOperational() below enforce trial expiry with no separate state
//   machine. Derived trialStatus: Active | Expired | Converted | null
//   (null = trial hasn't started yet, e.g. org still Pending approval).
// ============================================================

const BLOCKED_STATUSES = ['PastDue', 'Suspended', 'Cancelled', 'Expired'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRIAL_PERIOD_DAYS = 7;

// Billing-driven access blocking (requireOperational) is OFF again, to
// match the frontend PAYMENTS_ENABLED flag in
// frontend/src/Config/constant.js — with the Payment Method screens
// hidden, there's no visible way for an org to actually pay, so locking
// them out on trial/payment expiry would trap them. Keep both flags in
// sync; flip both back to true together when payments come back online.
const PAYMENT_ENFORCEMENT_ENABLED = false;

// Pure function — no I/O — so it's easy to reuse from the scheduler, the
// dashboard endpoint, and the middleware without duplicating the logic.
const computeSubscriptionView = (org) => {
  const now = new Date();
  const dueAt = org.payment_due_at ? new Date(org.payment_due_at) : null;
  const registeredAt = org.registration_date ? new Date(org.registration_date) : null;
  const trialStartAt = org.trial_start_date ? new Date(org.trial_start_date) : null;
  const trialEndAt = org.trial_end_date ? new Date(org.trial_end_date) : null;

  const isOverdue = Boolean(dueAt) && now > dueAt && !['Active'].includes(org.subscription_status);
  const overdueDays = isOverdue ? Math.floor((now - dueAt) / MS_PER_DAY) : 0;
  const plan = getPlan(org.sub_plan);
  const operationsBlocked = BLOCKED_STATUSES.includes(org.subscription_status);

  const daysSinceRegistration = registeredAt ? Math.floor((now - registeredAt) / MS_PER_DAY) : null;
  const daysUntilDue = dueAt ? Math.ceil((dueAt - now) / MS_PER_DAY) : null;

  // Trial status: Converted once a real paid subscription is Active,
  // Active while inside the 7-day window, Expired once it's passed and
  // the org still isn't Active, null if the trial hasn't started yet.
  let trialStatus = null;
  if (trialStartAt) {
    if (org.subscription_status === 'Active') trialStatus = 'Converted';
    else if (trialEndAt && now <= trialEndAt) trialStatus = 'Active';
    else trialStatus = 'Expired';
  }
  const trialDaysRemaining =
    trialStatus === 'Active' && trialEndAt ? Math.max(0, Math.ceil((trialEndAt - now) / MS_PER_DAY)) : 0;
  const trialDaysElapsed =
    trialStartAt ? Math.min(TRIAL_PERIOD_DAYS, Math.max(0, Math.floor((now - trialStartAt) / MS_PER_DAY))) : 0;

  // Reminder rules (see backend/utils/subscriptionScheduler.js for the
  // matching email side):
  //   Trial days 1-5   -> silent, no reminder.
  //   Trial days 6-7   -> show the in-app reminder ("trial ending soon").
  //   Trial expired, still unpaid -> subscription_status flips to PastDue
  //     via the hourly sweep, operationsBlocked becomes true, and the UI
  //     shows the blocking "select a plan to continue" state instead.
  const shouldShowPaymentReminder =
    !operationsBlocked && trialStatus === 'Active' && trialDaysRemaining <= 2;

  return {
    subscriptionStatus: org.subscription_status || 'TrialPending',
    operationsBlocked,
    isOverdue,
    overdueDays,
    amountDue: org.amount_due ?? plan?.price ?? null,
    paymentDueAt: org.payment_due_at,
    daysSinceRegistration,
    daysUntilDue,
    trialStatus,
    trialStartDate: org.trial_start_date,
    trialEndDate: org.trial_end_date,
    trialDaysRemaining,
    trialDaysElapsed,
    trialPeriodDays: TRIAL_PERIOD_DAYS,
    plan: plan ? { key: plan.key, label: plan.label, price: plan.price, features: plan.features } : null,
    shouldShowPaymentReminder
  };
};

// The single source of truth for "can this org use this paid feature right
// now?" — combines plan entitlement AND current payment status. A Premium
// org that has fallen PastDue loses AI access immediately, without any
// separate check needed at each call site.
const canUseFeature = (organization, featureKey) => {
  if (!organization) return false;
  if (organization.subscription_status !== 'Active') return false;
  const plan = getPlan(organization.sub_plan);
  if (!plan) return false;
  return plan.features.includes(featureKey);
};

// Attaches req.organization + req.subscription for downstream handlers.
// SuperAdmin has no org and is always allowed through untouched.
const loadSubscriptionContext = async (req, res, next) => {
  if (!req.user || !req.user.orgId) {
    req.organization = null;
    req.subscription = null;
    return next();
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', req.user.orgId)
    .maybeSingle();

  if (error || !org) {
    return res.status(404).json({ success: false, error: 'Organization not found.' });
  }

  req.organization = org;
  req.subscription = computeSubscriptionView(org);
  next();
};

// Blocks normal operational routes (camps, events, tasks, etc.) once an
// org's subscription is PastDue/Suspended/Cancelled/Expired. Data is never
// deleted — only writes/reads through this middleware are blocked, and
// billing/payment endpoints stay reachable so the admin can pay and
// self-restore access (see paymentController.handleCallback).
const requireOperational = () => async (req, res, next) => {
  if (!PAYMENT_ENFORCEMENT_ENABLED) return next();
  if (req.user?.role === 'SuperAdmin') return next();

  if (!req.subscription) {
    await loadSubscriptionContext(req, res, () => {});
    if (res.headersSent) return; // loadSubscriptionContext already responded (404)
  }

  if (!req.subscription) return next(); // no org (shouldn't happen for these roles) — let the route's own checks handle it

  if (req.subscription.operationsBlocked) {
    const message =
      req.subscription.trialStatus === 'Expired'
        ? 'Your 7-day free trial has ended. Please select a subscription plan to continue using CampOS.'
        : 'Your organization\'s subscription payment is overdue. Please complete payment to restore access.';
    return res.status(402).json({
      success: false,
      error: message,
      code: 'SUBSCRIPTION_PAYMENT_REQUIRED',
      subscription: req.subscription
    });
  }

  next();
};

// Blocks a specific paid feature (e.g. AI prescriptions) unless the org's
// plan includes it AND payment is currently active — independent of
// requireOperational, so it can also gate a feature for an org that is
// otherwise in good standing on a lower-tier plan.
const requireFeature = (featureKey) => async (req, res, next) => {
  if (req.user?.role === 'SuperAdmin') return next();

  if (!req.organization) {
    await loadSubscriptionContext(req, res, () => {});
    if (res.headersSent) return;
  }

  if (!canUseFeature(req.organization, featureKey)) {
    return res.status(403).json({
      success: false,
      error: 'This feature requires an active Premium subscription.',
      code: 'FEATURE_NOT_AUTHORIZED'
    });
  }

  next();
};

module.exports = {
  BLOCKED_STATUSES,
  TRIAL_PERIOD_DAYS,
  PAYMENT_ENFORCEMENT_ENABLED,
  computeSubscriptionView,
  canUseFeature,
  loadSubscriptionContext,
  requireOperational,
  requireFeature
};
