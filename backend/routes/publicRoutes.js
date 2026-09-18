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

const { publicLimiter } = require('../middleware/rateLimiter');

// Public, unauthenticated routes get their own (looser than auth, tighter
// than the general API) rate limit since anyone on the internet can hit
// them without an account.
router.use(publicLimiter);

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