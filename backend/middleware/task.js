const validateTaskQuery = (req, res, next) => {
  req.taskFilters = {
    orgId: req.query.orgId,
    projectId: req.query.projectId,
    campaignId: req.query.campaignId
  };

  next();
};

const validateCreateTask = (req, res, next) => {
  const {
    title,
    description,
    assignedToId,
    priority,
    dueDate,
    projectId,
    campaignId
  } = req.body;

  if (!title || !assignedToId) {
    return res.status(400).json({
      success: false,
      error: 'Title and assigned user are required.'
    });
  }

  req.taskData = {
    title,
    description,
    assignedToId,
    priority,
    dueDate,
    projectId,
    campaignId
  };

  next();
};

const validateTaskStatus = (req, res, next) => {
  const { status } = req.body;

  const allowedStatuses = [
    'Pending',
    'Accepted',
    'In Progress',
    'Completed'
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid task status.'
    });
  }

  req.taskStatus = status;

  next();
};

const validateTaskComment = (req, res, next) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Comment message is required.'
    });
  }

  req.taskCommentData = {
    message
  };

  next();
};

module.exports = {
  validateTaskQuery,
  validateCreateTask,
  validateTaskStatus,
  validateTaskComment
};