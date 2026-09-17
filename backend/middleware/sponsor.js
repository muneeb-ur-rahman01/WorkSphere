const STATUSES = ['Proposed', 'Active', 'Completed', 'Cancelled'];

const validateSponsorQuery = (req, res, next) => {
  req.sponsorFilters = {
    orgId: req.query.orgId
  };

  next();
};

const validateCreateSponsor = (req, res, next) => {
  const {
    name,
    contactName,
    email,
    phone,
    notes
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required.'
    });
  }

  req.sponsorData = {
    name,
    contactName,
    email,
    phone,
    notes
  };

  next();
};

const validateUpdateSponsor = (req, res, next) => {
  const {
    name,
    contactName,
    email,
    phone,
    notes
  } = req.body;

  req.sponsorData = {
    name,
    contactName,
    email,
    phone,
    notes
  };

  next();
};

const validateSponsorshipQuery = (req, res, next) => {
  req.sponsorshipFilters = {
    orgId: req.query.orgId,
    sponsorId: req.query.sponsorId,
    projectId: req.query.projectId,
    campaignId: req.query.campaignId
  };

  next();
};

const validateCreateSponsorship = (req, res, next) => {
  const {
    sponsorId,
    projectId,
    campaignId,
    packageName,
    amount,
    status,
    startDate,
    endDate,
    notes
  } = req.body;

  if (!sponsorId) {
    return res.status(400).json({
      success: false,
      error: 'sponsorId is required.'
    });
  }

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.sponsorshipData = {
    sponsorId,
    projectId,
    campaignId,
    packageName,
    amount,
    status,
    startDate,
    endDate,
    notes
  };

  next();
};

const validateUpdateSponsorship = (req, res, next) => {
  const {
    packageName,
    amount,
    status,
    startDate,
    endDate,
    notes
  } = req.body;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.sponsorshipData = {
    packageName,
    amount,
    status,
    startDate,
    endDate,
    notes
  };

  next();
};

module.exports = {
  validateSponsorQuery,
  validateCreateSponsor,
  validateUpdateSponsor,
  validateSponsorshipQuery,
  validateCreateSponsorship,
  validateUpdateSponsorship
};