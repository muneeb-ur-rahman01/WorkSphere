const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const {
  validateVolunteerQuery,
  validateVolunteerProfile
} = require('../middleware/volunteer');

const {
  getVolunteers,
  upsertVolunteerProfile
} = require('../controllers/volunteerController');

router.use(requireAuth);

router.get(
  '/',
  validateVolunteerQuery,
  getVolunteers
);

router.put(
  '/:userId/profile',
  requireRoleOrSectionPermission('volunteers', 'OrgAdmin'),
  validateVolunteerProfile,
  upsertVolunteerProfile
);

module.exports = router;