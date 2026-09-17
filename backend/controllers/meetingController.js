const meetingService = require('../services/meetingService');

const getMeetings = async (req, res) => {
  try {
    const meetings = await meetingService.getMeetings({
      user: req.user,
      orgId: req.meetingFilters.orgId
    });

    return res.json({
      success: true,
      meetings
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch meetings.'
    });
  }
};

const createMeeting = async (req, res) => {
  try {
    const meeting = await meetingService.createMeeting({
      user: req.user,
      ...req.meetingData
    });

    return res.json({
      success: true,
      meeting
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create meeting.'
    });
  }
};

const updateMeeting = async (req, res) => {
  try {
    const meeting = await meetingService.updateMeeting({
      user: req.user,
      id: req.params.id,
      ...req.meetingData
    });

    return res.json({
      success: true,
      meeting
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update meeting.'
    });
  }
};

const deleteMeeting = async (req, res) => {
  try {
    await meetingService.deleteMeeting({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete meeting.'
    });
  }
};

module.exports = {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting
};