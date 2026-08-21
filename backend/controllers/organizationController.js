const supabase = require('../config/supabase');
const { serializeOrg } = require('../utils/serializers');
const { computeSubscriptionView } = require('../middleware/subscriptionAccess');

// GET /api/organizations/public (no auth - powers the public staff self-registration form)
// Returns only the minimal, non-sensitive fields (id + name) for organizations
// that are currently Active, so the "Select Organization" dropdown always
// reflects real active orgs, independent of whether the visitor is logged in.
const getPublicOrganizations = async (req, res) => {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('status', 'Active')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch organizations.' });
  return res.json({ success: true, organizations: data });
};

// GET /api/organizations/me (any authenticated org member - OrgAdmin/Employee/Intern/Volunteer)
// Includes a computed `subscription` block (due date, overdue days, whether
// the payment reminder should show) so the dashboard doesn't need a second
// round trip or its own copy of the overdue-days math.
const getMyOrganization = async (req, res) => {
  if (!req.user.orgId) return res.json({ success: true, organization: null });
  const { data, error } = await supabase.from('organizations').select('*').eq('id', req.user.orgId).maybeSingle();
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch organization.' });
  if (!data) return res.json({ success: true, organization: null });

  return res.json({
    success: true,
    organization: { ...serializeOrg(data), subscription: computeSubscriptionView(data) }
  });
};

// GET /api/organizations (SuperAdmin only)
const getOrganizations = async (req, res) => {
  const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch organizations.' });
  return res.json({ success: true, organizations: data.map(serializeOrg) });
};

// PATCH /api/organizations/:id/status  body: { status }
const updateOrgStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Active', 'Pending', 'Suspended'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }

  const { error } = await supabase.from('organizations').update({ status }).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update organization status.' });

  // Mirror behaviour of the original app: activating/suspending an org cascades to its users
  if (status === 'Active') {
    await supabase.from('users').update({ status: 'Active' }).eq('org_id', id).eq('role', 'OrgAdmin');
  } else if (status === 'Suspended') {
    await supabase.from('users').update({ status: 'Suspended' }).eq('org_id', id);
  }

  return res.json({ success: true });
};

// DELETE /api/organizations/:id
const deleteOrganization = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('organizations').delete().eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete organization.' });
  return res.json({ success: true });
};

module.exports = { getPublicOrganizations, getMyOrganization, getOrganizations, updateOrgStatus, deleteOrganization };
