const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getDonations, createDonation, deleteDonation } = require('../controllers/donorController');

router.use(requireAuth);
router.get('/', getDonations);
router.post('/', requireRoleOrSectionPermission('donors', 'OrgAdmin'), requireOperational(), createDonation);
router.delete('/:id', requireRoleOrSectionPermission('donors', 'OrgAdmin'), deleteDonation);

module.exports = router;
