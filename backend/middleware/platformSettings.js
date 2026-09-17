const validatePlatformSettingKey = (
  req,
  res,
  next
) => {
  if (!req.params.key) {
    return res.status(400).json({
      success: false,
      error: 'Setting key is required.'
    });
  }

  next();
};

const validatePlatformSettingUpdate = (
  req,
  res,
  next
) => {
  if (!Object.prototype.hasOwnProperty.call(req.body, 'value')) {
    return res.status(400).json({
      success: false,
      error: 'Setting value is required.'
    });
  }

  req.platformSettingData = {
    value: req.body.value
  };

  next();
};

module.exports = {
  validatePlatformSettingKey,
  validatePlatformSettingUpdate
};