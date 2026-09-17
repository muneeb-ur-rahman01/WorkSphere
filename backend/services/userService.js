const bcrypt = require('bcryptjs');

const supabase = require('../config/supabase');

const { serializeUser } = require('../utils/serializers');

const { addUserToOpenGroups } = require('./discussionService');

const {
  sendRegistrationAcceptedEmail,
  sendRegistrationRejectedEmail
} = require('../utils/mailer');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

// Roles an Organization Admin may assign when adding personnel directly.
const STAFF_ROLES = [
  'Employee',
  'Intern',
  'Volunteer',
  'Membership',
  'Executive Director'
];

const getUsers = async ({ user, orgId }) => {
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (user.role !== 'SuperAdmin') {
    query = query.eq('org_id', user.orgId);
  } else if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    const err = new Error('Could not fetch users.');
    err.statusCode = 500;
    throw err;
  }

  return data.map(serializeUser);
};

const createStaffByAdmin = async ({
  user,
  fullName,
  email,
  password,
  role
}) => {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    const err = new Error('Email already registered.');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data: createdUser, error } = await supabase
    .from('users')
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      role,
      org_id: user.orgId,
      status: 'Active'
    })
    .select()
    .single();

  if (error) {
    const err = new Error('Could not create staff member.');
    err.statusCode = 500;
    throw err;
  }

  await addUserToOpenGroups(user.orgId, createdUser.id);

  return serializeUser(createdUser);
};

const updateStaffStatus = async ({
  user,
  id,
  status
}) => {
  const { data: target, error: fetchErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !target) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  // Anyone other than SuperAdmin may only modify users
  // in their own organization.
  if (
    user.role !== 'SuperAdmin' &&
    target.org_id !== user.orgId
  ) {
    const err = new Error(
      'Not authorized to modify this user.'
    );
    err.statusCode = 403;
    throw err;
  }

  const wasPendingApproval =
    target.status === 'Pending' && status === 'Active';

  const wasPendingRejection =
    target.status === 'Pending' && status === 'Rejected';

  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', id);

  if (error) {
    const err = new Error('Could not update user status.');
    err.statusCode = 500;
    throw err;
  }

  const statusActionMap = {
    Active: AUDIT_ACTIONS.USER_APPROVED,
    Rejected: AUDIT_ACTIONS.USER_REJECTED,
    Suspended: AUDIT_ACTIONS.USER_SUSPENDED,
    Pending: AUDIT_ACTIONS.USER_STATUS_CHANGED
  };

  await logAudit({
    actor: user,
    orgId: target.org_id,
    action:
      statusActionMap[status] ||
      AUDIT_ACTIONS.USER_STATUS_CHANGED,
    entityType: 'user',
    entityId: id,
    entityLabel: target.full_name,
    previousValue: { status: target.status },
    newValue: { status }
  });

  if (status === 'Active' && target.org_id) {
    await addUserToOpenGroups(target.org_id, id);
  }

  let orgName;

  if (
    (wasPendingApproval || wasPendingRejection) &&
    target.org_id
  ) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', target.org_id)
      .maybeSingle();

    orgName = org?.name;
  }

  if (wasPendingApproval) {
    try {
      await sendRegistrationAcceptedEmail({
        to: target.email,
        fullName: target.full_name,
        orgName
      });
    } catch (mailErr) {
      console.error(
        '[updateStaffStatus] Failed to send acceptance email:',
        mailErr.message
      );
    }
  }

  if (wasPendingRejection) {
    try {
      await sendRegistrationRejectedEmail({
        to: target.email,
        fullName: target.full_name,
        orgName
      });
    } catch (mailErr) {
      console.error(
        '[updateStaffStatus] Failed to send rejection email:',
        mailErr.message
      );
    }
  }
};

const updateStaffRole = async ({
  user,
  id,
  role
}) => {
  const { data: target } = await supabase
    .from('users')
    .select('org_id, role, full_name')
    .eq('id', id)
    .maybeSingle();

  if (!target) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (
    user.role === 'OrgAdmin' &&
    target.org_id !== user.orgId
  ) {
    const err = new Error(
      'Not authorized to modify this user.'
    );
    err.statusCode = 403;
    throw err;
  }

  if (
    target.role === 'OrgAdmin' ||
    target.role === 'SuperAdmin'
  ) {
    const err = new Error(
      'Cannot change the role of an administrator account.'
    );
    err.statusCode = 400;
    throw err;
  }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id);

  if (error) {
    const err = new Error('Could not update role.');
    err.statusCode = 500;
    throw err;
  }

  // Role changed away from Intern:
  // assigned mentor no longer applies.
  if (role !== 'Intern') {
    await supabase
      .from('users')
      .update({ assigned_mentor: null })
      .eq('id', id);
  }

  await logAudit({
    actor: user,
    orgId: target.org_id,
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    entityType: 'user',
    entityId: id,
    entityLabel: target.full_name,
    previousValue: { role: target.role },
    newValue: { role }
  });
};

const deleteStaff = async ({
  user,
  id
}) => {
  const { data: target } = await supabase
    .from('users')
    .select('org_id, full_name')
    .eq('id', id)
    .maybeSingle();

  if (user.role === 'OrgAdmin') {
    if (
      !target ||
      target.org_id !== user.orgId
    ) {
      const err = new Error(
        'Not authorized to remove this user.'
      );
      err.statusCode = 403;
      throw err;
    }
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    const err = new Error(
      'Could not remove staff member.'
    );
    err.statusCode = 500;
    throw err;
  }

  await logAudit({
    actor: user,
    orgId: target?.org_id || null,
    action: AUDIT_ACTIONS.USER_DELETED,
    entityType: 'user',
    entityId: id,
    entityLabel: target?.full_name || null
  });
};

const assignMentor = async ({
  id,
  mentorName
}) => {
  const { error } = await supabase
    .from('users')
    .update({
      assigned_mentor: mentorName
    })
    .eq('id', id);

  if (error) {
    const err = new Error(
      'Could not assign mentor.'
    );
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  STAFF_ROLES,
  getUsers,
  createStaffByAdmin,
  updateStaffStatus,
  updateStaffRole,
  deleteStaff,
  assignMentor
};