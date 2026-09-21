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

// Documents are links to files that live in Google Drive. Only https links
// on Google's Drive/Docs hosts are accepted (this also stops "javascript:"
// or other unsafe URLs from ever being stored and rendered as a link).
const DRIVE_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'drive.usercontent.google.com'
];

const isValidDriveUrl = (value) => {
  try {
    const url = new URL(String(value || '').trim());

    return (
      url.protocol === 'https:' &&
      DRIVE_HOSTS.includes(url.hostname.toLowerCase()) &&
      (url.pathname.length > 1 || url.searchParams.has('id'))
    );
  } catch (err) {
    return false;
  }
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

  if (!isValidDriveUrl(fileUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid Google Drive link (https://drive.google.com/… or https://docs.google.com/…).'
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