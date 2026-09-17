const supabase = require('../config/supabase');

const { serializePartner } = require('../utils/serializers');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const getPartners = async ({ user, filters }) => {
  const orgId =
    user.role === 'SuperAdmin'
      ? filters.orgId
      : user.orgId;

  let query = supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw createError('Could not fetch partners.');
  }

  return data.map(serializePartner);
};

const createPartner = async ({ user, partnerData }) => {
  const {
    name,
    partnershipType,
    contactName,
    email,
    phone,
    responsibilities,
    agreementNotes
  } = partnerData;

  const { data: partner, error } = await supabase
    .from('partners')
    .insert({
      org_id: user.orgId,
      name,
      partnership_type: partnershipType,
      contact_name: contactName,
      email,
      phone,
      responsibilities,
      agreement_notes: agreementNotes,
      status: 'Pending',
      requested_by: user.id
    })
    .select()
    .single();

  if (error) {
    throw createError(
      'Could not create partner request.'
    );
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.PARTNER_REQUESTED,
    entityType: 'partner',
    entityId: partner.id,
    entityLabel: partner.name
  });

  return serializePartner(partner);
};

const updatePartner = async ({
  user,
  id,
  partnerData
}) => {
  const {
    name,
    partnershipType,
    contactName,
    email,
    phone,
    responsibilities,
    agreementNotes
  } = partnerData;

  const updates = {};

  if (name !== undefined) {
    updates.name = name;
  }

  if (partnershipType !== undefined) {
    updates.partnership_type = partnershipType;
  }

  if (contactName !== undefined) {
    updates.contact_name = contactName;
  }

  if (email !== undefined) {
    updates.email = email;
  }

  if (phone !== undefined) {
    updates.phone = phone;
  }

  if (responsibilities !== undefined) {
    updates.responsibilities = responsibilities;
  }

  if (agreementNotes !== undefined) {
    updates.agreement_notes = agreementNotes;
  }

  const { data: partner, error } = await supabase
    .from('partners')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    throw createError('Could not update partner.');
  }

  return serializePartner(partner);
};

const updatePartnerStatus = async ({
  user,
  id,
  status
}) => {
  const { data: partner, error } = await supabase
    .from('partners')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    throw createError(
      'Could not update partner status.'
    );
  }

  const actionMap = {
    Active: AUDIT_ACTIONS.PARTNER_APPROVED,
    Rejected: AUDIT_ACTIONS.PARTNER_REJECTED
  };

  if (actionMap[status]) {
    await logAudit({
      actor: user,
      orgId: user.orgId,
      action: actionMap[status],
      entityType: 'partner',
      entityId: id,
      entityLabel: partner.name
    });
  }

  return serializePartner(partner);
};

const deletePartner = async ({ user, id }) => {
  const { error } = await supabase
    .from('partners')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    throw createError('Could not delete partner.');
  }

  return true;
};

module.exports = {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  deletePartner
};