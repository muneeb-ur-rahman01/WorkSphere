const supabase = require('../config/supabase');
const { serializeUser, serializeVolunteerProfile } = require('../utils/serializers');

// GET /api/volunteers — everyone with role='Volunteer' in the org, merged
// with their volunteer_profiles row (skills/availability/hours). Registration,
// approval and status are handled by the existing Users & Access Management
// flows (users.role = 'Volunteer') — this endpoint only adds the CRM layer
// on top, rather than duplicating a parallel volunteer-registration system.
const getVolunteers = async (req, res) => {
  const orgId = req.user.role === 'SuperAdmin' ? req.query.orgId : req.user.orgId;

  let userQuery = supabase.from('users').select('*').eq('role', 'Volunteer').order('created_at', { ascending: false });
  if (orgId) userQuery = userQuery.eq('org_id', orgId);

  const { data: volunteerUsers, error: userErr } = await userQuery;
  if (userErr) return res.status(500).json({ success: false, error: 'Could not fetch volunteers.' });
  if (volunteerUsers.length === 0) return res.json({ success: true, volunteers: [] });

  const { data: profiles, error: profileErr } = await supabase
    .from('volunteer_profiles')
    .select('*')
    .in('user_id', volunteerUsers.map((u) => u.id));
  if (profileErr) return res.status(500).json({ success: false, error: 'Could not fetch volunteer profiles.' });

  const profileByUser = Object.fromEntries((profiles || []).map((p) => [p.user_id, serializeVolunteerProfile(p)]));

  return res.json({
    success: true,
    volunteers: volunteerUsers.map((u) => ({
      ...serializeUser(u),
      profile: profileByUser[u.id] || null
    }))
  });
};

// PUT /api/volunteers/:userId/profile (OrgAdmin)  body: { skills, interests, availability, totalHours, performanceNotes }
const upsertVolunteerProfile = async (req, res) => {
  const { userId } = req.params;
  const { skills, interests, availability, totalHours, performanceNotes } = req.body;

  const { data: target } = await supabase.from('users').select('org_id, role').eq('id', userId).maybeSingle();
  if (!target || target.role !== 'Volunteer') return res.status(404).json({ success: false, error: 'Volunteer not found.' });
  if (target.org_id !== req.user.orgId) return res.status(403).json({ success: false, error: 'Not authorized for this volunteer.' });

  const { data, error } = await supabase
    .from('volunteer_profiles')
    .upsert(
      {
        user_id: userId,
        org_id: req.user.orgId,
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

  if (error) return res.status(500).json({ success: false, error: 'Could not update volunteer profile.' });
  return res.json({ success: true, profile: serializeVolunteerProfile(data) });
};

module.exports = { getVolunteers, upsertVolunteerProfile };
