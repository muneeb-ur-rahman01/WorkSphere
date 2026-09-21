const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateSubmitQuery = (req, res, next) => {
  const {
    name,
    email,
    subject,
    message,
    website,
    orgId
  } = req.body;

  // Honeypot — silently accept and drop spam submissions.
  if (website && website.trim()) {
    console.log('[validateSubmitQuery] Honeypot triggered:', website);

    req.querySpam = true;
    return next();
  }

  // Required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      error: 'Please fill in all required fields.'
    });
  }

  // Email validation
  if (!EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.'
    });
  }

  // Length validation
  if (
    name.length > 120 ||
    subject.length > 200 ||
    message.length > 4000
  ) {
    return res.status(400).json({
      success: false,
      error: 'One of the fields is too long.'
    });
  }

  // Data passed to controller/service
  req.queryData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject.trim(),
    message: message.trim(),
    orgId:
      typeof orgId === 'string' &&
      /^[0-9a-fA-F-]{36}$/.test(orgId.trim())
        ? orgId.trim()
        : null
  };

  console.log('[validateSubmitQuery] Validation passed:', {
    name: req.queryData.name,
    email: req.queryData.email,
    subject: req.queryData.subject
  });

  next();
};

const validateQueryStatus = (req, res, next) => {
  const { status } = req.body;

  if (!['New', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value.'
    });
  }

  req.queryStatus = status;

  next();
};

const validateQueryResponse = (req, res, next) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please write a response message.'
    });
  }

  if (message.trim().length > 4000) {
    return res.status(400).json({
      success: false,
      error: 'Response message is too long.'
    });
  }

  req.responseMessage = message.trim();

  next();
};

module.exports = {
  validateSubmitQuery,
  validateQueryStatus,
  validateQueryResponse
};