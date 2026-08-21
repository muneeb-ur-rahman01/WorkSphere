const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getPublicOrganizations, getMyOrganization, getOrganizations, updateOrgStatus, deleteOrganization
} = require('../controllers/organizationController');

// Public - no auth. Powers the "Select Organization" dropdown on the public
// staff self-registration form (fixes it always showing "no active
// organizations" for a visitor who isn't logged in yet).
router.get('/public', getPublicOrganizations);

router.get('/me', requireAuth, getMyOrganization);

router.use(requireAuth, requireRole('SuperAdmin'));
router.get('/', getOrganizations);
router.patch('/:id/status', updateOrgStatus);
router.delete('/:id', deleteOrganization);

module.exports = router;
