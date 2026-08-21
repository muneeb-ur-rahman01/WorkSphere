const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireRoleOrSectionPermission } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getCamps, createCamp, updateCamp, deleteCamp } = require('../controllers/campController');

router.use(requireAuth);
router.get('/', getCamps);

// Also reachable by a staff member granted the 'camps' Accessibility
// permission (see controllers/permissionController.js), same as an OrgAdmin.
router.post('/', requireRoleOrSectionPermission('camps', 'OrgAdmin'), requireOperational(), createCamp);
router.patch('/:id', requireRoleOrSectionPermission('camps', 'OrgAdmin'), requireOperational(), updateCamp);
router.delete('/:id', requireRoleOrSectionPermission('camps', 'OrgAdmin'), deleteCamp); // deletion always allowed, even while suspended

module.exports = router;
