const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getBillingOverview, getOrgBillingHistory } = require('../controllers/billingController');

router.use(requireAuth);

router.get('/overview', requireRole('SuperAdmin'), getBillingOverview);
router.get('/organizations/:orgId/history', getOrgBillingHistory); // access check inside (SuperAdmin or own org)

module.exports = router;
