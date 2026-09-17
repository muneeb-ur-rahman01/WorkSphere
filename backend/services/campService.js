const supabase = require('../config/supabase');
const { serializeCamp } = require('../utils/serializers');

const getCamps = async ({ user, orgId }) => {
  let query = supabase
    .from('camps')
    .select('*')
    .order('date', { ascending: false });

  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Could not fetch camps.');
  }

  return (data || []).map(serializeCamp);
};

const createCamp = async ({
  user,
  title,
  location,
  date,
  time,
  description,
  imageUrl
}) => {
  const { data: camp, error } = await supabase
    .from('camps')
    .insert({
      org_id: user.orgId,
      title,
      location,
      date,
      time,
      description,
      image_url: imageUrl,
      status: 'Upcoming'
    })
    .select()
    .single();

  if (error) {
    throw new Error('Could not create camp.');
  }

  // Broadcast notification to the organization's staff
  await supabase.from('notifications').insert({
    org_id: user.orgId,
    title: `${title} - Availability Requested`,
    message: `A new medical camp "${title}" is scheduled at ${location} on ${date}. Admin requested your availability status. Please update it immediately.`,
    type: 'CampAlert',
    target_role: 'All'
  });

  return serializeCamp(camp);
};

const updateCamp = async ({
  user,
  id,
  title,
  location,
  date,
  time,
  description,
  status,
  imageUrl
}) => {
  const updates = {};

  if (title !== undefined) updates.title = title;
  if (location !== undefined) updates.location = location;
  if (date !== undefined) updates.date = date;
  if (time !== undefined) updates.time = time;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (imageUrl !== undefined) updates.image_url = imageUrl;

  const { data: camp, error } = await supabase
    .from('camps')
    .update(updates)
    .eq('id', id)
    .eq('org_id', user.orgId)
    .select()
    .single();

  if (error) {
    throw new Error('Could not update camp.');
  }

  return serializeCamp(camp);
};

const deleteCamp = async ({ user, id }) => {
  const { error } = await supabase
    .from('camps')
    .delete()
    .eq('id', id)
    .eq('org_id', user.orgId);

  if (error) {
    throw new Error('Could not delete camp.');
  }

  return true;
};

module.exports = {
  getCamps,
  createCamp,
  updateCamp,
  deleteCamp
};