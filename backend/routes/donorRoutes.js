const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getDonors, createDonor, updateDonor, deleteDonor } = require('../controllers/donorController');

router.use(requireAuth);
router.get('/', getDonors);
router.post('/', requireRoleOrSectionPermission('donors', 'OrgAdmin'), requireOperational(), createDonor);
router.patch('/:id', requireRoleOrSectionPermission('donors', 'OrgAdmin'), requireOperational(), updateDonor);
router.delete('/:id', requireRoleOrSectionPermission('donors', 'OrgAdmin'), deleteDonor);

module.exports = router;
