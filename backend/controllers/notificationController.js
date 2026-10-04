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

const markRead = async (req, res) => {
  try {
    await notificationService.markRead({ user: req.user, id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Could not mark notification as read.' });
  }
};

const markAllRead = async (req, res) => {
  try {
    const result = await notificationService.markAllRead({ user: req.user });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Could not mark notifications as read.' });
  }
};

module.exports = {
  markRead,
  markAllRead,
  getNotifications,
  sendCustomAlert
};