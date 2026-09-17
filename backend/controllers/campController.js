const campService = require('../services/campService');

const getCamps = async (req, res) => {
  try {
    const orgId =
      req.user.role === 'SuperAdmin'
        ? req.query.orgId
        : req.user.orgId;

    const camps = await campService.getCamps({
      user: req.user,
      orgId
    });

    return res.json({
      success: true,
      camps
    });
  } catch (error) {
    console.error('getCamps:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not fetch camps.'
    });
  }
};

const createCamp = async (req, res) => {
  try {
    const camp = await campService.createCamp({
      user: req.user,
      ...req.campData
    });

    return res.json({
      success: true,
      camp
    });
  } catch (error) {
    console.error('createCamp:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not create camp.'
    });
  }
};

const updateCamp = async (req, res) => {
  try {
    const camp = await campService.updateCamp({
      user: req.user,
      id: req.params.id,
      ...req.campData
    });

    return res.json({
      success: true,
      camp
    });
  } catch (error) {
    console.error('updateCamp:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not update camp.'
    });
  }
};

const deleteCamp = async (req, res) => {
  try {
    await campService.deleteCamp({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (error) {
    console.error('deleteCamp:', error);

    return res.status(500).json({
      success: false,
      error: 'Could not delete camp.'
    });
  }
};

module.exports = {
  getCamps,
  createCamp,
  updateCamp,
  deleteCamp
};