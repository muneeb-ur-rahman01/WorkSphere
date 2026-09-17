const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRoleOrSectionPermission,
  requireRole
} = require('../middleware/auth');

const {
  requireOperational
} = require('../middleware/subscriptionAccess');

const {
  validatePartnerQuery,
  validateCreatePartner,
  validateUpdatePartner,
  validatePartnerStatus,
  validatePartnerId
} = require('../middleware/partner');

const {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  deletePartner
} = require('../controllers/partnerController');

router.use(requireAuth);

router.get(
  '/',
  validatePartnerQuery,
  getPartners
);

router.post(
  '/',
  requireRoleOrSectionPermission('partners', 'OrgAdmin'),
  requireOperational(),
  validateCreatePartner,
  createPartner
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission('partners', 'OrgAdmin'),
  requireOperational(),
  validatePartnerId,
  validateUpdatePartner,
  updatePartner
);

// Partnership Approval remains strictly OrgAdmin-only.
// This permission cannot be delegated through the partners section.
router.patch(
  '/:id/status',
  requireRole('OrgAdmin'),
  validatePartnerId,
  validatePartnerStatus,
  updatePartnerStatus
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission('partners', 'OrgAdmin'),
  validatePartnerId,
  deletePartner
);

module.exports = router;