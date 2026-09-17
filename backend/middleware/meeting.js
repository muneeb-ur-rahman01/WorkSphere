const MEETING_TYPES = ['Online', 'Offline'];
const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

const validateMeetingQuery = (req, res, next) => {
  const { orgId } = req.query;

  req.meetingFilters = {
    orgId
  };

  next();
};

const validateCreateMeeting = (req, res, next) => {
  const {
    subject,
    meetingType,
    date,
    time,
    meetingLink
  } = req.body;

  if (!subject || !date || !time) {
    return res.status(400).json({
      success: false,
      error: 'Subject, date and time are required.'
    });
  }

  const type = MEETING_TYPES.includes(meetingType)
    ? meetingType
    : 'Online';

  if (type === 'Online' && !meetingLink) {
    return res.status(400).json({
      success: false,
      error: 'Meeting link is required for online meetings.'
    });
  }

  req.meetingData = {
    subject,
    meetingType,
    date,
    time,
    meetingLink
  };

  next();
};

const validateUpdateMeeting = (req, res, next) => {
  const {
    subject,
    meetingType,
    date,
    time,
    meetingLink,
    status,
    summary
  } = req.body;

  if (
    meetingType !== undefined &&
    !MEETING_TYPES.includes(meetingType)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid meeting type.'
    });
  }

  if (
    status !== undefined &&
    !MEETING_STATUSES.includes(status)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value.'
    });
  }

  req.meetingData = {
    subject,
    meetingType,
    date,
    time,
    meetingLink,
    status,
    summary
  };

  next();
};

const validateMeetingId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Meeting id is required.'
    });
  }

  next();
};

module.exports = {
  validateMeetingQuery,
  validateCreateMeeting,
  validateUpdateMeeting,
  validateMeetingId
};