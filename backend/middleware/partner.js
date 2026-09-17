const validatePartnerQuery = (req, res, next) => {
  req.partnerFilters = {
    orgId: req.query.orgId,
    status: req.query.status
  };

  next();
};

const validateCreatePartner = (req, res, next) => {
  const {
    name,
    partnershipType,
    contactName,
    email,
    phone,
    responsibilities,
    agreementNotes
  } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Name is required.'
    });
  }

  req.partnerData = {
    name,
    partnershipType,
    contactName,
    email,
    phone,
    responsibilities,
    agreementNotes
  };

  next();
};

const validateUpdatePartner = (req, res, next) => {
  const {
    name,
    partnershipType,
    contactName,
    email,
    phone,
    responsibilities,
    agreementNotes
  } = req.body;

  req.partnerData = {
    name,
    partnershipType,
    contactName,
    email,
    phone,
    responsibilities,
    agreementNotes
  };

  next();
};

const validatePartnerStatus = (req, res, next) => {
  const { status } = req.body;

  if (
    !['Active', 'Ended', 'Rejected', 'Pending'].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.partnerStatus = status;

  next();
};

const validatePartnerId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Partner ID is required.'
    });
  }

  next();
};

module.exports = {
  validatePartnerQuery,
  validateCreatePartner,
  validateUpdatePartner,
  validatePartnerStatus,
  validatePartnerId
};