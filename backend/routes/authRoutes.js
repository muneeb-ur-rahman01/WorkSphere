const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  login, registerOrganization, registerStaff, changePassword, me,
  forgotPassword, validateResetToken, resetPassword
} = require('../controllers/authController');

router.post('/login', login);
router.post('/register-organization', registerOrganization);
router.post('/register-staff', registerStaff);
router.post('/change-password', requireAuth, changePassword);
router.get('/me', requireAuth, me);

// Forgot / Reset Password
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token/validate', validateResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;
