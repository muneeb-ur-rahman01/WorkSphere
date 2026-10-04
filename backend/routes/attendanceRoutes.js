const express = require('express');
const { body, param, query } = require('express-validator');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { validate } = require('../middleware/validate');
const { STAFF_ROLES } = require('../services/attendanceService');
const c = require('../controllers/attendanceController');

const staff = requireRole(...STAFF_ROLES);
const admin = requireRole('OrgAdmin');
const month = query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM.');
const uuid = (name) => param(name).isUUID().withMessage('Invalid id.');

router.use(requireAuth);

// ---- staff: own attendance only (identity always comes from the JWT) ----
router.get('/today', staff, c.getToday);
router.get('/me', staff, validate([month]), c.getMine);
router.post('/check-in', staff, requireOperational(), c.checkIn);
router.post('/check-out', staff, requireOperational(), c.checkOut);

// ---- OrgAdmin: own organization only ----
router.get('/', admin, validate([query('date').optional().isISO8601({ strict: true }).matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD.')]), c.listOrgDay);
router.get('/user/:userId', admin, validate([uuid('userId'), month]), c.getUserMonth);
router.post(
  '/:id/correct', admin, requireOperational(),
  validate([
    uuid('id'),
    body('checkInAt').optional({ nullable: true }).isISO8601().withMessage('Invalid check-in time.'),
    body('checkOutAt').optional({ nullable: true }).isISO8601().withMessage('Invalid check-out time.'),
    body('status').optional({ nullable: true }).isIn(['Present', 'Late', 'Half Day', 'Absent', 'Incomplete']).withMessage('Invalid status.'),
    body('reason').isString().trim().isLength({ min: 3, max: 300 }).withMessage('A reason (3-300 characters) is required.')
  ]),
  c.adminCorrect
);

module.exports = router;
