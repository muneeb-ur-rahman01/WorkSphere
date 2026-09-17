const supabase = require('../config/supabase');

const { serializeDocument } = require('../utils/serializers');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

const getDocuments = async ({ user, filters }) => {
  const orgId = user.role === 'SuperAdmin' ? filters.orgId : user.orgId;

  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (orgId) query = query.eq('org_id', orgId);
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.entityId) query = query.eq('entity_id', filters.entityId);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch documents.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeDocument);
};

const createDocument = async ({
  user,
  title,
  category,
  fileUrl,
  entityType,
  entityId,
  expiryDate
}) => {
  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      org_id: user.orgId,
      title,
      category,
      file_url: fileUrl,
      entity_type: entityType || null,
      entity_id: entityId || null,
      expiry_date: expiryDate || null,
      status: user.role === 'OrgAdmin' ? 'Approved' : 'Pending',
      uploaded_by: user.id
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not upload document.');
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    entityType: 'document',
    entityId: document.id,
    entityLabel: document.title
  });

  return serializeDocument(document);
};

const updateDocumentStatus = async ({ user, id, status }) => {
  const { data: document, error } = await supabase
    .from('documents')
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
    const err = new Error('Could not update document status.');
    err.statusCode = 500;
    throw err;
  }

  const actionMap = {
    Approved: AUDIT_ACTIONS.DOCUMENT_APPROVED,
    Rejected: AUDIT_ACTIONS.DOCUMENT_REJECTED
  };

  if (actionMap[status]) {
    await logAudit({
      actor: user,
      orgId: user.orgId,
      action: actionMap[status],
      entityType: 'document',
      entityId: id,
      entityLabel: document.title
    });
  }

  return serializeDocument(document);
};

const deleteDocument = async ({ user, id }) => {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete document.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  getDocuments,
  createDocument,
  updateDocumentStatus,
  deleteDocument
};