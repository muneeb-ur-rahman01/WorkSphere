const availabilityService = require(
  '../services/availabilityService'
);


const getAvailability = async (req, res) => {
  try {
    const availability =
      await availabilityService.getAvailability({
        user: req.user
      });

    return res.json({
      success: true,
      availability
    });
  } catch (error) {
    console.error(
      '[getAvailability controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not fetch availability.'
    });
  }
};
const updateAvailability = async (req, res) => {
  try {
    const {
      campId,
      status
    } = req.availabilityData;

    const availability =
      await availabilityService.updateAvailability({
        userId: req.user.id,
        campId,
        status
      });

    return res.json({
      success: true,
      availability
    });
  } catch (error) {
    console.error(
      '[updateAvailability controller]',
      error.message
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Could not update availability.'
    });
  }
};

module.exports = {
  getAvailability,
  updateAvailability
};