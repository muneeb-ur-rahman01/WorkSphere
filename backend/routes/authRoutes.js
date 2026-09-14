const express = require('express');

const router = express.Router();

const { requireAuth } = require('../middleware/auth');

const {
  authLimiter,
  checkAccountThrottle
} = require('../middleware/rateLimiter');

const {
  loginValidator,
  registerOrganizationValidator,
  registerStaffValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/authValidators');

const {
  login,
  registerOrganization,
  registerStaff,
  changePassword,
  me,
  forgotPassword,
  validateResetToken,
  resetPassword
} = require('../controllers/authController');

router.post(
  '/login',
  authLimiter,
  loginValidator,
  checkAccountThrottle,
  login
);

router.post(
  '/register-organization',
  registerOrganizationValidator,
  registerOrganization
);

router.post(
  '/register-staff',
  registerStaffValidator,
  registerStaff
);

router.post(
  '/change-password',
  requireAuth,
  changePasswordValidator,
  changePassword
);

router.get('/me', requireAuth, me);

// Forgot / Reset Password
router.post(
  '/forgot-password',
  forgotPasswordValidator,
  forgotPassword
);

router.get(
  '/reset-password/:token/validate',
  validateResetToken
);

router.post(
  '/reset-password',
  resetPasswordValidator,
  resetPassword
);

module.exports = router;