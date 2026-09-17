const OPPORTUNITY_TYPES = [
  'Job',
  'Internship',
  'Fellowship',
  'Scholarship',
  'Volunteer',
  'Training',
  'Other'
];

const REMOTE_STATUSES = [
  'Remote',
  'OnSite',
  'Hybrid'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateCreateOpportunity = (req, res, next) => {
  const {
    title,
    description,
    opportunityType,
    eligibility,
    requirements,
    applicationDeadline,
    location,
    remoteStatus,
    applicationInstructions,
    applicationLink,
    contactInfo,
    imageUrl
  } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Title is required.'
    });
  }

  if (
    opportunityType &&
    !OPPORTUNITY_TYPES.includes(opportunityType)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid opportunity type.'
    });
  }

  if (
    remoteStatus &&
    !REMOTE_STATUSES.includes(remoteStatus)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid remote status.'
    });
  }

  req.opportunityData = {
    title,
    description,
    opportunityType,
    eligibility,
    requirements,
    applicationDeadline,
    location,
    remoteStatus,
    applicationInstructions,
    applicationLink,
    contactInfo,
    imageUrl
  };

  next();
};

const validateUpdateOpportunity = (req, res, next) => {
  const {
    title,
    description,
    opportunityType,
    eligibility,
    requirements,
    applicationDeadline,
    location,
    remoteStatus,
    applicationInstructions,
    applicationLink,
    contactInfo,
    imageUrl,
    status
  } = req.body;

  if (
    opportunityType !== undefined &&
    !OPPORTUNITY_TYPES.includes(opportunityType)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid opportunity type.'
    });
  }

  if (
    remoteStatus !== undefined &&
    !REMOTE_STATUSES.includes(remoteStatus)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid remote status.'
    });
  }

  if (
    status !== undefined &&
    !['Draft', 'Published', 'Unpublished'].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.opportunityData = {
    title,
    description,
    opportunityType,
    eligibility,
    requirements,
    applicationDeadline,
    location,
    remoteStatus,
    applicationInstructions,
    applicationLink,
    contactInfo,
    imageUrl,
    status
  };

  next();
};

const validateOpportunityId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Opportunity ID is required.'
    });
  }

  next();
};

const validateOpportunityApplication = (req, res, next) => {
  const {
    name,
    email,
    phone,
    coverNote,
    resumeUrl
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required.'
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.'
    });
  }

  req.applicationData = {
    name,
    email,
    phone,
    coverNote,
    resumeUrl
  };

  next();
};

module.exports = {
  validateCreateOpportunity,
  validateUpdateOpportunity,
  validateOpportunityId,
  validateOpportunityApplication
};