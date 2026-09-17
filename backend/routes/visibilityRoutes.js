const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateVisibilityRequest,
  validateVisibilityQuery,
  validateVisibilityReview
} = require('../middleware/visibility');

const {
  requestVisibility,
  getMyVisibilityRequests,
  getVisibilityRequests,
  reviewVisibilityRequest
} = require('../controllers/visibilityController');

router.use(requireAuth);

// Org Admin
router.post(
  '/',
  requireRole('OrgAdmin'),
  validateVisibilityRequest,
  requestVisibility
);

router.get(
  '/mine',
  requireRole('OrgAdmin'),
  getMyVisibilityRequests
);

// Super Admin
router.get(
  '/',
  requireRole('SuperAdmin'),
  validateVisibilityQuery,
  getVisibilityRequests
);

router.patch(
  '/review',
  requireRole('SuperAdmin'),
  validateVisibilityReview,
  reviewVisibilityRequest
);

module.exports = router;