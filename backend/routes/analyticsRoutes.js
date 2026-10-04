const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getOrgAnalytics, getPlatformAnalytics } = require('../controllers/analyticsController');

const { handle } = require('../utils/handle');
const { getHrInsights } = require('../services/hrInsightsService');

router.use(requireAuth);
router.get('/org', requireRole('OrgAdmin'), getOrgAnalytics);
router.get('/hr-insights', requireRole('OrgAdmin'), handle((r) => getHrInsights({ orgId: r.user.orgId }), 'insights', 'Could not load HR insights.'));
router.get('/platform', requireRole('SuperAdmin'), getPlatformAnalytics);

module.exports = router;
