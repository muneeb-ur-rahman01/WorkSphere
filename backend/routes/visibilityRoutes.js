const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  requestVisibility,
  getMyVisibilityRequests,
  getVisibilityRequests,
  reviewVisibilityRequest
} = require('../controllers/visibilityController');

router.use(requireAuth);

// Org Admin
router.post('/', requireRole('OrgAdmin'), requestVisibility);
router.get('/mine', requireRole('OrgAdmin'), getMyVisibilityRequests);

// Super Admin
router.get('/', requireRole('SuperAdmin'), getVisibilityRequests);
router.patch('/review', requireRole('SuperAdmin'), reviewVisibilityRequest);

module.exports = router;
