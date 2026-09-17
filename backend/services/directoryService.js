const supabase = require('../config/supabase');
const { serializeOrgPublicProfile } = require('../utils/serializers');

const getDirectory = async ({
  user,
  search,
  focusArea
}) => {
  let query = supabase
    .from('organizations')
    .select(
      'id, name, mission_statement, focus_area, city, website, logo_url'
    )
    .eq('status', 'Active')
    .eq('directory_visible', true)
    .order('name', { ascending: true });

  if (user.orgId) {
    query = query.neq('id', user.orgId);
  }

  if (focusArea) {
    query = query.eq('focus_area', focusArea);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      'Could not fetch the organization directory.'
    );
  }

  let results = data || [];

  if (search) {
    const term = search.toLowerCase();

    results = results.filter((org) =>
      org.name.toLowerCase().includes(term) ||
      (org.mission_statement || '').toLowerCase().includes(term)
    );
  }

  return results.map(serializeOrgPublicProfile);
};

const getDirectoryProfile = async ({ orgId }) => {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, mission_statement, focus_area, city, website, logo_url, status, directory_visible'
    )
    .eq('id', orgId)
    .maybeSingle();

  if (
    error ||
    !data ||
    data.status !== 'Active' ||
    !data.directory_visible
  ) {
    const err = new Error('Organization not found.');
    err.statusCode = 404;
    throw err;
  }

  return serializeOrgPublicProfile(data);
};

module.exports = {
  getDirectory,
  getDirectoryProfile
};