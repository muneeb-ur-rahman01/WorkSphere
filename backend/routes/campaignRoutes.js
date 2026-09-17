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
  validateCreateCampaign,
  validateUpdateCampaign,
  validateAddCampaignTeamMember
} = require('../middleware/campaign');

const {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignTeam,
  addCampaignTeamMember,
  removeCampaignTeamMember
} = require(
  '../controllers/campaignController'
);

router.use(requireAuth);

router.get(
  '/',
  getCampaigns
);

router.get(
  '/:id',
  getCampaign
);

router.post(
  '/',
  requireRoleOrSectionPermission(
    'campaigns',
    'OrgAdmin'
  ),
  requireOperational(),
  validateCreateCampaign,
  createCampaign
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission(
    'campaigns',
    'OrgAdmin'
  ),
  requireOperational(),
  validateUpdateCampaign,
  updateCampaign
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission(
    'campaigns',
    'OrgAdmin'
  ),
  deleteCampaign
);

router.get(
  '/:id/team',
  getCampaignTeam
);

router.post(
  '/:id/team',
  requireRoleOrSectionPermission(
    'campaigns',
    'OrgAdmin'
  ),
  requireOperational(),
  validateAddCampaignTeamMember,
  addCampaignTeamMember
);

router.delete(
  '/:id/team/:userId',
  requireRoleOrSectionPermission(
    'campaigns',
    'OrgAdmin'
  ),
  removeCampaignTeamMember
);

module.exports = router;