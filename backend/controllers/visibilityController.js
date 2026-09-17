const visibilityService = require('../services/visibilityService');

const handleError = (res, err, fallbackMessage) => {
  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || fallbackMessage
  });
};

const requestVisibility = async (req, res) => {
  try {
    const item = await visibilityService.requestVisibility({
      user: req.user,
      ...req.visibilityData
    });

    return res.json({
      success: true,
      item
    });
  } catch (err) {
    return handleError(
      res,
      err,
      'Could not submit the visibility request.'
    );
  }
};

const getMyVisibilityRequests = async (req, res) => {
  try {
    const requests = await visibilityService.getMyVisibilityRequests({
      user: req.user
    });

    return res.json({
      success: true,
      requests
    });
  } catch (err) {
    return handleError(
      res,
      err,
      'Could not fetch visibility requests.'
    );
  }
};

const getVisibilityRequests = async (req, res) => {
  try {
    const requests = await visibilityService.getVisibilityRequests(
      req.visibilityFilters
    );

    return res.json({
      success: true,
      requests
    });
  } catch (err) {
    return handleError(
      res,
      err,
      'Could not fetch visibility requests.'
    );
  }
};

const reviewVisibilityRequest = async (req, res) => {
  try {
    const item = await visibilityService.reviewVisibilityRequest(
      req.visibilityReviewData
    );

    return res.json({
      success: true,
      item
    });
  } catch (err) {
    return handleError(
      res,
      err,
      'Could not review the visibility request.'
    );
  }
};

module.exports = {
  requestVisibility,
  getMyVisibilityRequests,
  getVisibilityRequests,
  reviewVisibilityRequest
};