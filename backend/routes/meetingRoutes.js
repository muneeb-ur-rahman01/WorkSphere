const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getMeetings, createMeeting, updateMeeting, deleteMeeting } = require('../controllers/meetingController');

router.use(requireAuth);

// Any authenticated org member can view meetings for their org — this is
// what makes a created meeting visible to all relevant users/members.
router.get('/', getMeetings);

// Also reachable by a staff member granted the 'meetings' Accessibility
// permission (see controllers/permissionController.js), same as an OrgAdmin.
router.post('/', requireRoleOrSectionPermission('meetings', 'OrgAdmin'), requireOperational(), createMeeting);
router.patch('/:id', requireRoleOrSectionPermission('meetings', 'OrgAdmin'), requireOperational(), updateMeeting);
router.delete('/:id', requireRoleOrSectionPermission('meetings', 'OrgAdmin'), deleteMeeting); // deletion always allowed, even while suspended

module.exports = router;
