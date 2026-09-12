const supabase = require('../config/supabase');
const { serializeEvent } = require('../utils/serializers');


// GET /api/events
const getEvents = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('events').select('*').order('date', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch events.' });
  return res.json({ success: true, events: data.map(serializeEvent) });
};

// POST /api/events (OrgAdmin)  body: { title, location, date, time, description, eventType, imageUrl }
// Independent from Camps: broadcasts a general event announcement instead of
// an availability request, since Events don't use the roster workflow.
const createEvent = async (req, res) => {
  const { title, location, date, time, description, eventType, imageUrl } = req.body;
  if (!title || !location || !date) {
    return res.status(400).json({ success: false, error: 'Title, location and date are required.' });
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      org_id: req.user.orgId,
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

  if (error) return res.status(500).json({ success: false, error: 'Could not create event.' });

  await supabase.from('notifications').insert({
    org_id: req.user.orgId,
    title: `${title} - New Event Scheduled`,
    message: `A new event "${title}" has been scheduled at ${location} on ${date}.`,
    type: 'EventAlert',
    target_role: 'All'
  });

  return res.json({ success: true, event: serializeEvent(event) });
};

// PATCH /api/events/:id (OrgAdmin)  body: { title, location, date, time, description, eventType, status, imageUrl }
const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { title, location, date, time, description, eventType, status, imageUrl } = req.body;

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
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update event.' });
  return res.json({ success: true, event: serializeEvent(event) });
};

// DELETE /api/events/:id (OrgAdmin)
const deleteEvent = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('org_id', req.user.orgId);

  if (error) return res.status(500).json({ success: false, error: 'Could not delete event.' });
  return res.json({ success: true });
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
