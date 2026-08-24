const supabase = require('../config/supabase');

// ============================================================
// Accessibility / Section Permissions
//
// Lets an OrgAdmin grant an individual staff member access to a specific
// dashboard section beyond what their role would normally see (e.g. give
// an HR Employee access to "Registration Requests"). This is the single
// source of truth for which section keys exist - add an entry here to
// make a new dashboard section assignable, no other backend change needed.
// ============================================================
const ASSIGNABLE_SECTIONS = [
  { key: 'registration_requests', label: 'Registration Requests', description: 'Review and approve/reject incoming staff registration requests.' },
  { key: 'camps', label: 'Camps', description: 'Create, edit, and manage medical camps and staff availability.' },
  { key: 'events', label: 'Events', description: 'Create, edit, and manage organization events.' },
  { key: 'meetings', label: 'Meetings', description: 'Create, edit, and manage organization meetings.' }
  // Add more sections here as they become permission-aware, e.g.:
  // { key: 'tasks', label: 'Tasks', description: 'Assign and track staff tasks.' }
];

const isAssignableSection = (key) => ASSIGNABLE_SECTIONS.some((s) => s.key === key);

// GET /api/permissions/sections (any authenticated user)
const getAssignableSections = async (req, res) => {
  return res.json({ success: true, sections: ASSIGNABLE_SECTIONS });
};

// GET /api/permissions/me (any authenticated user) - sections granted to the caller
const getMyPermissions = async (req, res) => {
  if (!req.user.orgId) return res.json({ success: true, sections: [] });

  const { data, error } = await supabase
    .from('staff_permissions')
    .select('section_key')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch permissions.' });
  return res.json({ success: true, sections: data.map((r) => r.section_key) });
};

// GET /api/permissions?userId=... (OrgAdmin) - sections granted to a specific staff member
const getUserPermissions = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId is required.' });

  const { data: target } = await supabase.from('users').select('org_id').eq('id', userId).maybeSingle();
  if (!target || target.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized for this user.' });
  }

  const { data, error } = await supabase.from('staff_permissions').select('section_key').eq('user_id', userId);
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch permissions.' });
  return res.json({ success: true, sections: data.map((r) => r.section_key) });
};

// POST /api/permissions  body: { userId, sectionKey }  (OrgAdmin grants access)
const grantPermission = async (req, res) => {
  const { userId, sectionKey } = req.body;
  if (!userId || !sectionKey) {
    return res.status(400).json({ success: false, error: 'userId and sectionKey are required.' });
  }
  if (!isAssignableSection(sectionKey)) {
    return res.status(400).json({ success: false, error: 'Invalid section.' });
  }

  const { data: target } = await supabase.from('users').select('org_id, full_name').eq('id', userId).maybeSingle();
  if (!target || target.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized for this user.' });
  }

  const { error } = await supabase
    .from('staff_permissions')
    .upsert(
      { org_id: req.user.orgId, user_id: userId, section_key: sectionKey, granted_by: req.user.id },
      { onConflict: 'user_id,section_key' }
    );
  if (error) return res.status(500).json({ success: false, error: 'Could not grant access.' });

  const sectionLabel = ASSIGNABLE_SECTIONS.find((s) => s.key === sectionKey)?.label || sectionKey;
  await supabase.from('notifications').insert({
    org_id: req.user.orgId,
    target_user_id: userId,
    title: 'New Dashboard Access Granted',
    message: `You've been given access to "${sectionLabel}" by your organization admin.`,
    type: 'Accessibility',
    target_role: 'All'
  });

  return res.json({ success: true });
};

// DELETE /api/permissions  body: { userId, sectionKey }  (OrgAdmin revokes access)
const revokePermission = async (req, res) => {
  const { userId, sectionKey } = req.body;
  if (!userId || !sectionKey) {
    return res.status(400).json({ success: false, error: 'userId and sectionKey are required.' });
  }

  const { data: target } = await supabase.from('users').select('org_id').eq('id', userId).maybeSingle();
  if (!target || target.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized for this user.' });
  }

  const { error } = await supabase
    .from('staff_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('section_key', sectionKey);
  if (error) return res.status(500).json({ success: false, error: 'Could not revoke access.' });
  return res.json({ success: true });
};

module.exports = {
  ASSIGNABLE_SECTIONS,
  isAssignableSection,
  getAssignableSections,
  getMyPermissions,
  getUserPermissions,
  grantPermission,
  revokePermission
};
