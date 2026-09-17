const supabase = require('../config/supabase');

const { serializeBeneficiary } = require('../utils/serializers');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const getBeneficiaries = async ({
  user,
  orgId
}) => {
  const targetOrgId =
    user.role === 'SuperAdmin'
      ? orgId
      : user.orgId;

  let query = supabase
    .from('beneficiaries')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (targetOrgId) {
    query = query.eq(
      'org_id',
      targetOrgId
    );
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    console.error(
      '[beneficiaryService] Get beneficiaries failed:',
      error.message
    );

    throw new Error(
      'Could not fetch beneficiaries.'
    );
  }

  return (data || []).map(
    serializeBeneficiary
  );
};

const createBeneficiary = async ({
  user,
  name,
  contactInfo,
  demographicNotes
}) => {
  const {
    data: beneficiary,
    error
  } = await supabase
    .from('beneficiaries')
    .insert({
      org_id: user.orgId,
      name,
      contact_info: contactInfo,
      demographic_notes: demographicNotes
    })
    .select()
    .single();

  if (error) {
    console.error(
      '[beneficiaryService] Create beneficiary failed:',
      error.message
    );

    throw new Error(
      'Could not register beneficiary.'
    );
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action:
      AUDIT_ACTIONS.BENEFICIARY_CREATED,
    entityType: 'beneficiary',
    entityId: beneficiary.id,
    entityLabel: beneficiary.name
  });

  return serializeBeneficiary(
    beneficiary
  );
};

const updateBeneficiary = async ({
  user,
  id,
  name,
  contactInfo,
  demographicNotes
}) => {
  const updates = {};

  if (name !== undefined) {
    updates.name = name;
  }

  if (contactInfo !== undefined) {
    updates.contact_info = contactInfo;
  }

  if (demographicNotes !== undefined) {
    updates.demographic_notes =
      demographicNotes;
  }

  const {
    data: beneficiary,
    error
  } = await supabase
    .from('beneficiaries')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    console.error(
      '[beneficiaryService] Update beneficiary failed:',
      error.message
    );

    throw new Error(
      'Could not update beneficiary.'
    );
  }

  return serializeBeneficiary(
    beneficiary
  );
};

const deleteBeneficiary = async ({
  user,
  id
}) => {
  const {
    error
  } = await supabase
    .from('beneficiaries')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    console.error(
      '[beneficiaryService] Delete beneficiary failed:',
      error.message
    );

    throw new Error(
      'Could not delete beneficiary.'
    );
  }
};

module.exports = {
  getBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
};