const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');

router.use(requireAuth);
router.get('/', getEvents);

// Also reachable by a staff member granted the 'events' Accessibility
// permission (see controllers/permissionController.js), same as an OrgAdmin.
router.post('/', requireRoleOrSectionPermission('events', 'OrgAdmin'), requireOperational(), createEvent);
router.patch('/:id', requireRoleOrSectionPermission('events', 'OrgAdmin'), requireOperational(), updateEvent);
router.delete('/:id', requireRoleOrSectionPermission('events', 'OrgAdmin'), deleteEvent); // deletion always allowed, even while suspended

module.exports = router;
