const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const {
  getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign,
  getCampaignTeam, addCampaignTeamMember, removeCampaignTeamMember
} = require('../controllers/campaignController');

router.use(requireAuth);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);

router.post('/', requireRoleOrSectionPermission('campaigns', 'OrgAdmin'), requireOperational(), createCampaign);
router.patch('/:id', requireRoleOrSectionPermission('campaigns', 'OrgAdmin'), requireOperational(), updateCampaign);
router.delete('/:id', requireRoleOrSectionPermission('campaigns', 'OrgAdmin'), deleteCampaign);

router.get('/:id/team', getCampaignTeam);
router.post('/:id/team', requireRoleOrSectionPermission('campaigns', 'OrgAdmin'), requireOperational(), addCampaignTeamMember);
router.delete('/:id/team/:userId', requireRoleOrSectionPermission('campaigns', 'OrgAdmin'), removeCampaignTeamMember);

module.exports = router;
