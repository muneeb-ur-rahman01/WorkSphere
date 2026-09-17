const ITEM_TYPES = ['camp', 'event'];
const REVIEW_DECISIONS = ['Approved', 'Rejected'];
const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'All'];

const validateVisibilityRequest = (req, res, next) => {
  const { itemType, itemId } = req.body;

  if (!ITEM_TYPES.includes(itemType)) {
    return res.status(400).json({
      success: false,
      error: 'itemType must be "camp" or "event".'
    });
  }

  if (!itemId) {
    return res.status(400).json({
      success: false,
      error: 'itemId is required.'
    });
  }

  req.visibilityData = {
    itemType,
    itemId
  };

  next();
};

const validateVisibilityQuery = (req, res, next) => {
  const status = req.query.status || 'Pending';

  if (!REQUEST_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid visibility request status.'
    });
  }

  req.visibilityFilters = { status };

  next();
};

const validateVisibilityReview = (req, res, next) => {
  const { itemType, itemId, decision, reason } = req.body;

  if (!ITEM_TYPES.includes(itemType)) {
    return res.status(400).json({
      success: false,
      error: 'itemType must be "camp" or "event".'
    });
  }

  if (!itemId) {
    return res.status(400).json({
      success: false,
      error: 'itemId is required.'
    });
  }

  if (!REVIEW_DECISIONS.includes(decision)) {
    return res.status(400).json({
      success: false,
      error: 'decision must be "Approved" or "Rejected".'
    });
  }

  req.visibilityReviewData = {
    itemType,
    itemId,
    decision,
    reason
  };

  next();
};

module.exports = {
  validateVisibilityRequest,
  validateVisibilityQuery,
  validateVisibilityReview
};