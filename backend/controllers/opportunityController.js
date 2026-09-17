const opportunityService = require('../services/opportunityService');

// ============================================================
// Org Admin
// ============================================================

const getMyOpportunities = async (req, res) => {
  try {
    const opportunities = await opportunityService.getMyOpportunities({
      orgId: req.user.orgId
    });

    return res.json({
      success: true,
      opportunities
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch opportunities.'
    });
  }
};

const createOpportunity = async (req, res) => {
  try {
    const opportunity = await opportunityService.createOpportunity({
      orgId: req.user.orgId,
      opportunityData: req.opportunityData
    });

    return res.json({
      success: true,
      opportunity
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create opportunity.'
    });
  }
};

const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await opportunityService.updateOpportunity({
      orgId: req.user.orgId,
      id: req.params.id,
      opportunityData: req.opportunityData
    });

    return res.json({
      success: true,
      opportunity
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update opportunity.'
    });
  }
};

const deleteOpportunity = async (req, res) => {
  try {
    await opportunityService.deleteOpportunity({
      orgId: req.user.orgId,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete opportunity.'
    });
  }
};

const getOpportunityApplications = async (req, res) => {
  try {
    const applications =
      await opportunityService.getOpportunityApplications({
        orgId: req.user.orgId,
        id: req.params.id
      });

    return res.json({
      success: true,
      applications
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch applications.'
    });
  }
};

// ============================================================
// Public
// ============================================================

const getPublicOpportunities = async (req, res) => {
  try {
    const opportunities =
      await opportunityService.getPublicOpportunities();

    return res.json({
      success: true,
      opportunities
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch opportunities.'
    });
  }
};

const getPublicOpportunityById = async (req, res) => {
  try {
    const opportunity =
      await opportunityService.getPublicOpportunityById({
        id: req.params.id
      });

    return res.json({
      success: true,
      opportunity
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Opportunity not found.'
    });
  }
};

const applyToOpportunity = async (req, res) => {
  try {
    const application =
      await opportunityService.applyToOpportunity({
        id: req.params.id,
        applicationData: req.applicationData
      });

    return res.json({
      success: true,
      application
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not submit your application.'
    });
  }
};

module.exports = {
  getMyOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunityApplications,
  getPublicOpportunities,
  getPublicOpportunityById,
  applyToOpportunity
};