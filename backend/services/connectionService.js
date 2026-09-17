const supabase = require('../config/supabase');
const {
  serializeOrgConnection,
  serializeOrgMessage
} = require('../utils/serializers');
const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const getConnections = async ({ user }) => {
  if (!user.orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from('org_connections')
    .select('*')
    .or(
      `requester_org_id.eq.${user.orgId},target_org_id.eq.${user.orgId}`
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Could not fetch connections.');
  }

  if (!data || data.length === 0) {
    return [];
  }

  const orgIds = [
    ...new Set(
      data.flatMap((connection) => [
        connection.requester_org_id,
        connection.target_org_id
      ])
    )
  ];

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', orgIds);

  const nameById = Object.fromEntries(
    (orgs || []).map((org) => [org.id, org.name])
  );

  return data.map((connection) => ({
    ...serializeOrgConnection(connection),
    requesterOrgName:
      nameById[connection.requester_org_id] || 'Unknown organization',
    targetOrgName:
      nameById[connection.target_org_id] || 'Unknown organization'
  }));
};

const createConnectionRequest = async ({
  user,
  targetOrgId,
  message
}) => {
  if (targetOrgId === user.orgId) {
    const error = new Error(
      "You can't connect with your own organization."
    );
    error.statusCode = 400;
    throw error;
  }

  const { data: targetOrg } = await supabase
    .from('organizations')
    .select('id, name, status, directory_visible')
    .eq('id', targetOrgId)
    .maybeSingle();

  if (
    !targetOrg ||
    targetOrg.status !== 'Active' ||
    !targetOrg.directory_visible
  ) {
    const error = new Error('Organization not found.');
    error.statusCode = 404;
    throw error;
  }

  // Avoid duplicate open requests between the same two organizations.
  const { data: existing } = await supabase
    .from('org_connections')
    .select('id')
    .or(
      `and(requester_org_id.eq.${user.orgId},target_org_id.eq.${targetOrgId}),and(requester_org_id.eq.${targetOrgId},target_org_id.eq.${user.orgId})`
    )
    .in('status', ['Pending', 'Accepted'])
    .maybeSingle();

  if (existing) {
    const error = new Error(
      'A connection with this organization already exists.'
    );
    error.statusCode = 400;
    throw error;
  }

  const { data: connection, error: insertError } = await supabase
    .from('org_connections')
    .insert({
      requester_org_id: user.orgId,
      target_org_id: targetOrgId,
      initial_message: message || null,
      requested_by: user.id,
      status: 'Pending'
    })
    .select()
    .single();

  if (insertError) {
    throw new Error('Could not send connection request.');
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.CONNECTION_REQUESTED,
    entityType: 'org_connection',
    entityId: connection.id,
    entityLabel: `Request to ${targetOrg.name}`
  });

  return serializeOrgConnection(connection);
};

const respondToConnection = async ({
  user,
  id,
  status
}) => {
  const { data: connection } = await supabase
    .from('org_connections')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!connection) {
    const error = new Error('Connection not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.target_org_id !== user.orgId) {
    const error = new Error(
      'Only the requested organization can respond to this request.'
    );
    error.statusCode = 403;
    throw error;
  }

  if (connection.status !== 'Pending') {
    const error = new Error(
      'This request has already been resolved.'
    );
    error.statusCode = 400;
    throw error;
  }

  const { data: updated, error } = await supabase
    .from('org_connections')
    .update({
      status,
      responded_by: user.id,
      responded_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Could not update connection.');
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action:
      status === 'Accepted'
        ? AUDIT_ACTIONS.CONNECTION_ACCEPTED
        : AUDIT_ACTIONS.CONNECTION_DECLINED,
    entityType: 'org_connection',
    entityId: id
  });

  return serializeOrgConnection(updated);
};

const withdrawConnection = async ({ user, id }) => {
  const { data: connection } = await supabase
    .from('org_connections')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!connection) {
    const error = new Error('Connection not found.');
    error.statusCode = 404;
    throw error;
  }

  if (connection.requester_org_id !== user.orgId) {
    const error = new Error(
      'Only the organization that sent the request can withdraw it.'
    );
    error.statusCode = 403;
    throw error;
  }

  const { data: updated, error } = await supabase
    .from('org_connections')
    .update({
      status: 'Withdrawn'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Could not withdraw connection.');
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.CONNECTION_WITHDRAWN,
    entityType: 'org_connection',
    entityId: id
  });

  return serializeOrgConnection(updated);
};

const assertParticipant = async (connectionId, orgId) => {
  const { data: connection } = await supabase
    .from('org_connections')
    .select('*')
    .eq('id', connectionId)
    .maybeSingle();

  if (!connection) {
    const error = new Error('Connection not found.');
    error.statusCode = 404;
    throw error;
  }

  if (
    connection.requester_org_id !== orgId &&
    connection.target_org_id !== orgId
  ) {
    const error = new Error(
      'Not authorized for this connection.'
    );
    error.statusCode = 403;
    throw error;
  }

  if (connection.status !== 'Accepted') {
    const error = new Error(
      'This connection is not active.'
    );
    error.statusCode = 400;
    throw error;
  }

  return connection;
};

const getMessages = async ({ user, id }) => {
  await assertParticipant(id, user.orgId);

  const { data, error } = await supabase
    .from('org_messages')
    .select('*')
    .eq('connection_id', id)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Could not fetch messages.');
  }

  return (data || []).map(serializeOrgMessage);
};

const sendMessage = async ({
  user,
  id,
  message
}) => {
  await assertParticipant(id, user.orgId);

  const { data: msg, error } = await supabase
    .from('org_messages')
    .insert({
      connection_id: id,
      sender_org_id: user.orgId,
      sender_user_id: user.id,
      message
    })
    .select()
    .single();

  if (error) {
    throw new Error('Could not send message.');
  }

  return serializeOrgMessage(msg);
};

module.exports = {
  getConnections,
  createConnectionRequest,
  respondToConnection,
  withdrawConnection,
  getMessages,
  sendMessage
};