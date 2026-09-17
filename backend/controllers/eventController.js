const eventService = require('../services/eventService');

const getEvents = async (req, res) => {
  try {
    const events = await eventService.getEvents({
      user: req.user,
      orgId: req.eventFilters.orgId
    });

    return res.json({
      success: true,
      events
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not fetch events.'
    });
  }
};

const createEvent = async (req, res) => {
  try {
    const event = await eventService.createEvent({
      user: req.user,
      ...req.eventData
    });

    return res.json({
      success: true,
      event
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not create event.'
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const event = await eventService.updateEvent({
      user: req.user,
      id: req.params.id,
      ...req.eventData
    });

    return res.json({
      success: true,
      event
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not update event.'
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    await eventService.deleteEvent({
      user: req.user,
      id: req.params.id
    });

    return res.json({
      success: true
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Could not delete event.'
    });
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
};