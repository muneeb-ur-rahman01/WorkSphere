const supabase = require('../config/supabase');

const { getPlan } = require('../config/plans');

const {
  computeSubscriptionView
} = require('../middleware/subscriptionAccess');

const {
  serializePayment,
  serializeBillingEvent
} = require('../utils/serializers');

// ============================================================
// Billing Overview
// ============================================================

const getBillingOverview = async ({
  status = 'All',
  search = '',
  from,
  to
}) => {
  let orgQuery = supabase
    .from('organizations')
    .select('*')
    .order('registration_date', {
      ascending: false
    });

  if (from) {
    orgQuery = orgQuery.gte(
      'registration_date',
      from
    );
  }

  if (to) {
    orgQuery = orgQuery.lte(
      'registration_date',
      to
    );
  }

  const {
    data: orgs,
    error: orgErr
  } = await orgQuery;

  if (orgErr) {
    console.error(
      '[billingService] Get billing overview failed:',
      orgErr.message
    );

    throw new Error(
      'Could not fetch billing overview.'
    );
  }

  const orgIds = (orgs || []).map(
    (org) => org.id
  );

  const {
    data: payments
  } = orgIds.length
    ? await supabase
        .from('payments')
        .select('*')
        .in('org_id', orgIds)
        .order('created_at', {
          ascending: false
        })
    : { data: [] };

  const latestPaymentByOrg =
    new Map();

  for (const payment of payments || []) {
    if (
      !latestPaymentByOrg.has(
        payment.org_id
      )
    ) {
      latestPaymentByOrg.set(
        payment.org_id,
        payment
      );
    }
  }

  let rows = (orgs || []).map(
    (org) => {
      const subscription =
        computeSubscriptionView(org);

      const latestPayment =
        latestPaymentByOrg.get(
          org.id
        ) || null;

      const plan = getPlan(
        org.sub_plan
      );

      return {
        orgId: org.id,
        orgName: org.name,

        plan:
          plan?.key ||
          org.sub_plan,

        planLabel:
          plan?.label ||
          org.sub_plan,

        planPrice:
          org.plan_price,

        registrationDate:
          org.registration_date,

        paymentDueAt:
          org.payment_due_at,

        paymentStatus:
          org.payment_status,

        paymentAmount:
          latestPayment?.amount ?? null,

        paymentDate:
          latestPayment?.status ===
          'Completed'
            ? latestPayment.updated_at
            : null,

        txnRefNo:
          latestPayment?.txn_ref_no ??
          null,

        gateway:
          latestPayment?.gateway ??
          null,

        subscriptionStart:
          org.subscription_start,

        subscriptionExpiry:
          org.subscription_end,

        overdueDays:
          subscription.overdueDays,

        orgStatus:
          org.status,

        subscriptionStatus:
          subscription.subscriptionStatus,

        trialStatus:
          subscription.trialStatus,

        trialStartDate:
          subscription.trialStartDate,

        trialEndDate:
          subscription.trialEndDate,

        trialDaysRemaining:
          subscription.trialDaysRemaining,

        operationsBlocked:
          subscription.operationsBlocked
      };
    }
  );

  // ============================================================
  // Status Filter
  // ============================================================

  if (
    status &&
    status !== 'All'
  ) {
    if (
      [
        'Trial',
        'Basic',
        'Standard',
        'Premium'
      ].includes(status)
    ) {
      rows = rows.filter(
        (row) =>
          row.plan === status
      );
    } else if (
      status === 'Paid'
    ) {
      rows = rows.filter(
        (row) =>
          row.paymentStatus ===
          'Paid'
      );
    } else if (
      status === 'Pending'
    ) {
      rows = rows.filter(
        (row) =>
          row.subscriptionStatus ===
          'TrialPending'
      );
    } else {
      rows = rows.filter(
        (row) =>
          row.subscriptionStatus ===
          status
      );
    }
  }

  // ============================================================
  // Search Filter
  // ============================================================

  if (
    search &&
    search.trim()
  ) {
    const q =
      search
        .trim()
        .toLowerCase();

    rows = rows.filter(
      (row) =>
        row.orgName
          .toLowerCase()
          .includes(q) ||
        row.orgId
          .toLowerCase()
          .includes(q) ||
        (
          row.txnRefNo &&
          row.txnRefNo
            .toLowerCase()
            .includes(q)
        )
    );
  }

  return rows;
};

// ============================================================
// Organization Billing History
// ============================================================

const getOrgBillingHistory = async ({
  orgId
}) => {
  const [
    {
      data: events,
      error: evErr
    },
    {
      data: payments,
      error: payErr
    }
  ] = await Promise.all([
    supabase
      .from('billing_events')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', {
        ascending: false
      }),

    supabase
      .from('payments')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', {
        ascending: false
      })
  ]);

  if (evErr || payErr) {
    console.error(
      '[billingService] Get billing history failed:',
      evErr?.message ||
        payErr?.message
    );

    throw new Error(
      'Could not fetch billing history.'
    );
  }

  return {
    events: (events || []).map(
      serializeBillingEvent
    ),

    payments: (payments || []).map(
      serializePayment
    )
  };
};

module.exports = {
  getBillingOverview,
  getOrgBillingHistory
};