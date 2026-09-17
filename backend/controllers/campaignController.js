const campaignService = require(
  '../services/campaignService'
);

// ============================================================
// Campaigns
// ============================================================

const getCampaigns = async (
  req,
  res
) => {
  try {
    const campaigns =
      await campaignService.getCampaigns({
        user: req.user,
        orgId: req.query.orgId
      });

    return res.json({
      success: true,
      campaigns
    });
  } catch (error) {
    console.error(
      '[getCampaigns controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not fetch campaigns.'
    });
  }
};

const getCampaign = async (
  req,
  res
) => {
  try {
    const campaign =
      await campaignService.getCampaign({
        user: req.user,
        id: req.params.id
      });

    return res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error(
      '[getCampaign controller]',
      error.message
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      error:
        error.message ||
        'Could not fetch campaign.'
    });
  }
};

const createCampaign = async (
  req,
  res
) => {
  try {
    const {
      title,
      description,
      objective,
      campaignType,
      startDate,
      endDate,
      goalAmount,
      status
    } = req.body;

    const campaign =
      await campaignService.createCampaign({
        user: req.user,
        title,
        description,
        objective,
        campaignType,
        startDate,
        endDate,
        goalAmount,
        status
      });

    return res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error(
      '[createCampaign controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not create campaign.'
    });
  }
};

const updateCampaign = async (
  req,
  res
) => {
  try {
    const {
      title,
      description,
      objective,
      campaignType,
      startDate,
      endDate,
      goalAmount,
      status
    } = req.body;

    const campaign =
      await campaignService.updateCampaign({
        user: req.user,
        id: req.params.id,
        title,
        description,
        objective,
        campaignType,
        startDate,
        endDate,
        goalAmount,
        status
      });

    return res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error(
      '[updateCampaign controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not update campaign.'
    });
  }
};

const deleteCampaign = async (
  req,
  res
) => {
  try {
    await campaignService.deleteCampaign({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(
      '[deleteCampaign controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not delete campaign.'
    });
  }
};

// ============================================================
// Campaign Team
// ============================================================

const getCampaignTeam = async (
  req,
  res
) => {
  try {
    const members =
      await campaignService.getCampaignTeam({
        id: req.params.id
      });

    return res.json({
      success: true,
      members
    });
  } catch (error) {
    console.error(
      '[getCampaignTeam controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not fetch campaign team.'
    });
  }
};

const addCampaignTeamMember = async (
  req,
  res
) => {
  try {
    const {
      userId,
      roleOnEntity
    } = req.body;

    const member =
      await campaignService.addCampaignTeamMember({
        user: req.user,
        campaignId: req.params.id,
        userId,
        roleOnEntity
      });

    return res.json({
      success: true,
      member
    });
  } catch (error) {
    console.error(
      '[addCampaignTeamMember controller]',
      error.message
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      error:
        error.message ||
        'Could not add team member.'
    });
  }
};

const removeCampaignTeamMember = async (
  req,
  res
) => {
  try {
    await campaignService.removeCampaignTeamMember({
      user: req.user,
      campaignId: req.params.id,
      userId: req.params.userId
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error(
      '[removeCampaignTeamMember controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not remove team member.'
    });
  }
};

module.exports = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignTeam,
  addCampaignTeamMember,
  removeCampaignTeamMember
};