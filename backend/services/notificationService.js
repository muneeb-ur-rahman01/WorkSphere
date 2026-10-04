const supabase = require('../config/supabase');

const { serializeNotification } = require('../utils/serializers');

// Which notifications may this user see? (unchanged rules)
//  - staff-tier: addressed to them, or broadcast to "All"/their role
//  - admins: broadcasts plus anything addressed to them personally
const isVisibleTo = (user, n) => {
  if (user.role !== 'SuperAdmin' && user.role !== 'OrgAdmin') {
    return n.target_user_id
      ? String(n.target_user_id) === String(user.id)
      : n.target_role === 'All' || n.target_role === user.role;
  }
  return !n.target_user_id || String(n.target_user_id) === String(user.id);
};

const fetchVisible = async (user, limit = 200) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (user.role === 'SuperAdmin') {
    query = query.is('org_id', null);
  } else {
    query = query.eq('org_id', user.orgId);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    const err = new Error('Could not fetch notifications.');
    err.statusCode = 500;
    throw err;
  }
  return data.filter((n) => isVisibleTo(user, n));
};

const getNotifications = async ({ user }) => {
  const visible = await fetchVisible(user);
  const ids = visible.map((n) => n.id);
  const { data: reads } = ids.length
    ? await supabase.from('notification_reads').select('notification_id').eq('user_id', user.id).in('notification_id', ids)
    : { data: [] };
  const readSet = new Set((reads || []).map((r) => r.notification_id));
  return visible.map((n) => ({
    ...serializeNotification(n),
    link: n.link || undefined,
    read: readSet.has(n.id)
  }));
};

// Read receipts are per user and only for notifications that user may see.
const markRead = async ({ user, id }) => {
  const { data: n } = await supabase.from('notifications').select('*').eq('id', id).maybeSingle();
  const sameScope = n && (user.role === 'SuperAdmin' ? n.org_id === null : n.org_id === user.orgId);
  if (!n || !sameScope || !isVisibleTo(user, n)) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }
  await supabase
    .from('notification_reads')
    .upsert({ notification_id: id, user_id: user.id }, { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
};

const markAllRead = async ({ user }) => {
  const visible = await fetchVisible(user, 500);
  if (!visible.length) return { marked: 0 };
  const rows = visible.map((n) => ({ notification_id: n.id, user_id: user.id }));
  const { error } = await supabase
    .from('notification_reads')
    .upsert(rows, { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
  if (error) {
    const err = new Error('Could not mark notifications as read.');
    err.statusCode = 500;
    throw err;
  }
  return { marked: rows.length };
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
  markRead,
  markAllRead,
  sendCustomAlert,
  checkExpiringSubscriptions
};