const jwt = require('jsonwebtoken');

const supabase = require('../config/supabase');

/*
|--------------------------------------------------------------------------
| Require Authentication
|--------------------------------------------------------------------------
*/

const requireAuth = (req, res, next) => {
  const header =
    req.headers.authorization || '';

  const token =
    header.startsWith('Bearer ')
      ? header.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No auth token provided.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error:
        'Invalid or expired session. Please log in again.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| Require Specific Role
|--------------------------------------------------------------------------
|
| Example:
| requireRole('SuperAdmin')
|
| Example:
| requireRole('SuperAdmin', 'OrgAdmin')
|
*/

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (
      !req.user ||
      !roles.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error:
          'You are not authorized to perform this action.'
      });
    }

    next();
  };
};

/*
|--------------------------------------------------------------------------
| Require Role OR Section Permission
|--------------------------------------------------------------------------
|
| Used for staff members who may have access
| through the Accessibility / Permissions screen.
|
*/

const requireRoleOrSectionPermission = (
  sectionKey,
  ...roles
) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        error:
          'You are not authorized to perform this action.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Direct role access
    |--------------------------------------------------------------------------
    */

    if (roles.includes(req.user.role)) {
      return next();
    }

    /*
    |--------------------------------------------------------------------------
    | Section permission access
    |--------------------------------------------------------------------------
    */

    try {
      const { data, error } =
        await supabase
          .from('staff_permissions')
          .select('id')
          .eq(
            'user_id',
            req.user.id
          )
          .eq(
            'section_key',
            sectionKey
          )
          .maybeSingle();

      if (error) {
        console.error(
          '[requireRoleOrSectionPermission]',
          error.message
        );

        return res.status(403).json({
          success: false,
          error:
            'You are not authorized to perform this action.'
        });
      }

      if (data) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error:
          'You are not authorized to perform this action.'
      });
    } catch (error) {
      console.error(
        '[requireRoleOrSectionPermission]',
        error.message
      );

      return res.status(403).json({
        success: false,
        error:
          'You are not authorized to perform this action.'
      });
    }
  };
};

module.exports = {
  requireAuth,
  requireRole,
  requireRoleOrSectionPermission
};