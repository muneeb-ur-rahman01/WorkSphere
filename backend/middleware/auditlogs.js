const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const auditLogMiddleware = (req, res, next) => {
  const { limit, before, action, entityType, orgId } = req.query;

  // Validate limit
  const parsedLimit = parseInt(limit, 10);

  const finalLimit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);

  // Validate before if provided
  if (before && Number.isNaN(Date.parse(before))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid before date.'
    });
  }

  // Store sanitized values for controller
  req.auditLogFilters = {
    limit: finalLimit,
    before: before || null,
    action: action || null,
    entityType: entityType || null,
    orgId: orgId || null
  };

  next();
};

module.exports = auditLogMiddleware;