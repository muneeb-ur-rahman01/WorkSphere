const express = require('express');
const router = express.Router();
const { requireAuth, requireRoleOrSectionPermission, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { getPartners, createPartner, updatePartner, updatePartnerStatus, deletePartner } = require('../controllers/partnerController');

router.use(requireAuth);
router.get('/', getPartners);
router.post('/', requireRoleOrSectionPermission('partners', 'OrgAdmin'), requireOperational(), createPartner);
router.patch('/:id', requireRoleOrSectionPermission('partners', 'OrgAdmin'), requireOperational(), updatePartner);

// Partnership Approval is always an OrgAdmin-only responsibility (spec section 15) —
// not delegable via the 'partners' Accessibility permission like the rest of this module.
router.patch('/:id/status', requireRole('OrgAdmin'), updatePartnerStatus);

router.delete('/:id', requireRoleOrSectionPermission('partners', 'OrgAdmin'), deletePartner);

module.exports = router;
