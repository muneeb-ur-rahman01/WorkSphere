const supabase = require('../config/supabase');
const { serializeCamp } = require('../utils/serializers');


// GET /api/camps
const getCamps = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;
  let query = supabase.from('camps').select('*').order('date', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch camps.' });
  return res.json({ success: true, camps: data.map(serializeCamp) });
};

// POST /api/camps (OrgAdmin)  body: { title, location, date, description }
// Also creates a broadcast notification to the org's staff, mirroring the original app.
const createCamp = async (req, res) => {
  const { title, location, date, description } = req.body;
  if (!title || !location || !date) {
    return res.status(400).json({ success: false, error: 'Title, location and date are required.' });
  }

  const { data: camp, error } = await supabase
    .from('camps')
    .insert({ org_id: req.user.orgId, title, location, date, description, status: 'Upcoming' })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create camp.' });

  await supabase.from('notifications').insert({
    org_id: req.user.orgId,
    title: `${title} - Availability Requested`,
    message: `A new medical camp "${title}" is scheduled at ${location} on ${date}. Admin requested your availability status. Please update it immediately.`,
    type: 'CampAlert',
    target_role: 'All'
  });

  return res.json({ success: true, camp: serializeCamp(camp) });
};

// PATCH /api/camps/:id (OrgAdmin)  body: { title, location, date, description, status }
const updateCamp = async (req, res) => {
  const { id } = req.params;
  const { title, location, date, description, status } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (location !== undefined) updates.location = location;
  if (date !== undefined) updates.date = date;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;

  const { data: camp, error } = await supabase
    .from('camps')
    .update(updates)
    .eq('id', id)
    .eq('org_id', req.user.orgId)
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not update camp.' });
  return res.json({ success: true, camp: serializeCamp(camp) });
};

// DELETE /api/camps/:id (OrgAdmin)
const deleteCamp = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('camps')
    .delete()
    .eq('id', id)
    .eq('org_id', req.user.orgId);

  if (error) return res.status(500).json({ success: false, error: 'Could not delete camp.' });
  return res.json({ success: true });
};

module.exports = { getCamps, createCamp, updateCamp, deleteCamp };
