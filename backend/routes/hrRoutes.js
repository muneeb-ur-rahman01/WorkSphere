const express = require('express');
const multer = require('multer');
const { body, param, query } = require('express-validator');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { fileUploadLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { STAFF_ROLES } = require('../services/attendanceService');
const c = require('../controllers/hrController');
const { handle } = require('../utils/handle');
const sh = require('../services/staffHrService');

const admin = requireRole('OrgAdmin');
const staff = requireRole(...STAFF_ROLES);
const uuid = (name) => param(name).isUUID().withMessage('Invalid id.');
const optStr = (name, max) => body(name).optional({ nullable: true }).isString().trim().isLength({ max }).withMessage(`${name} is too long.`);
const optDate = (name) => body(name).optional({ nullable: true, checkFalsy: true }).matches(/^\d{4}-\d{2}-\d{2}$/).isISO8601({ strict: true }).withMessage(`${name} must be YYYY-MM-DD.`);
const optUuid = (name) => body(name).optional({ nullable: true, checkFalsy: true }).isUUID().withMessage(`Invalid ${name}.`);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (['image/jpeg', 'image/png'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Photo must be a JPG or PNG image.')))
});
const uploadPhoto = (req, res, next) =>
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({ success: false, error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 2 MB or smaller.' : err.message });
  });

const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Volunteer'];
const EMP_STATUSES = ['Active', 'On Leave', 'Probation', 'Suspended', 'Resigned', 'Terminated'];
const employeeFields = [
  optStr('personalEmail', 200), optStr('phone', 40), optStr('address', 500), optStr('gender', 30), optStr('nationalId', 40),
  optStr('emergencyContactName', 120), optStr('emergencyContactPhone', 40),
  optDate('dateOfBirth'), optDate('joiningDate'),
  optUuid('departmentId'), optUuid('designationId'),
  body('employmentType').optional().isIn(EMP_TYPES).withMessage('Invalid employment type.'),
  body('employmentStatus').optional().isIn(EMP_STATUSES).withMessage('Invalid employment status.'),
  body('employeeCode').optional({ nullable: true, checkFalsy: true }).isString().trim().matches(/^[A-Za-z0-9_-]{2,20}$/).withMessage('Employee ID must be 2-20 letters, numbers, - or _.')
];

router.use(requireAuth);

// ---- staff: own profile (identity from JWT only) ----
router.get('/me', staff, c.myProfile);
router.post('/me/photo', staff, requireOperational(), fileUploadLimiter, uploadPhoto, c.uploadMyPhoto);

// ---- staff: own goals / reviews / feedback / training / benefits (identity from JWT only) ----
router.get('/me/goals', staff, handle((r) => sh.myGoals({ user: r.user }), 'goals', 'Could not load your goals.'));
router.patch('/me/goals/:id', staff, requireOperational(), validate([uuid('id')]), handle((r) => sh.updateMyGoal({ user: r.user, id: r.params.id, body: r.body }), 'goal', 'Could not update the goal.'));
router.get('/me/reviews', staff, handle((r) => sh.myReviews({ user: r.user }), 'reviews', 'Could not load your reviews.'));
router.post('/me/reviews/:id/acknowledge', staff, requireOperational(), validate([uuid('id')]), handle((r) => sh.acknowledgeReview({ user: r.user, id: r.params.id }), 'review', 'Could not acknowledge the review.'));
router.get('/me/feedback', staff, handle((r) => sh.myFeedback({ user: r.user }), 'feedback', 'Could not load your feedback.'));
router.get('/me/training', staff, handle((r) => sh.myTraining({ user: r.user }), 'programs', 'Could not load training programs.'));
router.put('/me/training/:id/interest', staff, requireOperational(), validate([uuid('id')]), handle((r) => sh.setInterest({ user: r.user, programId: r.params.id, interested: true }), null, 'Could not save your interest.'));
router.delete('/me/training/:id/interest', staff, requireOperational(), validate([uuid('id')]), handle((r) => sh.setInterest({ user: r.user, programId: r.params.id, interested: false }), null, 'Could not update your interest.'));
router.get('/me/benefits', staff, handle((r) => sh.myBenefits({ user: r.user }), null, 'Could not load your benefits.'));

// ---- OrgAdmin only, own organization only ----
router.get('/departments', admin, c.listDepartments);
router.post('/departments', admin, requireOperational(), validate([body('name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'), optStr('description', 300), body('status').optional().isIn(['Active', 'Inactive'])]), c.createDepartment);
router.patch('/departments/:id', admin, requireOperational(), validate([uuid('id'), body('name').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'), optStr('description', 300), body('status').optional().isIn(['Active', 'Inactive'])]), c.updateDepartment);
router.delete('/departments/:id', admin, validate([uuid('id')]), c.deleteDepartment);

router.get('/designations', admin, c.listDesignations);
router.post('/designations', admin, requireOperational(), validate([body('title').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Title must be 2-80 characters.'), optStr('description', 300), optUuid('departmentId'), body('status').optional().isIn(['Active', 'Inactive'])]), c.createDesignation);
router.patch('/designations/:id', admin, requireOperational(), validate([uuid('id'), body('title').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Title must be 2-80 characters.'), optStr('description', 300), optUuid('departmentId'), body('status').optional().isIn(['Active', 'Inactive'])]), c.updateDesignation);
router.delete('/designations/:id', admin, validate([uuid('id')]), c.deleteDesignation);

router.get('/employees', admin, validate([query('departmentId').optional().isUUID(), query('status').optional().isIn(EMP_STATUSES), query('search').optional().isString().isLength({ max: 100 })]), c.listEmployees);
router.get('/employees/unlinked', admin, c.listUnlinked);
router.post('/employees/sync', admin, requireOperational(), c.syncEmployees);
router.post('/employees', admin, requireOperational(), validate([body('userId').isUUID().withMessage('Select a staff account.'), ...employeeFields]), c.createEmployee);
router.patch('/employees/:id', admin, requireOperational(), validate([uuid('id'), optStr('fullName', 120), ...employeeFields]), c.updateEmployee);
router.get('/employees/:id/photo', admin, validate([uuid('id')]), c.employeePhoto);
router.post('/employees/:id/photo', admin, requireOperational(), validate([uuid('id')]), fileUploadLimiter, uploadPhoto, c.uploadEmployeePhoto);

module.exports = router;
