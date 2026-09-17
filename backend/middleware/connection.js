const validateCreateConnection = (req, res, next) => {
  const { targetOrgId, message } = req.body;

  if (!targetOrgId) {
    return res.status(400).json({
      success: false,
      error: 'targetOrgId is required.'
    });
  }

  req.connectionData = {
    targetOrgId,
    message
  };

  next();
};

const validateConnectionResponse = (req, res, next) => {
  const { status } = req.body;

  if (!['Accepted', 'Declined'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.connectionData = {
    status
  };

  next();
};

const validateSendMessage = (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required.'
    });
  }

  req.connectionData = {
    message
  };

  next();
};

module.exports = {
  validateCreateConnection,
  validateConnectionResponse,
  validateSendMessage
};