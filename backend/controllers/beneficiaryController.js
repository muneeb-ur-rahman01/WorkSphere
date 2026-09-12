const supabase = require('../config/supabase');
const { serializeBeneficiary, serializeBeneficiaryEnrollment } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// GET /api/beneficiaries
const getBeneficiaries = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('beneficiaries').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch beneficiaries.' });
  return res.json({ success: true, beneficiaries: data.map(serializeBeneficiary) });
};

const createBeneficiary = async (req, res) => {
  const { name, contactInfo, demographicNotes } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required.' });

  const { data: beneficiary, error } = await supabase
    .from('beneficiaries')
    .insert({ org_id: req.user.orgId, name, contact_info: contactInfo, demographic_notes: demographicNotes })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not register beneficiary.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.BENEFICIARY_CREATED,
    entityType: 'beneficiary', entityId: beneficiary.id, entityLabel: beneficiary.name
  });

  return res.json({ success: true, beneficiary: serializeBeneficiary(beneficiary) });
};

const updateBeneficiary = async (req, res) => {
  const { id } = req.params;
  const { name, contactInfo, demographicNotes } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (contactInfo !== undefined) updates.contact_info = contactInfo;
  if (demographicNotes !== undefined) updates.demographic_notes = demographicNotes;

  const { data: beneficiary, error } = await supabase
    .from('beneficiaries').update(updates).eq('id', id).eq('org_id', req.user.orgId).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update beneficiary.' });
  return res.json({ success: true, beneficiary: serializeBeneficiary(beneficiary) });
};

const deleteBeneficiary = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('beneficiaries').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete beneficiary.' });
  return res.json({ success: true });
};

// ============================================================
// Program Enrollment (Beneficiary <-> Project)
// ============================================================

const getEnrollments = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('beneficiary_enrollments').select('*').order('enrolled_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  if (req.query.beneficiaryId) query = query.eq('beneficiary_id', req.query.beneficiaryId);
  if (req.query.projectId) query = query.eq('project_id', req.query.projectId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch enrollments.' });
  return res.json({ success: true, enrollments: data.map(serializeBeneficiaryEnrollment) });
};

// POST /api/beneficiaries/enrollments  body: { beneficiaryId, projectId }
const createEnrollment = async (req, res) => {
  const { beneficiaryId, projectId } = req.body;
  if (!beneficiaryId || !projectId) return res.status(400).json({ success: false, error: 'beneficiaryId and projectId are required.' });

  const { data: enrollment, error } = await supabase
    .from('beneficiary_enrollments')
    .upsert(
      { org_id: req.user.orgId, beneficiary_id: beneficiaryId, project_id: projectId, status: 'Active' },
      { onConflict: 'beneficiary_id,project_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not enroll beneficiary.' });
  return res.json({ success: true, enrollment: serializeBeneficiaryEnrollment(enrollment) });
};

// PATCH /api/beneficiaries/enrollments/:id  body: { status, outcomeNotes }
const updateEnrollment = async (req, res) => {
  const { id } = req.params;
  const { status, outcomeNotes } = req.body;
  if (status && !['Active', 'Completed', 'Dropped'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  const updates = {};
  if (status !== undefined) updates.status = status;
  if (outcomeNotes !== undefined) updates.outcome_notes = outcomeNotes;

  const { data: enrollment, error } = await supabase
    .from('beneficiary_enrollments').update(updates).eq('id', id).eq('org_id', req.user.orgId).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update enrollment.' });
  return res.json({ success: true, enrollment: serializeBeneficiaryEnrollment(enrollment) });
};

const deleteEnrollment = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('beneficiary_enrollments').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not remove enrollment.' });
  return res.json({ success: true });
};

module.exports = {
  getBeneficiaries, createBeneficiary, updateBeneficiary, deleteBeneficiary,
  getEnrollments, createEnrollment, updateEnrollment, deleteEnrollment
};
