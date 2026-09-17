const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateOrgId,
  validateOrgStatus,
  validatePublicEvents,
  validateDirectoryProfile,
  validateCancellationRequest
} = require('../middleware/organization');

const {
  getPublicOrganizations,
  getMyOrganization,
  getOrganizations,
  updateOrgStatus,
  deleteOrganization,
  setPublicEventsEnabled,
  updateMyDirectoryProfile,
  setMyCancellationRequest
} = require('../controllers/organizationController');

// ============================================================
// Public
// ============================================================

// Used by public staff self-registration form.
router.get(
  '/public',
  getPublicOrganizations
);

// ============================================================
// Authenticated organization member
// ============================================================

router.get(
  '/me',
  requireAuth,
  getMyOrganization
);

router.patch(
  '/me/directory-profile',
  requireAuth,
  requireRole('OrgAdmin'),
  validateDirectoryProfile,
  updateMyDirectoryProfile
);

router.patch(
  '/me/cancellation',
  requireAuth,
  requireRole('OrgAdmin'),
  validateCancellationRequest,
  setMyCancellationRequest
);

// ============================================================
// SuperAdmin
// ============================================================

router.use(
  requireAuth,
  requireRole('SuperAdmin')
);

router.get(
  '/',
  getOrganizations
);

router.patch(
  '/:id/status',
  validateOrgId,
  validateOrgStatus,
  updateOrgStatus
);

router.patch(
  '/:id/public-events',
  validateOrgId,
  validatePublicEvents,
  setPublicEventsEnabled
);

router.delete(
  '/:id',
  validateOrgId,
  deleteOrganization
);

module.exports = router;