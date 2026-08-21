const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { serializeUser } = require('../utils/serializers');
const { addUserToOpenGroups } = require('./discussionController');
const { sendRegistrationAcceptedEmail } = require('../utils/mailer');

// Roles an Organization Admin may assign when adding personnel directly.
// Keep in sync with frontend/src/Config/constant.js (STAFF_ROLES).
const STAFF_ROLES = ['Employee', 'Intern', 'Volunteer', 'Membership', 'Executive Director'];

// GET /api/users?orgId=...  (SuperAdmin gets everyone, others scoped to their org via middleware)
const getUsers = async (req, res) => {
  let query = supabase.from('users').select('*').order('created_at', { ascending: false });

  if (req.user.role !== 'SuperAdmin') {
    // Non-SuperAdmins may only ever see users from their own organization
    query = query.eq('org_id', req.user.orgId);
  } else if (req.query.orgId) {
    query = query.eq('org_id', req.query.orgId);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch users.' });
  return res.json({ success: true, users: data.map(serializeUser) });
};

// POST /api/users (OrgAdmin adds staff directly, sets their password, account is Active immediately)
// body: { fullName, email, password, role }
const createStaffByAdmin = async (req, res) => {
  const { fullName, email, password, role } = req.body;
  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ success: false, error: 'Please fill in all fields.' });
  }
  if (!STAFF_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
  }

  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle();
  if (existing) return res.status(409).json({ success: false, error: 'Email already registered.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role,
      org_id: req.user.orgId,
      status: 'Active' // admin-created accounts are active immediately
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, error: 'Could not create staff member.' });

  // Admin-added accounts are Active immediately, so auto-enroll into any
  // "open" discussion channels (e.g. Open Discussion) right away.
  await addUserToOpenGroups(req.user.orgId, user.id);

  return res.json({ success: true, user: serializeUser(user) });
};

// PATCH /api/users/:id/status  body: { status }
// Reachable by OrgAdmin/SuperAdmin, and also by a staff member who was
// granted the 'registration_requests' Accessibility permission (see
// routes/userRoutes.js) - so the scoping check below applies to anyone
// who isn't SuperAdmin, not just OrgAdmin.
const updateStaffStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Active', 'Pending', 'Suspended', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }

  const { data: target, error: fetchErr } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (fetchErr || !target) return res.status(404).json({ success: false, error: 'User not found.' });

  // Scope: anyone other than SuperAdmin may only modify users in their own org
  if (req.user.role !== 'SuperAdmin' && target.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized to modify this user.' });
  }

  const wasPendingApproval = target.status === 'Pending' && status === 'Active';

  const { error } = await supabase.from('users').update({ status }).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update user status.' });

  // Newly-approved accounts should land with at least one working channel,
  // same as admin-added staff.
  if (status === 'Active' && target.org_id) {
    await addUserToOpenGroups(target.org_id, id);
  }

  // A Pending -> Active transition means a registration request was just
  // approved: let the applicant know they can now log in.
  if (wasPendingApproval) {
    let orgName;
    if (target.org_id) {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', target.org_id).maybeSingle();
      orgName = org?.name;
    }
    try {
      await sendRegistrationAcceptedEmail({ to: target.email, fullName: target.full_name, orgName });
    } catch (mailErr) {
      console.error('[updateStaffStatus] Failed to send acceptance email:', mailErr.message);
    }
  }

  return res.json({ success: true });
};

// PATCH /api/users/:id/role  body: { role }  (OrgAdmin edits an existing staff member's role)
const updateStaffRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role || !STAFF_ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role.' });
  }

  const { data: target } = await supabase.from('users').select('org_id, role').eq('id', id).maybeSingle();
  if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
  if (req.user.role === 'OrgAdmin' && target.org_id !== req.user.orgId) {
    return res.status(403).json({ success: false, error: 'Not authorized to modify this user.' });
  }
  if (target.role === 'OrgAdmin' || target.role === 'SuperAdmin') {
    return res.status(400).json({ success: false, error: 'Cannot change the role of an administrator account.' });
  }

  const { error } = await supabase.from('users').update({ role }).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update role.' });

  // Role changed away from Intern: an assigned mentor no longer applies.
  if (role !== 'Intern') {
    await supabase.from('users').update({ assigned_mentor: null }).eq('id', id);
  }

  return res.json({ success: true });
};

// DELETE /api/users/:id
const deleteStaff = async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'OrgAdmin') {
    const { data: target } = await supabase.from('users').select('org_id').eq('id', id).single();
    if (!target || target.org_id !== req.user.orgId) {
      return res.status(403).json({ success: false, error: 'Not authorized to remove this user.' });
    }
  }

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not remove staff member.' });
  return res.json({ success: true });
};

// PATCH /api/users/:id/mentor  body: { mentorName }
const assignMentor = async (req, res) => {
  const { id } = req.params;
  const { mentorName } = req.body;
  if (!mentorName) return res.status(400).json({ success: false, error: 'Mentor name is required.' });

  const { error } = await supabase.from('users').update({ assigned_mentor: mentorName }).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not assign mentor.' });
  return res.json({ success: true });
};

module.exports = { getUsers, createStaffByAdmin, updateStaffStatus, updateStaffRole, deleteStaff, assignMentor };
