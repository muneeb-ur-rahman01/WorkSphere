const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { initiatePayment, handleCallback, getPayments, getPlans, markRefunded } = require('../controllers/paymentController');

// Public: plan catalogue + gateway return callback (the active gateway
// redirects the customer's browser here — see backend/utils/paymentGateways)
router.get('/plans', getPlans);
router.get('/callback', handleCallback);
router.post('/callback', handleCallback);

// Protected: initiate a checkout + view payment history. Intentionally NOT
// gated by requireOperational — an org with overdue payment must still be
// able to reach billing endpoints to pay and self-restore access.
router.post('/initiate', requireAuth, initiatePayment);
router.get('/', requireAuth, getPayments);

// SuperAdmin: record a refund for audit purposes.
router.post('/:id/refund', requireAuth, requireRole('SuperAdmin'), markRefunded);

module.exports = router;
