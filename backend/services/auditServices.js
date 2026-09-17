const supabase = require('../config/supabase');
const { serializeAuditLog } = require('../utils/serializers');

const getAuditLogs = async ({ user, filters }) => {
  const {
    limit,
    before,
    action,
    entityType,
    orgId
  } = filters;

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);


  if (user.role === 'SuperAdmin') {
    // SuperAdmin can see all audit logs.
    // If orgId is provided, filter to that organization.
    if (orgId) {
      query = query.eq('org_id', orgId);
    }
  } else if (user.role === 'OrgAdmin') {
    // OrgAdmin can ONLY see their own organization's logs.
    if (!user.orgId) {
      return [];
    }

    query = query.eq('org_id', user.orgId);
  }

   if (action) {
    query = query.eq('action', action);
  }

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  /*
   * ----------------------------------------
   * PAGINATION
   * ----------------------------------------
   */

  if (before) {
    query = query.lt('created_at', before);
  }

  /*
   * ----------------------------------------
   * DATABASE QUERY
   * ----------------------------------------
   */

  const { data, error } = await query;

  if (error) {
    console.error('AUDIT LOG SERVICE ERROR:', error);

    throw new Error('Could not fetch audit logs.');
  }

  /*
   * ----------------------------------------
   * SERIALIZE RESPONSE
   * ----------------------------------------
   */

  return (data || []).map(serializeAuditLog);
};

module.exports = {
  getAuditLogs
};