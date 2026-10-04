const supabase = require('../config/supabase');

// Insert a notification; a repeated dedupe_key (e.g. a re-delivered webhook or
// a page reload that re-checks overdue invoices) is silently ignored.
const notifyOnce = async (row) => {
  const { error } = await supabase.from('notifications').insert({ type: 'GeneralAlert', target_role: 'All', ...row });
  if (error && error.code !== '23505') console.error('[notify] failed:', error.message);
};
const notifyAdmins = (orgId, title, message, extra = {}) =>
  notifyOnce({ org_id: orgId, title, message, target_role: 'OrgAdmin', ...extra });
const notifyUser = (orgId, userId, title, message, extra = {}) =>
  notifyOnce({ org_id: orgId, title, message, target_user_id: userId, ...extra });

module.exports = { notifyOnce, notifyAdmins, notifyUser };
