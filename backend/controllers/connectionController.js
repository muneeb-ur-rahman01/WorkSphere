const supabase = require('../config/supabase');
const { serializeOrgConnection, serializeOrgMessage } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// GET /api/connections — every connection where the caller's org is either side.
// Includes denormalized requesterOrgName/targetOrgName so the UI can show
// "who" without a second directory lookup per row.
const getConnections = async (req, res) => {
  if (!req.user.orgId) return res.json({ success: true, connections: [] });

  const { data, error } = await supabase
    .from('org_connections')
    .select('*')
    .or(`requester_org_id.eq.${req.user.orgId},target_org_id.eq.${req.user.orgId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch connections.' });
  if (data.length === 0) return res.json({ success: true, connections: [] });

  const orgIds = [...new Set(data.flatMap((c) => [c.requester_org_id, c.target_org_id]))];
  const { data: orgs } = await supabase.from('organizations').select('id, name').in('id', orgIds);
  const nameById = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));

  return res.json({
    success: true,
    connections: data.map((c) => ({
      ...serializeOrgConnection(c),
      requesterOrgName: nameById[c.requester_org_id] || 'Unknown organization',
      targetOrgName: nameById[c.target_org_id] || 'Unknown organization'
    }))
  });
};

// POST /api/connections (OrgAdmin)  body: { targetOrgId, message }
const createConnectionRequest = async (req, res) => {
  const { targetOrgId, message } = req.body;
  if (!targetOrgId) return res.status(400).json({ success: false, error: 'targetOrgId is required.' });
  if (targetOrgId === req.user.orgId) return res.status(400).json({ success: false, error: "You can't connect with your own organization." });

  const { data: targetOrg } = await supabase
    .from('organizations').select('id, name, status, directory_visible').eq('id', targetOrgId).maybeSingle();
  if (!targetOrg || targetOrg.status !== 'Active' || !targetOrg.directory_visible) {
    return res.status(404).json({ success: false, error: 'Organization not found.' });
  }

  // Avoid duplicate open requests between the same two orgs.
  const { data: existing } = await supabase
    .from('org_connections')
    .select('id')
    .or(`and(requester_org_id.eq.${req.user.orgId},target_org_id.eq.${targetOrgId}),and(requester_org_id.eq.${targetOrgId},target_org_id.eq.${req.user.orgId})`)
    .in('status', ['Pending', 'Accepted'])
    .maybeSingle();
  if (existing) return res.status(400).json({ success: false, error: 'A connection with this organization already exists.' });

  const { data: connection, error } = await supabase
    .from('org_connections')
    .insert({
      requester_org_id: req.user.orgId, target_org_id: targetOrgId,
      initial_message: message || null, requested_by: req.user.id, status: 'Pending'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not send connection request.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.CONNECTION_REQUESTED,
    entityType: 'org_connection', entityId: connection.id, entityLabel: `Request to ${targetOrg.name}`
  });

  return res.json({ success: true, connection: serializeOrgConnection(connection) });
};

// PATCH /api/connections/:id/status (OrgAdmin, target org only)  body: { status: 'Accepted' | 'Declined' }
const respondToConnection = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Accepted', 'Declined'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status.' });

  const { data: connection } = await supabase.from('org_connections').select('*').eq('id', id).maybeSingle();
  if (!connection) return res.status(404).json({ success: false, error: 'Connection not found.' });
  if (connection.target_org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Only the requested organization can respond to this request.' });
  }
  if (connection.status !== 'Pending') return res.status(400).json({ success: false, error: 'This request has already been resolved.' });

  const { data: updated, error } = await supabase
    .from('org_connections')
    .update({ status, responded_by: req.user.id, responded_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update connection.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId,
    action: status === 'Accepted' ? AUDIT_ACTIONS.CONNECTION_ACCEPTED : AUDIT_ACTIONS.CONNECTION_DECLINED,
    entityType: 'org_connection', entityId: id
  });

  return res.json({ success: true, connection: serializeOrgConnection(updated) });
};

// DELETE /api/connections/:id (OrgAdmin, requester only, while still Pending)
const withdrawConnection = async (req, res) => {
  const { id } = req.params;
  const { data: connection } = await supabase.from('org_connections').select('*').eq('id', id).maybeSingle();
  if (!connection) return res.status(404).json({ success: false, error: 'Connection not found.' });
  if (connection.requester_org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Only the organization that sent the request can withdraw it.' });
  }

  const { data: updated, error } = await supabase
    .from('org_connections').update({ status: 'Withdrawn' }).eq('id', id).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not withdraw connection.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.CONNECTION_WITHDRAWN,
    entityType: 'org_connection', entityId: id
  });

  return res.json({ success: true, connection: serializeOrgConnection(updated) });
};

// ============================================================
// Messaging — only once a connection is Accepted, keeping unsolicited
// org-to-org contact limited to the single initial request message.
// ============================================================

const assertParticipant = async (connectionId, orgId) => {
  const { data: connection } = await supabase.from('org_connections').select('*').eq('id', connectionId).maybeSingle();
  if (!connection) return { error: 'Connection not found.', code: 404 };
  if (connection.requester_org_id !== orgId && connection.target_org_id !== orgId) {
    return { error: 'Not authorized for this connection.', code: 403 };
  }
  if (connection.status !== 'Accepted') return { error: 'This connection is not active.', code: 400 };
  return { connection };
};

// GET /api/connections/:id/messages
const getMessages = async (req, res) => {
  const { id } = req.params;
  const { error, code } = await assertParticipant(id, req.user.orgId);
  if (error) return res.status(code).json({ success: false, error });

  const { data, error: fetchErr } = await supabase
    .from('org_messages').select('*').eq('connection_id', id).order('created_at', { ascending: true });
  if (fetchErr) return res.status(500).json({ success: false, error: 'Could not fetch messages.' });
  return res.json({ success: true, messages: data.map(serializeOrgMessage) });
};

// POST /api/connections/:id/messages  body: { message }
const sendMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message is required.' });

  const { error, code } = await assertParticipant(id, req.user.orgId);
  if (error) return res.status(code).json({ success: false, error });

  const { data: msg, error: insertErr } = await supabase
    .from('org_messages')
    .insert({ connection_id: id, sender_org_id: req.user.orgId, sender_user_id: req.user.id, message })
    .select()
    .single();
  if (insertErr) return res.status(500).json({ success: false, error: 'Could not send message.' });

  return res.json({ success: true, message: serializeOrgMessage(msg) });
};

module.exports = {
  getConnections, createConnectionRequest, respondToConnection, withdrawConnection,
  getMessages, sendMessage
};
