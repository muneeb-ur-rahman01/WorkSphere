const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  requireOperational
} = require('../middleware/subscriptionAccess');

const {
  validateCreateOpportunity,
  validateUpdateOpportunity,
  validateOpportunityId
} = require('../middleware/opportunity');

const {
  getMyOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunityApplications
} = require('../controllers/opportunityController');

router.use(
  requireAuth,
  requireRole('OrgAdmin')
);

router.get(
  '/',
  getMyOpportunities
);

router.post(
  '/',
  requireOperational(),
  validateCreateOpportunity,
  createOpportunity
);

router.patch(
  '/:id',
  requireOperational(),
  validateOpportunityId,
  validateUpdateOpportunity,
  updateOpportunity
);

// Deletion remains allowed even when subscription is locked.
router.delete(
  '/:id',
  validateOpportunityId,
  deleteOpportunity
);

router.get(
  '/:id/applications',
  validateOpportunityId,
  getOpportunityApplications
);

module.exports = router;