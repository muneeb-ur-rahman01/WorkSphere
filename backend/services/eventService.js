const supabase = require('../config/supabase');

const { serializeEvent } = require('../utils/serializers');

const getEvents = async ({ user, orgId }) => {
  const targetOrgId = user.role === 'SuperAdmin' ? orgId : user.orgId;

  let query = supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });

  if (targetOrgId) {
    query = query.eq('org_id', targetOrgId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch events.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeEvent);
};

const createEvent = async ({
  user,
  title,
  location,
  date,
  time,
  description,
  eventType,
  imageUrl
}) => {
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      org_id: user.orgId,
      title,
      location,
      date,
      time,
      description,
      image_url: imageUrl,
      event_type: eventType || 'General',
      status: 'Upcoming'
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not create event.');
    err.statusCode = 500;
    throw err;
  }

  await supabase.from('notifications').insert({
    org_id: user.orgId,
    title: `${title} - New Event Scheduled`,
    message: `A new event "${title}" has been scheduled at ${location} on ${date}.`,
    type: 'EventAlert',
    target_role: 'All'
  });

  return serializeEvent(event);
};

const updateEvent = async ({
  user,
  id,
  title,
  location,
  date,
  time,
  description,
  eventType,
  status,
  imageUrl
}) => {
  const updates = {};

  if (title !== undefined) updates.title = title;
  if (location !== undefined) updates.location = location;
  if (date !== undefined) updates.date = date;
  if (time !== undefined) updates.time = time;
  if (description !== undefined) updates.description = description;
  if (eventType !== undefined) updates.event_type = eventType;
  if (status !== undefined) updates.status = status;
  if (imageUrl !== undefined) updates.image_url = imageUrl;

  const { data: event, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update event.');
    err.statusCode = 500;
    throw err;
  }

  return serializeEvent(event);
};

const deleteEvent = async ({ user, id }) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    const err = new Error('Could not delete event.');
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent
};