// ============================================================
// Subscription Plan Catalogue — SINGLE SOURCE OF TRUTH.
//
// Every price, AI entitlement, and billing-cycle length used anywhere in
// the app (backend authorization, payment initiation, frontend pricing
// tables) is derived from this file. Do not hardcode a plan price or the
// AI flag anywhere else — import PLANS / getPlan() instead.
//
// To add a new paid plan or feature: add it here, then wire the feature
// key into FEATURES below and check it via canUseFeature() (see
// middleware/subscriptionAccess.js). No other file should need to change.
// ============================================================

const CURRENCY = 'PKR';

// Feature keys the app currently gates by plan. Add new ones here as the
// product grows (e.g. 'advancedAnalytics', 'bulkExport') and list them in
// each plan's `features` array.
const FEATURES = {
  AI_PRESCRIPTIONS: 'ai_prescriptions'
};

const PLANS = {
  Basic: {
    key: 'Basic',
    label: 'Basic Plan',
    price: 10000,
    currency: CURRENCY,
    billingCycle: 'Monthly',
    billingCycleMonths: 1,
    features: [],
    perks: '1 Camp, 15 Users'
  },
  Standard: {
    key: 'Standard',
    label: 'Standard Plan',
    price: 30000,
    currency: CURRENCY,
    billingCycle: 'Monthly',
    billingCycleMonths: 1,
    features: [],
    perks: '5 Camps, 60 Users'
  },
  Premium: {
    key: 'Premium',
    label: 'Premium Plan',
    price: 80000,
    currency: CURRENCY,
    billingCycle: 'Monthly',
    billingCycleMonths: 1,
    features: [FEATURES.AI_PRESCRIPTIONS],
    perks: 'Unlimited Camps & Users + AI Prescription Assistant'
  }
};

// Accepts a plan key ('Basic'), a legacy label ('Basic Plan'), or already
// a canonical key, and returns the plan config or null. Keeps every older
// record (organizations.sub_plan currently stores 'Basic Plan' etc.) and
// every new call site working through one normalizer.
const getPlan = (planIdentifier) => {
  if (!planIdentifier) return null;
  if (PLANS[planIdentifier]) return PLANS[planIdentifier];
  const normalized = String(planIdentifier).replace(/\s*Plan$/i, '').trim();
  return PLANS[normalized] || null;
};

const listPlans = () => Object.values(PLANS);

const isValidPlanKey = (planIdentifier) => Boolean(getPlan(planIdentifier));

module.exports = { PLANS, FEATURES, CURRENCY, getPlan, listPlans, isValidPlanKey };
