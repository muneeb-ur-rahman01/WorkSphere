const notificationService = require('../services/notificationService');

const getNotifications = async (req, res) => {
  try {
    const notifications =
      await notificationService.getNotifications({
        user: req.user
      });

    return res.json({
      success: true,
      notifications
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not fetch notifications.'
    });
  }
};

const sendCustomAlert = async (req, res) => {
  try {
    const notification =
      await notificationService.sendCustomAlert({
        user: req.user,
        ...req.notificationData
      });

    return res.json({
      success: true,
      notification
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not send notification.'
    });
  }
};

module.exports = {
  getNotifications,
  sendCustomAlert
};