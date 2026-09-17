const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const { requireOperational } = require('../middleware/subscriptionAccess');

const {
  validateEventQuery,
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId
} = require('../middleware/event');

const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventController');

router.use(requireAuth);

router.get(
  '/',
  validateEventQuery,
  getEvents
);

// OrgAdmin or staff member with 'events' section permission.
router.post(
  '/',
  requireRoleOrSectionPermission('events', 'OrgAdmin'),
  requireOperational(),
  validateCreateEvent,
  createEvent
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('events', 'OrgAdmin'),
  requireOperational(),
  validateEventId,
  validateUpdateEvent,
  updateEvent
);

// Deletion remains allowed even while suspended.
router.delete(
  '/:id',
  requireRoleOrSectionPermission('events', 'OrgAdmin'),
  validateEventId,
  deleteEvent
);

module.exports = router;