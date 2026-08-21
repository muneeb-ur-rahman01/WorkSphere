const supabase = require('../config/supabase');
const { serializeNotification } = require('../utils/serializers');

// GET /api/notifications
// SuperAdmin: sees system-wide broadcasts (org_id is null)
// OrgAdmin/Staff: sees their org's notifications
const getNotifications = async (req, res) => {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });

  if (req.user.role === 'SuperAdmin') {
    query = query.is('org_id', null);
  } else {
    query = query.eq('org_id', req.user.orgId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch notifications.' });
  return res.json({ success: true, notifications: data.map(serializeNotification) });
};

// POST /api/notifications (OrgAdmin custom alert) body: { title, message, targetRole, type }
const sendCustomAlert = async (req, res) => {
  const { title, message, targetRole, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, error: 'Title and message are required.' });
  }

  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({
      org_id: req.user.orgId,
      title,
      message,
      type: type || 'General',
      target_role: targetRole || 'All'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not send notification.' });
  return res.json({ success: true, notification: serializeNotification(notif) });
};

// ============================================================
// Subscription expiry watcher
// Runs periodically (see server.js). For every Active organization whose
// subscription_end falls within the next 7 days, it:
//   1) drops a notification into that org's dashboard (target: OrgAdmin)
//   2) drops a system-wide (org_id = null) notification for SuperAdmin
// last_expiry_notified_at is used so we only alert once every 24h per org,
// instead of spamming a new row every polling cycle.
// ============================================================
const checkExpiringSubscriptions = async () => {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'Active')
    .not('subscription_end', 'is', null)
    .lte('subscription_end', soon.toISOString())
    .gte('subscription_end', now.toISOString());

  if (error || !orgs || orgs.length === 0) return;

  for (const org of orgs) {
    const lastNotified = org.last_expiry_notified_at ? new Date(org.last_expiry_notified_at) : null;
    const hoursSinceLastNotify = lastNotified ? (now - lastNotified) / (1000 * 60 * 60) : Infinity;
    if (hoursSinceLastNotify < 24) continue; // already nudged recently

    const expiryDate = new Date(org.subscription_end).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    await supabase.from('notifications').insert([
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

    await supabase.from('organizations').update({ last_expiry_notified_at: now.toISOString() }).eq('id', org.id);
  }
};

module.exports = { getNotifications, sendCustomAlert, checkExpiringSubscriptions };
