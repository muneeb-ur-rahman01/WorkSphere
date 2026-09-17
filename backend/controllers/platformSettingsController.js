const platformSettingsService = require('../services/platformSettingsService');

const getPlatformSettings = async (req, res) => {
  try {
    const settings =
      await platformSettingsService.getPlatformSettings();

    return res.json({
      success: true,
      settings
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not fetch platform settings.'
    });
  }
};

const updatePlatformSetting = async (req, res) => {
  try {
    await platformSettingsService.updatePlatformSetting({
      user: req.user,
      key: req.params.key,
      value: req.platformSettingData.value
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not update setting.'
    });
  }
};

module.exports = {
  getPlatformSettings,
  updatePlatformSetting
};