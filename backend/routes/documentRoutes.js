const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission,
  requireRole
} = require('../middleware/auth');

const { requireOperational } = require('../middleware/subscriptionAccess');

const {
  validateDocumentQuery,
  validateCreateDocument,
  validateDocumentStatus,
  validateDocumentId
} = require('../middleware/document');

const {
  getDocuments,
  createDocument,
  updateDocumentStatus,
  deleteDocument
} = require('../controllers/documentController');

router.use(requireAuth);

router.get(
  '/',
  validateDocumentQuery,
  getDocuments
);

router.post(
  '/',
  requireRoleOrSectionPermission('documents', 'OrgAdmin'),
  requireOperational(),
  validateCreateDocument,
  createDocument
);

// Document Approval is always an OrgAdmin-only responsibility.
router.patch(
  '/:id/status',
  requireRole('OrgAdmin'),
  validateDocumentId,
  validateDocumentStatus,
  updateDocumentStatus
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission('documents', 'OrgAdmin'),
  validateDocumentId,
  deleteDocument
);

module.exports = router;