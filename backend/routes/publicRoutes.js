const express = require('express');

const router = express.Router();

const {
  getPublicEventsAndCamps
} = require('../controllers/publicController');

const {
  getPublicOpportunities,
  getPublicOpportunityById,
  applyToOpportunity
} = require('../controllers/opportunityController');

const {
  validatePublicEventsAndCamps
} = require('../middleware/public');

// Public — no auth.
// Powers the Home Page "Organization Events & Camps" section.
router.get(
  '/events-camps',
  validatePublicEventsAndCamps,
  getPublicEventsAndCamps
);

// Public — no auth.
// Home Page Opportunities browsing/apply.
router.get(
  '/opportunities',
  getPublicOpportunities
);

router.get(
  '/opportunities/:id',
  getPublicOpportunityById
);

router.post(
  '/opportunities/:id/apply',
  applyToOpportunity
);

module.exports = router;