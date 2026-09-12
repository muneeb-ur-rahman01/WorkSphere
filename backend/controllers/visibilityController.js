const supabase = require('../config/supabase');
const { serializeCamp, serializeEvent } = require('../utils/serializers');

const TABLES = { camp: 'camps', event: 'events' };
const serializeItem = (itemType, row) =>
  itemType === 'camp'
    ? { itemType, ...serializeCamp(row) }
    : { itemType, ...serializeEvent(row) };

// POST /api/visibility-requests (OrgAdmin)  body: { itemType: 'camp'|'event', itemId }
// Submits (or re-submits after a rejection) a request for the given camp/event
// to be shown in the public Home Page Events & Camps section.
const requestVisibility = async (req, res) => {
  const { itemType, itemId } = req.body;
  const table = TABLES[itemType];
  if (!table) return res.status(400).json({ success: false, error: 'itemType must be "camp" or "event".' });

  const { data: item, error: fetchErr } = await supabase
    .from(table)
    .select('*')
    .eq('id', itemId)
    .eq('org_id', req.user.orgId)
    .maybeSingle();
  if (fetchErr || !item) return res.status(404).json({ success: false, error: 'Camp/event not found.' });

  if (item.visibility_status === 'Pending') {
    return res.status(400).json({ success: false, error: 'A visibility request is already pending for this item.' });
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

  if (error) return res.status(500).json({ success: false, error: 'Could not submit the visibility request.' });

  const { data: org } = await supabase.from('organizations').select('name').eq('id', req.user.orgId).maybeSingle();

  await supabase.from('notifications').insert({
    org_id: null,
    title: 'New Visibility Request',
    message: `${org?.name || 'An organization'} requested public visibility for the ${itemType} "${item.title}".`,
    type: 'VisibilityRequest',
    target_role: 'SuperAdmin'
  });

  return res.json({ success: true, item: serializeItem(itemType, updated) });
};

// GET /api/visibility-requests/mine (OrgAdmin) — all camps/events belonging
// to the org that have ever had a visibility request (i.e. not 'None'), for
// the "Request Event/Camp Visibility" status list.
const getMyVisibilityRequests = async (req, res) => {
  const [{ data: camps, error: campErr }, { data: events, error: eventErr }] = await Promise.all([
    supabase.from('camps').select('*').eq('org_id', req.user.orgId).neq('visibility_status', 'None'),
    supabase.from('events').select('*').eq('org_id', req.user.orgId).neq('visibility_status', 'None')
  ]);
  if (campErr || eventErr) return res.status(500).json({ success: false, error: 'Could not fetch visibility requests.' });

  const items = [
    ...camps.map((c) => serializeItem('camp', c)),
    ...events.map((e) => serializeItem('event', e))
  ].sort((a, b) => new Date(b.visibilityRequestedAt || 0) - new Date(a.visibilityRequestedAt || 0));

  return res.json({ success: true, requests: items });
};

// GET /api/visibility-requests (SuperAdmin)  query: status=Pending|Approved|Rejected|All
const getVisibilityRequests = async (req, res) => {
  const { status = 'Pending' } = req.query;

  let campQuery = supabase.from('camps').select('*, organizations(name)');
  let eventQuery = supabase.from('events').select('*, organizations(name)');
  if (status !== 'All') {
    campQuery = campQuery.eq('visibility_status', status);
    eventQuery = eventQuery.eq('visibility_status', status);
  } else {
    campQuery = campQuery.neq('visibility_status', 'None');
    eventQuery = eventQuery.neq('visibility_status', 'None');
  }

  const [{ data: camps, error: campErr }, { data: events, error: eventErr }] = await Promise.all([campQuery, eventQuery]);
  if (campErr || eventErr) return res.status(500).json({ success: false, error: 'Could not fetch visibility requests.' });

  const items = [
    ...camps.map((c) => ({ ...serializeItem('camp', c), orgName: c.organizations?.name })),
    ...events.map((e) => ({ ...serializeItem('event', e), orgName: e.organizations?.name }))
  ].sort((a, b) => new Date(b.visibilityRequestedAt || 0) - new Date(a.visibilityRequestedAt || 0));

  return res.json({ success: true, requests: items });
};

// PATCH /api/visibility-requests/review (SuperAdmin)
// body: { itemType: 'camp'|'event', itemId, decision: 'Approved'|'Rejected', reason }
const reviewVisibilityRequest = async (req, res) => {
  const { itemType, itemId, decision, reason } = req.body;
  const table = TABLES[itemType];
  if (!table) return res.status(400).json({ success: false, error: 'itemType must be "camp" or "event".' });
  if (!['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ success: false, error: 'decision must be "Approved" or "Rejected".' });
  }

  const { data: item, error: fetchErr } = await supabase.from(table).select('*').eq('id', itemId).maybeSingle();
  if (fetchErr || !item) return res.status(404).json({ success: false, error: 'Camp/event not found.' });

  const { data: updated, error } = await supabase
    .from(table)
    .update({
      visibility_status: decision,
      is_public: decision === 'Approved',
      visibility_reviewed_at: new Date().toISOString(),
      visibility_rejection_reason: decision === 'Rejected' ? (reason || null) : null
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not review the visibility request.' });

  await supabase.from('notifications').insert({
    org_id: item.org_id,
    title: decision === 'Approved' ? 'Visibility Request Approved' : 'Visibility Request Rejected',
    message:
      decision === 'Approved'
        ? `Your ${itemType} "${item.title}" is now visible on the public Home Page.`
        : `Your ${itemType} "${item.title}" visibility request was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'VisibilityRequest',
    target_role: 'OrgAdmin'
  });

  return res.json({ success: true, item: serializeItem(itemType, updated) });
};

module.exports = { requestVisibility, getMyVisibilityRequests, getVisibilityRequests, reviewVisibilityRequest };
