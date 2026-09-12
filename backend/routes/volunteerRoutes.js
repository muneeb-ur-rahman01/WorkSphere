const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { getVolunteers, upsertVolunteerProfile } = require('../controllers/volunteerController');

router.use(requireAuth);
router.get('/', getVolunteers);
router.put('/:userId/profile', requireRoleOrSectionPermission('volunteers', 'OrgAdmin'), upsertVolunteerProfile);

module.exports = router;
