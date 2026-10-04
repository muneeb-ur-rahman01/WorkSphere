const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { STAFF_ROLES } = require('../services/attendanceService');
const c = require('../controllers/leaveController');

const staff = requireRole(...STAFF_ROLES);
const admin = requireRole('OrgAdmin');
const orgMember = requireRole('OrgAdmin', ...STAFF_ROLES);
const uuid = (name) => param(name).isUUID().withMessage('Invalid id.');
const isoDate = (name) => body(name).matches(/^\d{4}-\d{2}-\d{2}$/).isISO8601({ strict: true }).withMessage('Dates must be YYYY-MM-DD.');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Attachment must be a PDF, JPG or PNG file.'))
});
const uploadAttachment = (req, res, next) =>
  upload.single('attachment')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Attachment must be 5 MB or smaller.' : err.message;
    return res.status(400).json({ success: false, error: msg });
  });

router.use(requireAuth);

// categories: everyone in the org can read; only OrgAdmin can change
router.get('/categories', orgMember, c.listCategories);
router.post(
  '/categories', admin, requireOperational(),
  validate([
    body('name').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters.'),
    body('isPaid').optional().isBoolean().toBoolean(),
    body('annualQuotaDays').optional({ nullable: true }).isInt({ min: 0, max: 366 }).toInt(),
    body('requiresDocument').optional().isBoolean().toBoolean()
  ]),
  c.createCategory
);
router.patch(
  '/categories/:id', admin, requireOperational(),
  validate([
    uuid('id'),
    body('name').optional().isString().trim().isLength({ min: 2, max: 60 }),
    body('isPaid').optional().isBoolean().toBoolean(),
    body('annualQuotaDays').optional({ nullable: true }).isInt({ min: 0, max: 366 }).toInt(),
    body('requiresDocument').optional().isBoolean().toBoolean(),
    body('isActive').optional().isBoolean().toBoolean()
  ]),
  c.updateCategory
);

// staff: own requests only
router.get('/me', staff, c.listMine);
router.post(
  '/', staff, requireOperational(), fileUploadLimiter, uploadAttachment,
  validate([
    body('categoryId').isUUID().withMessage('Select a leave category.'),
    isoDate('startDate'),
    isoDate('endDate'),
    body('reason').isString().trim().isLength({ min: 3, max: 1000 }).withMessage('Reason must be 3-1000 characters.')
  ]),
  c.createRequest
);
router.post('/:id/cancel', staff, requireOperational(), validate([uuid('id')]), c.cancelMine);

// OrgAdmin: own organization only
router.get('/', admin, validate([query('status').optional().isIn(['Pending', 'Approved', 'Rejected', 'Cancelled'])]), c.listOrg);
router.post(
  '/:id/review', admin, requireOperational(),
  validate([
    uuid('id'),
    body('decision').isIn(['Approved', 'Rejected']).withMessage('Decision must be Approved or Rejected.'),
    body('remarks').optional({ nullable: true }).isString().trim().isLength({ max: 500 })
  ]),
  c.review
);

// attachment: owner or same-org OrgAdmin (enforced in the service)
router.get('/:id/attachment', orgMember, validate([uuid('id')]), c.attachment);

module.exports = router;
