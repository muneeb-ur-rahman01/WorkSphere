const supabase = require('../config/supabase');
const { logBillingEvent, BILLING_EVENTS } = require('./billingAudit');
const { computeSubscriptionView } = require('../middleware/subscriptionAccess');
const { sendTrialExpiringEmail, sendTrialExpiredEmail } = require('./mailer');

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
    const hadTrial = Boolean(org.trial_start_date);

    await supabase
      .from('organizations')
      .update({ subscription_status: 'PastDue', payment_status: 'Unpaid' })
      .eq('id', org.id);

    await logBillingEvent({
      orgId: org.id,
      eventType: hadTrial ? BILLING_EVENTS.TRIAL_EXPIRED : BILLING_EVENTS.PAYMENT_OVERDUE,
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

    if (hadTrial) {
      await supabase.from('notifications').insert([
        {
          org_id: org.id,
          title: 'Free Trial Ended',
          message: 'Your 7-day free trial has ended. Select a subscription plan to restore full access. Your data is safe and unaffected.',
          type: 'Subscription',
          target_role: 'OrgAdmin'
        },
        {
          org_id: null,
          title: 'Organization Trial Expired',
          message: `${org.name}'s free trial has ended and their operations are now locked pending a subscription.`,
          type: 'Subscription',
          target_role: 'SuperAdmin'
        }
      ]);

      const { data: admin } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('org_id', org.id)
        .eq('role', 'OrgAdmin')
        .maybeSingle();

      if (admin?.email) {
        try {
          await sendTrialExpiredEmail({ to: admin.email, fullName: admin.full_name, orgName: org.name });
        } catch (mailErr) {
          console.error('[subscriptionScheduler] Failed to send trial-expired email:', mailErr.message);
        }
      }
    }
  }
};

// Runs hourly alongside suspendOverdueOrganizations(). Emails the OrgAdmin
// once when their trial has 2 or fewer days left (still Active/TrialPending
// and unconverted). Uses last_expiry_notified_at to avoid re-sending every
// hour — the same throttle field the subscription-expiry watcher in
// notificationController.js uses, reused here so both features share one
// "don't spam" mechanism instead of each inventing its own.
const notifyExpiringTrials = async () => {
  const now = new Date();

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('subscription_status', 'TrialPending')
    .not('trial_end_date', 'is', null)
    .gte('trial_end_date', now.toISOString());

  if (error || !orgs || orgs.length === 0) return;

  for (const org of orgs) {
    const subscription = computeSubscriptionView(org);
    if (subscription.trialStatus !== 'Active' || subscription.trialDaysRemaining > 2) continue;

    const lastNotified = org.last_expiry_notified_at ? new Date(org.last_expiry_notified_at) : null;
    const hoursSinceLastNotify = lastNotified ? (now - lastNotified) / (1000 * 60 * 60) : Infinity;
    if (hoursSinceLastNotify < 24) continue;

    const { data: admin } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('org_id', org.id)
      .eq('role', 'OrgAdmin')
      .maybeSingle();

    await supabase.from('notifications').insert({
      org_id: org.id,
      title: 'Free Trial Ending Soon',
      message: `Your free trial ends in ${subscription.trialDaysRemaining} day${subscription.trialDaysRemaining === 1 ? '' : 's'}. Select a plan to avoid any interruption.`,
      type: 'Subscription',
      target_role: 'OrgAdmin'
    });

    if (admin?.email) {
      try {
        await sendTrialExpiringEmail({
          to: admin.email,
          fullName: admin.full_name,
          orgName: org.name,
          daysRemaining: subscription.trialDaysRemaining,
          trialEndDate: org.trial_end_date
        });
      } catch (mailErr) {
        console.error('[subscriptionScheduler] Failed to send trial-expiring email:', mailErr.message);
      }
    }

    await supabase.from('organizations').update({ last_expiry_notified_at: now.toISOString() }).eq('id', org.id);
  }
};

module.exports = { suspendOverdueOrganizations, notifyExpiringTrials };
