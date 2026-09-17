const {
  getPublicEventsAndCamps: getPublicEventsAndCampsService
} = require('../services/publicService');

const getPublicEventsAndCamps = async (req, res) => {
  try {
    const items = await getPublicEventsAndCampsService();

    return res.json({
      success: true,
      items
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not load public events.'
    });
  }
};

module.exports = {
  getPublicEventsAndCamps
};