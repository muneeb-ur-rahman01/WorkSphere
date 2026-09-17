const validateDocumentQuery = (req, res, next) => {
  const { orgId, entityType, entityId, status } = req.query;

  req.documentFilters = {
    orgId,
    entityType,
    entityId,
    status
  };

  next();
};

const validateCreateDocument = (req, res, next) => {
  const {
    title,
    category,
    fileUrl,
    entityType,
    entityId,
    expiryDate
  } = req.body;

  if (!title || !fileUrl) {
    return res.status(400).json({
      success: false,
      error: 'title and fileUrl are required.'
    });
  }

  req.documentData = {
    title,
    category,
    fileUrl,
    entityType,
    entityId,
    expiryDate
  };

  next();
};

const validateDocumentStatus = (req, res, next) => {
  const { status } = req.body;

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  req.documentStatus = status;

  next();
};

const validateDocumentId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Document id is required.'
    });
  }

  next();
};

module.exports = {
  validateDocumentQuery,
  validateCreateDocument,
  validateDocumentStatus,
  validateDocumentId
};