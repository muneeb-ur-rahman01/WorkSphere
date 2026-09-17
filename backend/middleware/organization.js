const validateOrgId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Organization ID is required.'
    });
  }

  next();
};

const validateOrgStatus = (req, res, next) => {
  const { status } = req.body;

  if (!['Active', 'Pending', 'Suspended'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value.'
    });
  }

  req.organizationStatus = status;

  next();
};

const validatePublicEvents = (req, res, next) => {
  const { enabled } = req.body;

  req.publicEventsData = {
    enabled: Boolean(enabled)
  };

  next();
};

const validateDirectoryProfile = (req, res, next) => {
  const {
    missionStatement,
    focusArea,
    city,
    website,
    logoUrl,
    directoryVisible
  } = req.body;

  req.directoryProfileData = {
    missionStatement,
    focusArea,
    city,
    website,
    logoUrl,
    directoryVisible
  };

  next();
};

const validateCancellationRequest = (req, res, next) => {
  const { cancel } = req.body;

  req.cancellationData = {
    cancel: Boolean(cancel)
  };

  next();
};

module.exports = {
  validateOrgId,
  validateOrgStatus,
  validatePublicEvents,
  validateDirectoryProfile,
  validateCancellationRequest
};