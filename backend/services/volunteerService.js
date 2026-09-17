const supabase = require('../config/supabase');

const {
  serializeUser,
  serializeVolunteerProfile
} = require('../utils/serializers');

const getVolunteers = async ({ user, orgId }) => {
  let userQuery = supabase
    .from('users')
    .select('*')
    .eq('role', 'Volunteer')
    .order('created_at', { ascending: false });

  if (orgId) {
    userQuery = userQuery.eq('org_id', orgId);
  }

  const { data: volunteerUsers, error: userErr } = await userQuery;

  if (userErr) {
    const err = new Error('Could not fetch volunteers.');
    err.statusCode = 500;
    throw err;
  }

  if (volunteerUsers.length === 0) {
    return [];
  }

  const { data: profiles, error: profileErr } = await supabase
    .from('volunteer_profiles')
    .select('*')
    .in(
      'user_id',
      volunteerUsers.map((u) => u.id)
    );

  if (profileErr) {
    const err = new Error('Could not fetch volunteer profiles.');
    err.statusCode = 500;
    throw err;
  }

  const profileByUser = Object.fromEntries(
    (profiles || []).map((p) => [
      p.user_id,
      serializeVolunteerProfile(p)
    ])
  );

  return volunteerUsers.map((u) => ({
    ...serializeUser(u),
    profile: profileByUser[u.id] || null
  }));
};

const upsertVolunteerProfile = async ({
  user,
  userId,
  skills,
  interests,
  availability,
  totalHours,
  performanceNotes
}) => {
  const { data: target } = await supabase
    .from('users')
    .select('org_id, role')
    .eq('id', userId)
    .maybeSingle();

  if (!target || target.role !== 'Volunteer') {
    const err = new Error('Volunteer not found.');
    err.statusCode = 404;
    throw err;
  }

  if (target.org_id !== user.orgId) {
    const err = new Error('Not authorized for this volunteer.');
    err.statusCode = 403;
    throw err;
  }

  const { data, error } = await supabase
    .from('volunteer_profiles')
    .upsert(
      {
        user_id: userId,
        org_id: user.orgId,
        skills,
        interests,
        availability,
        total_hours: totalHours ?? 0,
        performance_notes: performanceNotes,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    const err = new Error('Could not update volunteer profile.');
    err.statusCode = 500;
    throw err;
  }

  return serializeVolunteerProfile(data);
};

module.exports = {
  getVolunteers,
  upsertVolunteerProfile
};