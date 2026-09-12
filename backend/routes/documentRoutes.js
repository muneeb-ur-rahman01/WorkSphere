const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getDocuments, createDocument, updateDocumentStatus, deleteDocument } = require('../controllers/documentController');

router.use(requireAuth);
router.get('/', getDocuments);
router.post('/', requireRoleOrSectionPermission('documents', 'OrgAdmin'), requireOperational(), createDocument);

// Document Approval is always an OrgAdmin-only responsibility (spec section 15).
router.patch('/:id/status', requireRole('OrgAdmin'), updateDocumentStatus);

router.delete('/:id', requireRoleOrSectionPermission('documents', 'OrgAdmin'), deleteDocument);

module.exports = router;
