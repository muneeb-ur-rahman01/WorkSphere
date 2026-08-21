const supabase = require('../config/supabase');
const { getPlan } = require('../config/plans');
const { computeSubscriptionView } = require('../middleware/subscriptionAccess');
const { serializePayment, serializeBillingEvent } = require('../utils/serializers');

// GET /api/billing/overview (SuperAdmin only)
// query: status=All|Paid|Pending|PastDue|Suspended|Premium|Standard|Basic
//        search=<org name | org id | txn ref no>
//        from=<ISO date>, to=<ISO date>  (filters by registration_date)
const getBillingOverview = async (req, res) => {
  const { status = 'All', search = '', from, to } = req.query;

  let orgQuery = supabase.from('organizations').select('*').order('registration_date', { ascending: false });
  if (from) orgQuery = orgQuery.gte('registration_date', from);
  if (to) orgQuery = orgQuery.lte('registration_date', to);

  const { data: orgs, error: orgErr } = await orgQuery;
  if (orgErr) return res.status(500).json({ success: false, error: 'Could not fetch billing overview.' });

  // Latest payment per org, for txn ref / gateway / payment-date columns.
  const orgIds = orgs.map((o) => o.id);
  const { data: payments } = orgIds.length
    ? await supabase.from('payments').select('*').in('org_id', orgIds).order('created_at', { ascending: false })
    : { data: [] };

  const latestPaymentByOrg = new Map();
  for (const p of payments || []) {
    if (!latestPaymentByOrg.has(p.org_id)) latestPaymentByOrg.set(p.org_id, p);
  }

  let rows = orgs.map((org) => {
    const subscription = computeSubscriptionView(org);
    const latestPayment = latestPaymentByOrg.get(org.id) || null;
    const plan = getPlan(org.sub_plan);

    return {
      orgId: org.id,
      orgName: org.name,
      plan: plan?.key || org.sub_plan,
      planLabel: plan?.label || org.sub_plan,
      planPrice: org.plan_price,
      registrationDate: org.registration_date,
      paymentDueAt: org.payment_due_at,
      paymentStatus: org.payment_status,
      paymentAmount: latestPayment?.amount ?? null,
      paymentDate: latestPayment?.status === 'Completed' ? latestPayment.updated_at : null,
      txnRefNo: latestPayment?.txn_ref_no ?? null,
      gateway: latestPayment?.gateway ?? null,
      subscriptionStart: org.subscription_start,
      subscriptionExpiry: org.subscription_end,
      overdueDays: subscription.overdueDays,
      orgStatus: org.status,
      subscriptionStatus: subscription.subscriptionStatus
    };
  });

  // Status filter: billing-lifecycle statuses OR plan-name shortcuts OR 'Paid'/'Pending'
  if (status && status !== 'All') {
    if (['Basic', 'Standard', 'Premium'].includes(status)) {
      rows = rows.filter((r) => r.plan === status);
    } else if (status === 'Paid') {
      rows = rows.filter((r) => r.paymentStatus === 'Paid');
    } else if (status === 'Pending') {
      rows = rows.filter((r) => r.subscriptionStatus === 'TrialPending');
    } else {
      rows = rows.filter((r) => r.subscriptionStatus === status);
    }
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.orgName.toLowerCase().includes(q) ||
        r.orgId.toLowerCase().includes(q) ||
        (r.txnRefNo && r.txnRefNo.toLowerCase().includes(q))
    );
  }

  return res.json({ success: true, organizations: rows });
};

// GET /api/billing/organizations/:orgId/history
// SuperAdmin sees any org; OrgAdmin/staff can only see their own org's history.
const getOrgBillingHistory = async (req, res) => {
  const { orgId } = req.params;
  if (req.user.role !== 'SuperAdmin' && req.user.orgId !== orgId) {
    return res.status(403).json({ success: false, error: 'You are not authorized to view this billing history.' });
  }

  const [{ data: events, error: evErr }, { data: payments, error: payErr }] = await Promise.all([
    supabase.from('billing_events').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  ]);

  if (evErr || payErr) return res.status(500).json({ success: false, error: 'Could not fetch billing history.' });

  return res.json({
    success: true,
    events: (events || []).map(serializeBillingEvent),
    payments: (payments || []).map(serializePayment)
  });
};

module.exports = { getBillingOverview, getOrgBillingHistory };
