const validateCreateGroup = (req, res, next) => {
  const {
    name,
    description,
    memberIds
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Department name is required.'
    });
  }

  req.discussionData = {
    name,
    description,
    memberIds
  };

  next();
};

const validateUpdateGroup = (req, res, next) => {
  const {
    name,
    description
  } = req.body;

  if (
    name === undefined &&
    description === undefined
  ) {
    return res.status(400).json({
      success: false,
      error: 'Nothing to update.'
    });
  }

  if (
    name !== undefined &&
    (!name || !name.trim())
  ) {
    return res.status(400).json({
      success: false,
      error: 'Department name is required.'
    });
  }

  req.discussionData = {
    name,
    description
  };

  next();
};

const validateAddGroupMember = (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required.'
    });
  }

  req.discussionData = {
    userId
  };

  next();
};

const validatePostMessage = (req, res, next) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message cannot be empty.'
    });
  }

  req.discussionData = {
    message
  };

  next();
};

module.exports = {
  validateCreateGroup,
  validateUpdateGroup,
  validateAddGroupMember,
  validatePostMessage
};