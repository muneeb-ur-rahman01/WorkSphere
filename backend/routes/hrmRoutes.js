const express = require('express');
const multer = require('multer');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
const { handle } = require('../utils/handle');
const { resources, addDefaultOnboarding, convertApplicant } = require('../services/hrModules');
const documents = require('../services/employeeDocumentService');

const admin = requireRole('OrgAdmin');
router.use(requireAuth, admin); // every HR-module endpoint is OrgAdmin-only and org-scoped

// ---- employee documents (private storage; signed URLs only) ----
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const uploadDoc = (req, res, next) =>
  upload.single('file')(req, res, (err) => (err ? res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'Document must be 10 MB or smaller.' : 'Upload failed.' }) : next()));

router.get('/documents', handle((r) => documents.list({ user: r.user, employeeId: r.query.employeeId }), 'documents'));
router.get('/documents/types', handle(() => documents.DOC_TYPES, 'types'));
router.post('/documents', requireOperational(), fileUploadLimiter, uploadDoc, handle((r) => documents.upload({ user: r.user, body: r.body || {}, file: r.file }), 'document', 'Could not upload the document.'));
router.get('/documents/:id/url', handle(async (r) => ({ url: await documents.signedUrl({ user: r.user, id: r.params.id }) }), null));
router.delete('/documents/:id', requireOperational(), handle(async (r) => { await documents.remove({ user: r.user, id: r.params.id }); }, null));

// ---- bespoke recruitment / onboarding actions ----
router.post('/applicants/:id/convert', requireOperational(), handle((r) => convertApplicant({ user: r.user, id: r.params.id, ...(r.body || {}) }), null, 'Could not convert the candidate.'));
router.post('/onboarding-tasks/defaults', requireOperational(), handle(async (r) => addDefaultOnboarding({ user: r.user, employeeId: (r.body || {}).employeeId }), 'tasks'));

// ---- generic CRUD resources ----
const pick = (req, res, next) => {
  const res_ = Object.prototype.hasOwnProperty.call(resources, req.params.resource) ? resources[req.params.resource] : null;
  if (!res_) return res.status(404).json({ success: false, error: 'Unknown resource.' });
  req.resource = res_;
  return next();
};
router.get('/:resource', pick, handle((r) => r.resource.list({ user: r.user, query: r.query }), 'rows', 'Could not load records.'));
router.post('/:resource', pick, requireOperational(), handle((r) => r.resource.create({ user: r.user, body: r.body }), 'row', 'Could not save the record.'));
router.patch('/:resource/:id', pick, requireOperational(), handle((r) => r.resource.update({ user: r.user, id: r.params.id, body: r.body }), 'row', 'Could not update the record.'));
router.delete('/:resource/:id', pick, requireOperational(), handle(async (r) => { await r.resource.remove({ user: r.user, id: r.params.id }); }, null, 'Could not delete the record.'));

module.exports = router;
