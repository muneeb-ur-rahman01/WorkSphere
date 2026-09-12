const supabase = require('../config/supabase');
const { serializeOrgPublicProfile } = require('../utils/serializers');

// GET /api/directory?search=&focusArea=
// Any authenticated OrgAdmin/staff member can browse — this never exposes
// anything beyond the public-safe profile fields (see serializeOrgPublicProfile),
// and only Active + directory_visible organizations appear, excluding the
// caller's own org (nothing to "discover" about yourself).
const getDirectory = async (req, res) => {
  let query = supabase
    .from('organizations')
    .select('id, name, mission_statement, focus_area, city, website, logo_url')
    .eq('status', 'Active')
    .eq('directory_visible', true)
    .order('name', { ascending: true });

  if (req.user.orgId) query = query.neq('id', req.user.orgId);
  if (req.query.focusArea) query = query.eq('focus_area', req.query.focusArea);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch the organization directory.' });

  let results = data;
  if (req.query.search) {
    const term = req.query.search.toLowerCase();
    results = results.filter((o) =>
      o.name.toLowerCase().includes(term) || (o.mission_statement || '').toLowerCase().includes(term)
    );
  }

  return res.json({ success: true, organizations: results.map(serializeOrgPublicProfile) });
};

// GET /api/directory/:orgId — single public profile
const getDirectoryProfile = async (req, res) => {
  const { orgId } = req.params;
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, mission_statement, focus_area, city, website, logo_url, status, directory_visible')
    .eq('id', orgId)
    .maybeSingle();

  if (error || !data || data.status !== 'Active' || !data.directory_visible) {
    return res.status(404).json({ success: false, error: 'Organization not found.' });
  }

  return res.json({ success: true, organization: serializeOrgPublicProfile(data) });
};

module.exports = { getDirectory, getDirectoryProfile };
