const supabase = require('../config/supabase');
const { serializeDocument } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// GET /api/documents?entityType=&entityId=&status=
const getDocuments = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  if (req.query.entityType) query = query.eq('entity_type', req.query.entityType);
  if (req.query.entityId) query = query.eq('entity_id', req.query.entityId);
  if (req.query.status) query = query.eq('status', req.query.status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch documents.' });
  return res.json({ success: true, documents: data.map(serializeDocument) });
};

// POST /api/documents  body: { title, category, fileUrl, entityType, entityId, expiryDate }
// OrgAdmin uploads land already 'Approved'; a staff member's upload lands
// 'Pending' for OrgAdmin review (Document Approval — see Approval System).
const createDocument = async (req, res) => {
  const { title, category, fileUrl, entityType, entityId, expiryDate } = req.body;
  if (!title || !fileUrl) return res.status(400).json({ success: false, error: 'title and fileUrl are required.' });

  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      org_id: req.user.orgId, title, category, file_url: fileUrl,
      entity_type: entityType || null, entity_id: entityId || null, expiry_date: expiryDate || null,
      status: req.user.role === 'OrgAdmin' ? 'Approved' : 'Pending',
      uploaded_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not upload document.' });

  await logAudit({
    actor: req.user, orgId: req.user.orgId, action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    entityType: 'document', entityId: document.id, entityLabel: document.title
  });

  return res.json({ success: true, document: serializeDocument(document) });
};

// PATCH /api/documents/:id/status (OrgAdmin only — Document Approval)  body: { status }
const updateDocumentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status.' });
  }

  const { data: document, error } = await supabase
    .from('documents')
    .update({ status, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update document status.' });

  const actionMap = { Approved: AUDIT_ACTIONS.DOCUMENT_APPROVED, Rejected: AUDIT_ACTIONS.DOCUMENT_REJECTED };
  if (actionMap[status]) {
    await logAudit({
      actor: req.user, orgId: req.user.orgId, action: actionMap[status],
      entityType: 'document', entityId: id, entityLabel: document.title
    });
  }

  return res.json({ success: true, document: serializeDocument(document) });
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('documents').delete().eq('id', id).eq('org_id', req.user.orgId);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete document.' });
  return res.json({ success: true });
};

module.exports = { getDocuments, createDocument, updateDocumentStatus, deleteDocument };
