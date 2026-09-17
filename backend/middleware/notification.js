const validateNotificationQuery = (req, res, next) => {
  next();
};

const validateCustomAlert = (req, res, next) => {
  const {
    title,
    message,
    targetRole,
    type
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      error: 'Title and message are required.'
    });
  }

  req.notificationData = {
    title,
    message,
    targetRole,
    type
  };

  next();
};

module.exports = {
  validateNotificationQuery,
  validateCustomAlert
};