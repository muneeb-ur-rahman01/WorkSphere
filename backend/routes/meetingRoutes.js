const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const { requireOperational } = require('../middleware/subscriptionAccess');

const {
  validateMeetingQuery,
  validateCreateMeeting,
  validateUpdateMeeting,
  validateMeetingId
} = require('../middleware/meeting');

const {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting
} = require('../controllers/meetingController');

router.use(requireAuth);

// Any authenticated org member can view meetings for their org.
router.get(
  '/',
  validateMeetingQuery,
  getMeetings
);

// OrgAdmin or staff member with 'meetings' section permission.
router.post(
  '/',
  requireRoleOrSectionPermission('meetings', 'OrgAdmin'),
  requireOperational(),
  validateCreateMeeting,
  createMeeting
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('meetings', 'OrgAdmin'),
  requireOperational(),
  validateMeetingId,
  validateUpdateMeeting,
  updateMeeting
);

// Deletion is allowed even while suspended.
router.delete(
  '/:id',
  requireRoleOrSectionPermission('meetings', 'OrgAdmin'),
  validateMeetingId,
  deleteMeeting
);

module.exports = router;