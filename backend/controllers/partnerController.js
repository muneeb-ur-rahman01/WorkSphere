const supabase = require('../config/supabase');
const { serializePartner } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// GET /api/partners
const getPartners = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('partners').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch partners.' });
  return res.json({ success: true, partners: data.map(serializePartner) });
};

// POST /api/partners — any org member with access can propose a partner; starts 'Pending'
// (see Approval System: Partnership Approval, an OrgAdmin responsibility).
const createPartner = async (req, res) => {
  const { name, partnershipType, contactName, email, phone, responsibilities, agreementNotes } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required.' });

  const { data: partner, error } = await supabase
    .from('partners')
    .insert({
      org_id: req.user.orgId, name, partnership_type: partnershipType, contact_name: contactName,
      email, phone, responsibilities, agreement_notes: agreementNotes,
      status: 'Pending', requested_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create partner request.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.PARTNER_REQUESTED,
    entityType: 'partner', entityId: partner.id, entityLabel: partner.name
  });

  return res.json({ success: true, partner: serializePartner(partner) });
};

const updatePartner = async (req, res) => {
  const { id } = req.params;
  const { name, partnershipType, contactName, email, phone, responsibilities, agreementNotes } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (partnershipType !== undefined) updates.partnership_type = partnershipType;
  if (contactName !== undefined) updates.contact_name = contactName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (responsibilities !== undefined) updates.responsibilities = responsibilities;
  if (agreementNotes !== undefined) updates.agreement_notes = agreementNotes;

  const { data: partner, error } = await supabase
    .from('partners').update(updates).eq('id', id).eq('org_id', req.user.orgId).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update partner.' });
  return res.json({ success: true, partner: serializePartner(partner) });
};

// PATCH /api/partners/:id/status (OrgAdmin only — Partnership Approval)  body: { status }
const updatePartnerStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Active', 'Ended', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  const { data: partner, error } = await supabase
    .from('partners')
    .update({ status, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update partner status.' });

  const actionMap = { Active: AUDIT_ACTIONS.PARTNER_APPROVED, Rejected: AUDIT_ACTIONS.PARTNER_REJECTED };
  if (actionMap[status]) {
    await logAudit({
      actor: req.user, orgId: req.user.orgId, action: actionMap[status],
      entityType: 'partner', entityId: id, entityLabel: partner.name
    });
  }

  return res.json({ success: true, partner: serializePartner(partner) });
};

const deletePartner = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('partners').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete partner.' });
  return res.json({ success: true });
};

module.exports = { getPartners, createPartner, updatePartner, updatePartnerStatus, deletePartner };
