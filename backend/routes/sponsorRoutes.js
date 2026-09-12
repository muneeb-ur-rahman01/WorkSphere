const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const {
  getSponsors, createSponsor, updateSponsor, deleteSponsor,
  getSponsorships, createSponsorship, updateSponsorship, deleteSponsorship
} = require('../controllers/sponsorController');

router.use(requireAuth);
router.get('/', getSponsors);
router.post('/', requireRoleOrSectionPermission('sponsors', 'OrgAdmin'), requireOperational(), createSponsor);
router.patch('/:id', requireRoleOrSectionPermission('sponsors', 'OrgAdmin'), requireOperational(), updateSponsor);
router.delete('/:id', requireRoleOrSectionPermission('sponsors', 'OrgAdmin'), deleteSponsor);

router.get('/sponsorships/all', getSponsorships);
router.post('/sponsorships', requireRoleOrSectionPermission('sponsors', 'OrgAdmin'), requireOperational(), createSponsorship);
router.patch('/sponsorships/:id', requireRoleOrSectionPermission('sponsors', 'OrgAdmin'), requireOperational(), updateSponsorship);
router.delete('/sponsorships/:id', requireRoleOrSectionPermission('sponsors', 'OrgAdmin'), deleteSponsorship);

module.exports = router;
