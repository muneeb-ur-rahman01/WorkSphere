const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission
} = require('../middleware/auth');

const {
  requireOperational
} = require('../middleware/subscriptionAccess');

const {
  validateSponsorQuery,
  validateCreateSponsor,
  validateUpdateSponsor,
  validateSponsorshipQuery,
  validateCreateSponsorship,
  validateUpdateSponsorship
} = require('../middleware/sponsor');

const {
  getSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getSponsorships,
  createSponsorship,
  updateSponsorship,
  deleteSponsorship
} = require('../controllers/sponsorController');

router.use(requireAuth);

router.get(
  '/',
  validateSponsorQuery,
  getSponsors
);

router.post(
  '/',
  requireRoleOrSectionPermission('sponsors', 'OrgAdmin'),
  requireOperational(),
  validateCreateSponsor,
  createSponsor
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('sponsors', 'OrgAdmin'),
  requireOperational(),
  validateUpdateSponsor,
  updateSponsor
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission('sponsors', 'OrgAdmin'),
  deleteSponsor
);

router.get(
  '/sponsorships/all',
  validateSponsorshipQuery,
  getSponsorships
);

router.post(
  '/sponsorships',
  requireRoleOrSectionPermission('sponsors', 'OrgAdmin'),
  requireOperational(),
  validateCreateSponsorship,
  createSponsorship
);

router.patch(
  '/sponsorships/:id',
  requireRoleOrSectionPermission('sponsors', 'OrgAdmin'),
  requireOperational(),
  validateUpdateSponsorship,
  updateSponsorship
);

router.delete(
  '/sponsorships/:id',
  requireRoleOrSectionPermission('sponsors', 'OrgAdmin'),
  requireOperational(),
  deleteSponsorship
);

module.exports = router;