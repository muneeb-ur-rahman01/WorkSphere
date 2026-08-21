const supabase = require('../config/supabase');
const { logBillingEvent, BILLING_EVENTS } = require('./billingAudit');

// Runs on boot and then hourly (see server.js), alongside the existing
// checkExpiringSubscriptions() watcher in notificationController.js.
//
// Finds every organization whose payment_due_at has passed while it is
// still TrialPending or Active (i.e. the 10-day signup window, or a
// billing-cycle renewal, elapsed without a successful payment) and moves
// it to PastDue. This is the ONLY place that flips an org into PastDue —
// everywhere else (requireOperational, canUseFeature, the reminder banner)
// just reads subscription_status, so the blocking behaviour stays
// consistent no matter which route the org hits.
//
// Org data is never deleted or altered beyond these billing fields.
const suspendOverdueOrganizations = async () => {
  const now = new Date().toISOString();

  const { data: overdueOrgs, error } = await supabase
    .from('organizations')
    .select('id, name, subscription_status, payment_due_at, amount_due, sub_plan')
    .in('subscription_status', ['TrialPending', 'Active'])
    .not('payment_due_at', 'is', null)
    .lt('payment_due_at', now);

  if (error) {
    console.error('[subscriptionScheduler] Failed to query overdue organizations:', error.message);
    return;
  }
  if (!overdueOrgs || overdueOrgs.length === 0) return;

  for (const org of overdueOrgs) {
    const previousStatus = org.subscription_status;

    await supabase
      .from('organizations')
      .update({ subscription_status: 'PastDue', payment_status: 'Unpaid' })
      .eq('id', org.id);

    await logBillingEvent({
      orgId: org.id,
      eventType: BILLING_EVENTS.PAYMENT_OVERDUE,
      amount: org.amount_due,
      previousStatus,
      newStatus: 'PastDue',
      metadata: { plan: org.sub_plan }
    });
    await logBillingEvent({
      orgId: org.id,
      eventType: BILLING_EVENTS.ORG_SUSPENDED,
      previousStatus,
      newStatus: 'PastDue'
    });
  }
};

module.exports = { suspendOverdueOrganizations };
