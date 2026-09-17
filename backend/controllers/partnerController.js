const partnerService = require('../services/partnerService');

const getPartners = async (req, res) => {
  try {
    const partners = await partnerService.getPartners({
      user: req.user,
      filters: req.partnerFilters
    });

    return res.json({
      success: true,
      partners
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch partners.'
    });
  }
};

const createPartner = async (req, res) => {
  try {
    const partner = await partnerService.createPartner({
      user: req.user,
      partnerData: req.partnerData
    });

    return res.json({
      success: true,
      partner
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not create partner request.'
    });
  }
};

const updatePartner = async (req, res) => {
  try {
    const partner = await partnerService.updatePartner({
      user: req.user,
      id: req.params.id,
      partnerData: req.partnerData
    });

    return res.json({
      success: true,
      partner
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update partner.'
    });
  }
};

const updatePartnerStatus = async (req, res) => {
  try {
    const partner = await partnerService.updatePartnerStatus({
      user: req.user,
      id: req.params.id,
      status: req.partnerStatus
    });

    return res.json({
      success: true,
      partner
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not update partner status.'
    });
  }
};

const deletePartner = async (req, res) => {
  try {
    await partnerService.deletePartner({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error:
        err.message ||
        'Could not delete partner.'
    });
  }
};

module.exports = {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerStatus,
  deletePartner
};