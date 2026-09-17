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

/*
|--------------------------------------------------------------------------
| Public Auth Routes
|--------------------------------------------------------------------------
*/

/*
 * POST /api/auth/login
 */
router.post(
  '/login',
  login
);

/*
 * POST /api/auth/register-organization
 */
router.post(
  '/register-organization',
  registerOrganization
);

/*
 * POST /api/auth/register-staff
 */
router.post(
  '/register-staff',
  registerStaff
);

/*
 * POST /api/auth/forgot-password
 */
router.post(
  '/forgot-password',
  forgotPassword
);

/*
 * GET /api/auth/reset-password/:token/validate
 */
router.get(
  '/reset-password/:token/validate',
  validateResetToken
);

/*
 * POST /api/auth/reset-password
 */
router.post(
  '/reset-password',
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