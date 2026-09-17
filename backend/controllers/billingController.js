const billingService = require(
  '../services/billingService'
);

// ============================================================
// GET /api/billing/overview
// ============================================================

const getBillingOverview = async (
  req,
  res
) => {
  try {
    const organizations =
      await billingService.getBillingOverview(
        req.billingFilters
      );

    return res.json({
      success: true,
      organizations
    });
  } catch (error) {
    console.error(
      '[getBillingOverview controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not fetch billing overview.'
    });
  }
};

// ============================================================
// GET /api/billing/organizations/:orgId/history
// ============================================================

const getOrgBillingHistory = async (
  req,
  res
) => {
  try {
    const billingHistory =
      await billingService.getOrgBillingHistory({
        orgId: req.params.orgId
      });

    return res.json({
      success: true,
      events:
        billingHistory.events,
      payments:
        billingHistory.payments
    });
  } catch (error) {
    console.error(
      '[getOrgBillingHistory controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not fetch billing history.'
    });
  }
};

module.exports = {
  getBillingOverview,
  getOrgBillingHistory
};