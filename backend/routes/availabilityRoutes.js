const express = require('express');

const router = express.Router();

const {
  requireAuth
} = require('../middleware/auth');

const availabilityMiddleware = require(
  '../middleware/availability'
);

const {
  getAvailability,
  updateAvailability
} = require(
  '../controllers/availabilityController'
);
router.use(requireAuth);

router.get(
  '/',
  getAvailability
);

router.post(
  '/',
  availabilityMiddleware,
  updateAvailability
);

module.exports = router;