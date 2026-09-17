const analyticsService = require('../services/analyticService');

const getOrgAnalytics = async (req, res) => {
  try {
    console.log('[Analytics Controller] User:', {
      id: req.user?.id,
      role: req.user?.role,
      orgId: req.user?.orgId,
      organizationId: req.user?.organizationId,
      org_id: req.user?.org_id,
      range: req.analyticsRange
    });

    const analytics =
      await analyticsService.getOrgAnalytics({
        orgId:
          req.user?.orgId ||
          req.user?.organizationId ||
          req.user?.org_id,

        range:
          req.analyticsRange || 'weekly'
      });

    return res.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error(
      'ORG ANALYTICS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not load analytics.'
    });
  }
};

const getPlatformAnalytics = async (req, res) => {
  try {
    console.log(
      '[Platform Analytics] Request:',
      {
        userId: req.user?.id,
        role: req.user?.role,
        range:
          req.analyticsRange || 'weekly'
      }
    );

    const analytics =
      await analyticsService.getPlatformAnalytics({
        range:
          req.analyticsRange || 'weekly'
      });

    return res.json({
      success: true,
      ...analytics
    });
  } catch (error) {
    console.error(
      'PLATFORM ANALYTICS ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not load platform analytics.'
    });
  }
};

module.exports = {
  getOrgAnalytics,
  getPlatformAnalytics
};