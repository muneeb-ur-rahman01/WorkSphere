const validateEventQuery = (req, res, next) => {
  const { orgId } = req.query;

  req.eventFilters = {
    orgId
  };

  next();
};

const validateCreateEvent = (req, res, next) => {
  const {
    title,
    location,
    date,
    time,
    description,
    eventType,
    imageUrl
  } = req.body;

  if (!title || !location || !date) {
    return res.status(400).json({
      success: false,
      error: 'Title, location and date are required.'
    });
  }

  req.eventData = {
    title,
    location,
    date,
    time,
    description,
    eventType,
    imageUrl
  };

  next();
};

const validateUpdateEvent = (req, res, next) => {
  const {
    title,
    location,
    date,
    time,
    description,
    eventType,
    status,
    imageUrl
  } = req.body;

  req.eventData = {
    title,
    location,
    date,
    time,
    description,
    eventType,
    status,
    imageUrl
  };

  next();
};

const validateEventId = (req, res, next) => {
  if (!req.params.id) {
    return res.status(400).json({
      success: false,
      error: 'Event id is required.'
    });
  }

  next();
};

module.exports = {
  validateEventQuery,
  validateCreateEvent,
  validateUpdateEvent,
  validateEventId
};