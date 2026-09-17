const supabase = require('../config/supabase');

const {
  serializeCamp,
  serializeEvent
} = require('../utils/serializers');

const getPublicEventsAndCamps = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: enabledOrgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('public_events_enabled', true)
    .eq('status', 'Active');

  if (orgErr) {
    const err = new Error('Could not load public events.');
    err.statusCode = 500;
    throw err;
  }

  if (!enabledOrgs || enabledOrgs.length === 0) {
    return [];
  }

  const orgIds = enabledOrgs.map((org) => org.id);

  const orgNameById = Object.fromEntries(
    enabledOrgs.map((org) => [org.id, org.name])
  );

  const [
    { data: camps, error: campErr },
    { data: events, error: eventErr }
  ] = await Promise.all([
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

  if (campErr || eventErr) {
    const err = new Error('Could not load public events.');
    err.statusCode = 500;
    throw err;
  }

  return [
    ...camps.map((camp) => ({
      itemType: 'camp',
      orgName: orgNameById[camp.org_id],
      ...serializeCamp(camp)
    })),

    ...events.map((event) => ({
      itemType: 'event',
      orgName: orgNameById[event.org_id],
      ...serializeEvent(event)
    }))
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 24);
};

module.exports = {
  getPublicEventsAndCamps
};