const supabase = require('../config/supabase');
const { serializeCamp, serializeEvent } = require('../utils/serializers');

const TABLES = {
  camp: 'camps',
  event: 'events'
};

const serializeItem = (itemType, row) =>
  itemType === 'camp'
    ? { itemType, ...serializeCamp(row) }
    : { itemType, ...serializeEvent(row) };

const requestVisibility = async ({ user, itemType, itemId }) => {
  const table = TABLES[itemType];

  const { data: item, error: fetchErr } = await supabase
    .from(table)
    .select('*')
    .eq('id', itemId)
    .eq('org_id', user.orgId)
    .maybeSingle();

  if (fetchErr || !item) {
    const err = new Error('Camp/event not found.');
    err.statusCode = 404;
    throw err;
  }

  if (item.visibility_status === 'Pending') {
    const err = new Error('A visibility request is already pending for this item.');
    err.statusCode = 400;
    throw err;
  }

  const { data: updated, error } = await supabase
    .from(table)
    .update({
      visibility_status: 'Pending',
      visibility_requested_at: new Date().toISOString(),
      visibility_reviewed_at: null,
      visibility_rejection_reason: null
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not submit the visibility request.');
    err.statusCode = 500;
    throw err;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', user.orgId)
    .maybeSingle();

  await supabase.from('notifications').insert({
    org_id: null,
    title: 'New Visibility Request',
    message: `${org?.name || 'An organization'} requested public visibility for the ${itemType} "${item.title}".`,
    type: 'VisibilityRequest',
    target_role: 'SuperAdmin'
  });

  return serializeItem(itemType, updated);
};

const getMyVisibilityRequests = async ({ user }) => {
  const [
    { data: camps, error: campErr },
    { data: events, error: eventErr }
  ] = await Promise.all([
    supabase
      .from('camps')
      .select('*')
      .eq('org_id', user.orgId)
      .neq('visibility_status', 'None'),

    supabase
      .from('events')
      .select('*')
      .eq('org_id', user.orgId)
      .neq('visibility_status', 'None')
  ]);

  if (campErr || eventErr) {
    const err = new Error('Could not fetch visibility requests.');
    err.statusCode = 500;
    throw err;
  }

  const items = [
    ...camps.map((c) => serializeItem('camp', c)),
    ...events.map((e) => serializeItem('event', e))
  ].sort(
    (a, b) =>
      new Date(b.visibilityRequestedAt || 0) -
      new Date(a.visibilityRequestedAt || 0)
  );

  return items;
};

const getVisibilityRequests = async ({ status = 'Pending' }) => {
  let campQuery = supabase
    .from('camps')
    .select('*, organizations(name)');

  let eventQuery = supabase
    .from('events')
    .select('*, organizations(name)');

  if (status !== 'All') {
    campQuery = campQuery.eq('visibility_status', status);
    eventQuery = eventQuery.eq('visibility_status', status);
  } else {
    campQuery = campQuery.neq('visibility_status', 'None');
    eventQuery = eventQuery.neq('visibility_status', 'None');
  }

  const [
    { data: camps, error: campErr },
    { data: events, error: eventErr }
  ] = await Promise.all([
    campQuery,
    eventQuery
  ]);

  if (campErr || eventErr) {
    const err = new Error('Could not fetch visibility requests.');
    err.statusCode = 500;
    throw err;
  }

  const items = [
    ...camps.map((c) => ({
      ...serializeItem('camp', c),
      orgName: c.organizations?.name
    })),
    ...events.map((e) => ({
      ...serializeItem('event', e),
      orgName: e.organizations?.name
    }))
  ].sort(
    (a, b) =>
      new Date(b.visibilityRequestedAt || 0) -
      new Date(a.visibilityRequestedAt || 0)
  );

  return items;
};

const reviewVisibilityRequest = async ({
  itemType,
  itemId,
  decision,
  reason
}) => {
  const table = TABLES[itemType];

  const { data: item, error: fetchErr } = await supabase
    .from(table)
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (fetchErr || !item) {
    const err = new Error('Camp/event not found.');
    err.statusCode = 404;
    throw err;
  }

  const { data: updated, error } = await supabase
    .from(table)
    .update({
      visibility_status: decision,
      is_public: decision === 'Approved',
      visibility_reviewed_at: new Date().toISOString(),
      visibility_rejection_reason:
        decision === 'Rejected' ? reason || null : null
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not review the visibility request.');
    err.statusCode = 500;
    throw err;
  }

  await supabase.from('notifications').insert({
    org_id: item.org_id,
    title:
      decision === 'Approved'
        ? 'Visibility Request Approved'
        : 'Visibility Request Rejected',
    message:
      decision === 'Approved'
        ? `Your ${itemType} "${item.title}" is now visible on the public Home Page.`
        : `Your ${itemType} "${item.title}" visibility request was rejected.${
            reason ? ` Reason: ${reason}` : ''
          }`,
    type: 'VisibilityRequest',
    target_role: 'OrgAdmin'
  });

  return serializeItem(itemType, updated);
};

module.exports = {
  requestVisibility,
  getMyVisibilityRequests,
  getVisibilityRequests,
  reviewVisibilityRequest
};