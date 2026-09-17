const express = require('express');
const router = express.Router();

const {
  validateOpportunityId,
  validateOpportunityApplication
} = require('../middleware/opportunity');

const {
  getPublicOpportunities,
  getPublicOpportunityById,
  applyToOpportunity
} = require('../controllers/opportunityController');

router.get(
  '/',
  getPublicOpportunities
);

router.get(
  '/:id',
  validateOpportunityId,
  getPublicOpportunityById
);

router.post(
  '/:id/apply',
  validateOpportunityId,
  validateOpportunityApplication,
  applyToOpportunity
);

module.exports = router;