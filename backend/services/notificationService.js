const supabase = require('../config/supabase');

const { serializeNotification } = require('../utils/serializers');

const getNotifications = async ({ user }) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (user.role === 'SuperAdmin') {
    query = query.is('org_id', null);
  } else {
    query = query.eq('org_id', user.orgId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch notifications.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeNotification);
};

const sendCustomAlert = async ({
  user,
  title,
  message,
  targetRole,
  type
}) => {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      org_id: user.orgId,
      title,
      message,
      type: type || 'General',
      target_role: targetRole || 'All'
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not send notification.');
    err.statusCode = 500;
    throw err;
  }

  return serializeNotification(notification);
};

const checkExpiringSubscriptions = async () => {
  const now = new Date();

  const soon = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  );

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'Active')
    .not('subscription_end', 'is', null)
    .lte('subscription_end', soon.toISOString())
    .gte('subscription_end', now.toISOString());

  if (error || !orgs || orgs.length === 0) {
    return;
  }

  for (const org of orgs) {
    const lastNotified = org.last_expiry_notified_at
      ? new Date(org.last_expiry_notified_at)
      : null;

    const hoursSinceLastNotify = lastNotified
      ? (now - lastNotified) / (1000 * 60 * 60)
      : Infinity;

    if (hoursSinceLastNotify < 24) {
      continue;
    }

    const expiryDate = new Date(
      org.subscription_end
    ).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    await supabase
      .from('notifications')
      .insert([
        {
          org_id: org.id,
          title: 'Subscription Expiring Soon',
          message: `Your ${org.sub_plan} plan expires on ${expiryDate}. Please renew to avoid any service interruption.`,
          type: 'Subscription',
          target_role: 'OrgAdmin'
        },
        {
          org_id: null,
          title: 'Organization Plan Expiring',
          message: `${org.name}'s ${org.sub_plan} plan expires on ${expiryDate}.`,
          type: 'Subscription',
          target_role: 'SuperAdmin'
        }
      ]);

    await supabase
      .from('organizations')
      .update({
        last_expiry_notified_at: now.toISOString()
      })
      .eq('id', org.id);
  }
};

module.exports = {
  getNotifications,
  sendCustomAlert,
  checkExpiringSubscriptions
};