const validateBillingOverview = (
  req,
  res,
  next
) => {
  const {
    status = 'All',
    search = '',
    from,
    to
  } = req.query;

  const allowedStatuses = [
    'All',
    'Trial',
    'Basic',
    'Standard',
    'Premium',
    'Paid',
    'Pending',
    'PastDue',
    'Suspended'
  ];

  if (
    status &&
    !allowedStatuses.includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid billing status.'
    });
  }

  if (from && isNaN(Date.parse(from))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid from date.'
    });
  }

  if (to && isNaN(Date.parse(to))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid to date.'
    });
  }

  req.billingFilters = {
    status,
    search,
    from,
    to
  };

  next();
};

const validateBillingHistoryAccess = (
  req,
  res,
  next
) => {
  const { orgId } = req.params;

  if (
    req.user.role !== 'SuperAdmin' &&
    req.user.orgId !== orgId
  ) {
    return res.status(403).json({
      success: false,
      error:
        'You are not authorized to view this billing history.'
    });
  }

  next();
};

module.exports = {
  validateBillingOverview,
  validateBillingHistoryAccess
};