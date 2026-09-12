const supabase = require('../config/supabase');
const { serializeCamp, serializeEvent } = require('../utils/serializers');

// GET /api/public/events-camps (no auth)
// Only ever returns upcoming camps/events that are BOTH individually
// approved (visibility_status = 'Approved', which also implies is_public)
// AND belong to an organization Super Admin has enabled for public
// visibility (organizations.public_events_enabled). Powers the Home Page
// "Organization Events & Camps" section.
const getPublicEventsAndCamps = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: enabledOrgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('public_events_enabled', true)
    .eq('status', 'Active');

  if (orgErr) return res.status(500).json({ success: false, error: 'Could not load public events.' });
  if (!enabledOrgs || enabledOrgs.length === 0) return res.json({ success: true, items: [] });

  const orgIds = enabledOrgs.map((o) => o.id);
  const orgNameById = Object.fromEntries(enabledOrgs.map((o) => [o.id, o.name]));

  const [{ data: camps, error: campErr }, { data: events, error: eventErr }] = await Promise.all([
    supabase
      .from('camps')
      .select('*')
      .in('org_id', orgIds)
      .eq('visibility_status', 'Approved')
      .neq('status', 'Cancelled')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(20),
    supabase
      .from('events')
      .select('*')
      .in('org_id', orgIds)
      .eq('visibility_status', 'Approved')
      .neq('status', 'Cancelled')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(20)
  ]);

  if (campErr || eventErr) return res.status(500).json({ success: false, error: 'Could not load public events.' });

  const items = [
    ...camps.map((c) => ({ itemType: 'camp', orgName: orgNameById[c.org_id], ...serializeCamp(c) })),
    ...events.map((e) => ({ itemType: 'event', orgName: orgNameById[e.org_id], ...serializeEvent(e) }))
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 24);

  return res.json({ success: true, items });
};

module.exports = { getPublicEventsAndCamps };
