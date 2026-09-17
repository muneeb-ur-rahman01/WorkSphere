const volunteerService = require('../services/volunteerService');

const getVolunteers = async (req, res) => {
  try {
    const volunteers = await volunteerService.getVolunteers({
      user: req.user,
      ...req.volunteerFilters
    });

    return res.json({
      success: true,
      volunteers
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch volunteers.'
    });
  }
};

const upsertVolunteerProfile = async (req, res) => {
  try {
    const profile = await volunteerService.upsertVolunteerProfile({
      user: req.user,
      userId: req.params.userId,
      ...req.volunteerProfileData
    });

    return res.json({
      success: true,
      profile
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update volunteer profile.'
    });
  }
};

module.exports = {
  getVolunteers,
  upsertVolunteerProfile
};