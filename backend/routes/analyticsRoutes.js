const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getOrgAnalytics, getPlatformAnalytics } = require('../controllers/analyticsController');

router.use(requireAuth);
router.get('/org', requireRole('OrgAdmin'), getOrgAnalytics);
router.get('/platform', requireRole('SuperAdmin'), getPlatformAnalytics);

module.exports = router;
