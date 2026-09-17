const analyticsService = require('../services/analyticService');

const getOrgAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsService.getOrgAnalytics({
      orgId: req.user.orgId,
      range: req.analyticsRange
    });

    return res.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('ORG ANALYTICS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Could not load analytics.'
    });
  }
};

const getPlatformAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsService.getPlatformAnalytics({
      range: req.analyticsRange
    });

    return res.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error('PLATFORM ANALYTICS ERROR:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Could not load platform analytics.'
    });
  }
};

module.exports = {
  getOrgAnalytics,
  getPlatformAnalytics
};