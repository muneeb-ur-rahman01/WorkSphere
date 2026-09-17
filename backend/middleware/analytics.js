const { VALID_RANGES } = require('../utils/analytics');

const analyticsMiddleware = (req, res, next) => {
  const range = req.query.range || 'weekly';

  if (!VALID_RANGES.includes(range)) {
    return res.status(400).json({
      success: false,
      error: `Invalid analytics range. Allowed values: ${VALID_RANGES.join(', ')}`
    });
  }

  // Controller/service ko clean validated value milegi
  req.analyticsRange = range;

  next();
};

module.exports = analyticsMiddleware;