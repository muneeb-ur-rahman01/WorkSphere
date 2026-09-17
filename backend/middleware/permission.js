const validatePermissionUserQuery = (req, res, next) => {
  if (!req.query.userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required.'
    });
  }

  next();
};

const validateGrantPermission = (req, res, next) => {
  const {
    userId,
    sectionKey
  } = req.body;

  if (!userId || !sectionKey) {
    return res.status(400).json({
      success: false,
      error: 'userId and sectionKey are required.'
    });
  }

  req.permissionData = {
    userId,
    sectionKey
  };

  next();
};

const validateRevokePermission = (req, res, next) => {
  const {
    userId,
    sectionKey
  } = req.body;

  if (!userId || !sectionKey) {
    return res.status(400).json({
      success: false,
      error: 'userId and sectionKey are required.'
    });
  }

  req.permissionData = {
    userId,
    sectionKey
  };

  next();
};

module.exports = {
  validatePermissionUserQuery,
  validateGrantPermission,
  validateRevokePermission
};