const express = require('express');

const router = express.Router();

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

const {
  requireAuth
} = require('../middleware/auth');

const {
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  checkAccountThrottle
} = require('../middleware/rateLimiter');

/*
|--------------------------------------------------------------------------
| Public Auth Routes
|--------------------------------------------------------------------------
*/

/*
 * POST /api/auth/login
 *
 * authLimiter: bounds login attempts per IP.
 * checkAccountThrottle: blocks a specific account once it has hit
 *   LOGIN_MAX_FAILURES failed attempts (Redis-backed, atomic).
 */
router.post(
  '/login',
  authLimiter,
  checkAccountThrottle,
  login
);

/*
 * POST /api/auth/register-organization
 */
router.post(
  '/register-organization',
  registrationLimiter,
  registerOrganization
);

/*
 * POST /api/auth/register-staff
 */
router.post(
  '/register-staff',
  registrationLimiter,
  registerStaff
);

/*
 * POST /api/auth/forgot-password
 *
 * passwordResetLimiter bounds requests per IP; the per-email cooldown
 * (services/authService.js, Redis SET NX EX) additionally bounds how
 * often any single email address can trigger a reset email.
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  forgotPassword
);

/*
 * GET /api/auth/reset-password/:token/validate
 */
router.get(
  '/reset-password/:token/validate',
  passwordResetLimiter,
  validateResetToken
);

/*
 * POST /api/auth/reset-password
 */
router.post(
  '/reset-password',
  passwordResetLimiter,
  resetPassword
);

/*
|--------------------------------------------------------------------------
| Protected Auth Routes
|--------------------------------------------------------------------------
*/

/*
 * POST /api/auth/change-password
 */
router.post(
  '/change-password',
  requireAuth,
  changePassword
);

/*
 * GET /api/auth/me
 */
router.get(
  '/me',
  requireAuth,
  me
);

module.exports = router;
