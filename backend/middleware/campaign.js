const {
  STATUSES,
  TYPES
} = require('../services/campaignService');

const validateCreateCampaign = (
  req,
  res,
  next
) => {
  const {
    title,
    status,
    campaignType
  } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Title is required.'
    });
  }

  if (
    status &&
    !STATUSES.includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  if (
    campaignType &&
    !TYPES.includes(campaignType)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid campaign type.'
    });
  }

  next();
};

const validateUpdateCampaign = (
  req,
  res,
  next
) => {
  const {
    status,
    campaignType
  } = req.body;

  if (
    status &&
    !STATUSES.includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status.'
    });
  }

  if (
    campaignType &&
    !TYPES.includes(campaignType)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid campaign type.'
    });
  }

  next();
};

const validateAddCampaignTeamMember = (
  req,
  res,
  next
) => {
  const {
    userId
  } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId is required.'
    });
  }

  next();
};

module.exports = {
  validateCreateCampaign,
  validateUpdateCampaign,
  validateAddCampaignTeamMember
};