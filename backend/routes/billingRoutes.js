const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateBillingOverview,
  validateBillingHistoryAccess
} = require('../middleware/billing');

const {
  getBillingOverview,
  getOrgBillingHistory
} = require(
  '../controllers/billingController'
);

router.use(requireAuth);

router.get(
  '/overview',
  requireRole('SuperAdmin'),
  validateBillingOverview,
  getBillingOverview
);

router.get(
  '/organizations/:orgId/history',
  validateBillingHistoryAccess,
  getOrgBillingHistory
);

module.exports = router;