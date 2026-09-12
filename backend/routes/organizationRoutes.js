const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getPublicOrganizations, getMyOrganization, getOrganizations, updateOrgStatus, deleteOrganization, setPublicEventsEnabled,
  updateMyDirectoryProfile, setMyCancellationRequest
} = require('../controllers/organizationController');

// Public - no auth. Powers the "Select Organization" dropdown on the public
// staff self-registration form (fixes it always showing "no active
// organizations" for a visitor who isn't logged in yet).
router.get('/public', getPublicOrganizations);

router.get('/me', requireAuth, getMyOrganization);
router.patch('/me/directory-profile', requireAuth, requireRole('OrgAdmin'), updateMyDirectoryProfile);
router.patch('/me/cancellation', requireAuth, requireRole('OrgAdmin'), setMyCancellationRequest);

router.use(requireAuth, requireRole('SuperAdmin'));
router.get('/', getOrganizations);
router.patch('/:id/status', updateOrgStatus);
router.patch('/:id/public-events', setPublicEventsEnabled);
router.delete('/:id', deleteOrganization);

module.exports = router;
