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
  validateCreateBeneficiary
} = require('../middleware/beneficiary');

const {
  getBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
} = require(
  '../controllers/beneficiaryController'
);

router.use(requireAuth);

router.get(
  '/',
  getBeneficiaries
);

router.post(
  '/',
  requireRoleOrSectionPermission(
    'beneficiaries',
    'OrgAdmin'
  ),
  requireOperational(),
  validateCreateBeneficiary,
  createBeneficiary
);

router.patch(
  '/:id',
  requireRoleOrSectionPermission(
    'beneficiaries',
    'OrgAdmin'
  ),
  requireOperational(),
  updateBeneficiary
);

router.delete(
  '/:id',
  requireRoleOrSectionPermission(
    'beneficiaries',
    'OrgAdmin'
  ),
  deleteBeneficiary
);

module.exports = router;