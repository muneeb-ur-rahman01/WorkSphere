const express = require('express');

const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/auth');
const { requireOperational } = require('../middleware/subscriptionAccess');
const { publicLimiter } = require('../middleware/rateLimiter');
const { handle } = require('../utils/handle');
const { STAFF_ROLES } = require('../services/attendanceService');
const d = require('../services/donationService');

// ---- Public: payment gateway callback / webhook. No session; authenticity comes
// from the gateway signature verified server-side in the service. ----
const callback = async (req, res) => {
  try {
    const { redirectUrl } = await d.handleCallback({ payload: { ...req.query, ...req.body } });
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('[donations] callback error:', err.message);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/staff/donations?status=failed&reason=server`);
  }
};
router.get('/callback', publicLimiter, callback);
router.post('/callback', publicLimiter, callback);

router.use(requireAuth);

// ---- staff: their own donations only ----
const staff = requireRole(...STAFF_ROLES);
router.get('/status', staff, handle(() => d.gatewayStatus(), null));
router.get('/campaigns', staff, handle((r) => d.listCampaigns({ user: r.user }), null));
router.get('/mine', staff, handle((r) => d.listMine({ user: r.user }), 'donations'));
router.post('/checkout', staff, requireOperational(), handle((r) => d.startCheckout({ user: r.user, ...(r.body || {}) }), null, 'Could not start the donation.'));

// ---- OrgAdmin: fundraising report for the own organization ----
router.get('/report', requireRole('OrgAdmin'), handle((r) => d.report({ user: r.user, query: r.query }), null));
router.post('/:id/refund', requireRole('OrgAdmin'), requireOperational(), handle((r) => d.refund({ user: r.user, id: r.params.id }), 'donation'));

module.exports = router;
