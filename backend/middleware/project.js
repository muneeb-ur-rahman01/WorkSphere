const {
  STATUSES
} = require('../services/projectService');

const validateProjectQuery = (req, res, next) => {
  req.projectFilters = {
    orgId: req.query.orgId
  };

  next();
};

const validateCreateProject = (req, res, next) => {
  const {
    title,
    description,
    objectives,
    location,
    startDate,
    endDate,
    budget,
    status
  } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Title is required.'
    });
  }

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.projectData = {
    title,
    description,
    objectives,
    location,
    startDate,
    endDate,
    budget,
    status
  };

  next();
};

const validateUpdateProject = (req, res, next) => {
  const {
    title,
    description,
    objectives,
    location,
    startDate,
    endDate,
    budget,
    status
  } = req.body;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.projectData = {
    title,
    description,
    objectives,
    location,
    startDate,
    endDate,
    budget,
    status
  };

  next();
};

const validateProjectTeamMember = (req, res, next) => {
  const {
    userId,
    roleOnEntity
  } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required.'
    });
  }

  req.teamMemberData = {
    userId,
    roleOnEntity
  };

  next();
};

const validateProjectAssignmentStatus = (req, res, next) => {
  const allowedStatuses = [
    'Accepted',
    'In Progress',
    'Completed'
  ];

  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid project assignment status.'
    });
  }

  req.assignmentStatus = status;
  next();
};

module.exports = {
  validateProjectQuery,
  validateCreateProject,
  validateUpdateProject,
  validateProjectTeamMember,
  validateProjectAssignmentStatus
};