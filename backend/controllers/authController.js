const authService = require('../services/authService');

/*
|--------------------------------------------------------------------------
| POST /api/auth/login
|--------------------------------------------------------------------------
*/

const login = async (req, res) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      roleDomain: req.body.roleDomain
    });

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[login controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error: 'Server error. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/register-organization
|--------------------------------------------------------------------------
*/

const registerOrganization = async (req, res) => {
  try {
    const result =
      await authService.registerOrganization({
        orgName: req.body.orgName,
        adminName: req.body.adminName,
        email: req.body.email,
        password: req.body.password,
        plan: req.body.plan
      });

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[registerOrganization controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Registration failed. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/register-staff
|--------------------------------------------------------------------------
*/

const registerStaff = async (req, res) => {
  try {
    const result =
      await authService.registerStaff({
        fullName: req.body.fullName,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
        orgId: req.body.orgId
      });

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[registerStaff controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Registration failed. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/change-password
|--------------------------------------------------------------------------
*/

const changePassword = async (req, res) => {
  try {
    const result =
      await authService.changePassword({
        userId: req.user.id,
        currentPassword:
          req.body.currentPassword,
        newPassword:
          req.body.newPassword
      });

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[changePassword controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not update password. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/auth/me
|--------------------------------------------------------------------------
*/

const me = async (req, res) => {
  try {
    const result =
      await authService.getCurrentUser(
        req.user.id
      );

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[me controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Server error. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/forgot-password
|--------------------------------------------------------------------------
*/

const forgotPassword = async (req, res) => {
  try {
    const result =
      await authService.forgotPassword(
        req.body.email
      );

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[forgotPassword controller]',
      error.message
    );

    return res.json({
      success: true,
      message:
        "If an account exists for that email, we've sent a password reset link to it."
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/auth/reset-password/:token/validate
|--------------------------------------------------------------------------
*/

const validateResetToken = async (req, res) => {
  try {
    const result =
      await authService.validateResetToken(
        req.params.token
      );

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[validateResetToken controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Server error. Please try again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/auth/reset-password
|--------------------------------------------------------------------------
*/

const resetPassword = async (req, res) => {
  try {
    const result =
      await authService.resetPassword({
        token: req.body.token,
        newPassword:
          req.body.newPassword
      });

    return res
      .status(result.status)
      .json(result.body);
  } catch (error) {
    console.error(
      '[resetPassword controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        'Could not reset password. Please try again.'
    });
  }
};

module.exports = {
  login,
  registerOrganization,
  registerStaff,
  changePassword,
  me,
  forgotPassword,
  validateResetToken,
  resetPassword
};