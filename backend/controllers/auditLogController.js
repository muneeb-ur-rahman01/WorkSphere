const supabase = require('../config/supabase');
const { serializeAuditLog } = require('../utils/serializers');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// GET /api/audit-logs?limit=&before=&action=&entityType=&orgId=
// SuperAdmin: platform-wide, optionally filtered to one org via ?orgId=.
// OrgAdmin: always scoped to their own organization — org isolation is
// enforced here, not just hidden in the UI (see spec section 20).
const getAuditLogs = async (req, res) => {
  const { limit, before, action, entityType } = req.query;
  const take = Math.min(parseInt(limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(take);

  if (req.user.role === 'SuperAdmin') {
    if (req.query.orgId) query = query.eq('org_id', req.query.orgId);
  } else if (req.user.role === 'OrgAdmin') {
    if (!req.user.orgId) return res.json({ success: true, logs: [] });
    query = query.eq('org_id', req.user.orgId);
  } else {
    return res.status(403).json({ success: false, error: 'You are not authorized to view audit logs.' });
  }

  if (action) query = query.eq('action', action);
  if (entityType) query = query.eq('entity_type', entityType);
  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch audit logs.' });

  return res.json({ success: true, logs: data.map(serializeAuditLog) });
};

module.exports = { getAuditLogs };
