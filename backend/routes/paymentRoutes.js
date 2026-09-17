const express = require('express');

const router = express.Router();

const {
  requireAuth,
  requireRole
} = require('../middleware/auth');

const {
  validateInitiatePayment,
  validateRefund,
  validatePaymentId
} = require('../middleware/payment');

const {
  initiatePayment,
  handleCallback,
  getPayments,
  getPlans,
  markRefunded
} = require('../controllers/paymentController');

// Public: plan catalogue
router.get('/plans', getPlans);

// Public: payment gateway callback
router.get('/callback', handleCallback);
router.post('/callback', handleCallback);

// Protected: payment initiation.
// Intentionally NOT gated by requireOperational.
router.post(
  '/initiate',
  requireAuth,
  validateInitiatePayment,
  initiatePayment
);

// Protected: payment history
router.get(
  '/',
  requireAuth,
  getPayments
);

// SuperAdmin only: mark payment as refunded
router.post(
  '/:id/refund',
  requireAuth,
  requireRole('SuperAdmin'),
  validatePaymentId,
  validateRefund,
  markRefunded
);

module.exports = router;