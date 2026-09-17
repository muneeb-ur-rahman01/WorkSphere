const supabase = require('../config/supabase');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

// ============================================================
// Accessibility / Section Permissions
// ============================================================

const ASSIGNABLE_SECTIONS = [
  {
    key: 'registration_requests',
    label: 'Registration Requests',
    description:
      'Review and approve/reject incoming staff registration requests.'
  },
  {
    key: 'camps',
    label: 'Camps',
    description:
      'Create, edit, and manage medical camps and staff availability.'
  },
  {
    key: 'events',
    label: 'Events',
    description:
      'Create, edit, and manage organization events.'
  },
  {
    key: 'meetings',
    label: 'Meetings',
    description:
      'Create, edit, and manage organization meetings.'
  },
  {
    key: 'projects',
    label: 'Projects',
    description:
      'Create, edit, and manage organization projects and project teams.'
  },
  {
    key: 'campaigns',
    label: 'Campaigns',
    description:
      'Create, edit, and manage organization campaigns and campaign teams.'
  },
  {
    key: 'donors',
    label: 'Donors',
    description:
      'Manage donor records and log donations.'
  },
  {
    key: 'volunteers',
    label: 'Volunteers',
    description:
      'Manage volunteer profiles, skills and logged hours.'
  },
  {
    key: 'sponsors',
    label: 'Sponsors',
    description:
      'Manage sponsor records and sponsorship agreements.'
  },
  {
    key: 'partners',
    label: 'Partners',
    description:
      'Propose and manage partner organizations (approval stays with the Org Admin).'
  },
  {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    description:
      'Register beneficiaries and manage program enrollment.'
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description:
      'Submit project/campaign expenses (approval stays with the Org Admin).'
  },
  {
    key: 'documents',
    label: 'Documents',
    description:
      'Upload and manage organization documents.'
  }
];

const isAssignableSection = (key) =>
  ASSIGNABLE_SECTIONS.some(
    (section) => section.key === key
  );

const getAssignableSections = async () => {
  return ASSIGNABLE_SECTIONS;
};

const getMyPermissions = async ({ user }) => {
  if (!user.orgId) {
    return [];
  }

  const {
    data,
    error
  } = await supabase
    .from('staff_permissions')
    .select('section_key')
    .eq('user_id', user.id);

  if (error) {
    const err = new Error(
      'Could not fetch permissions.'
    );
    err.statusCode = 500;
    throw err;
  }

  return data.map((row) => row.section_key);
};

const getUserPermissions = async ({
  user,
  userId
}) => {
  if (!userId) {
    const err = new Error(
      'userId is required.'
    );
    err.statusCode = 400;
    throw err;
  }

  const {
    data: target
  } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle();

  if (
    !target ||
    target.org_id !== user.orgId
  ) {
    const err = new Error(
      'Not authorized for this user.'
    );
    err.statusCode = 403;
    throw err;
  }

  const {
    data,
    error
  } = await supabase
    .from('staff_permissions')
    .select('section_key')
    .eq('user_id', userId);

  if (error) {
    const err = new Error(
      'Could not fetch permissions.'
    );
    err.statusCode = 500;
    throw err;
  }

  return data.map((row) => row.section_key);
};

const grantPermission = async ({
  user,
  userId,
  sectionKey
}) => {
  if (!userId || !sectionKey) {
    const err = new Error(
      'userId and sectionKey are required.'
    );
    err.statusCode = 400;
    throw err;
  }

  if (!isAssignableSection(sectionKey)) {
    const err = new Error(
      'Invalid section.'
    );
    err.statusCode = 400;
    throw err;
  }

  const {
    data: target
  } = await supabase
    .from('users')
    .select('org_id, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (
    !target ||
    target.org_id !== user.orgId
  ) {
    const err = new Error(
      'Not authorized for this user.'
    );
    err.statusCode = 403;
    throw err;
  }

  const { error } = await supabase
    .from('staff_permissions')
    .upsert(
      {
        org_id: user.orgId,
        user_id: userId,
        section_key: sectionKey,
        granted_by: user.id
      },
      {
        onConflict: 'user_id,section_key'
      }
    );

  if (error) {
    const err = new Error(
      'Could not grant access.'
    );
    err.statusCode = 500;
    throw err;
  }

  const sectionLabel =
    ASSIGNABLE_SECTIONS.find(
      (section) => section.key === sectionKey
    )?.label || sectionKey;

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.PERMISSION_GRANTED,
    entityType: 'permission',
    entityId: userId,
    entityLabel:
      `${target.full_name} — ${sectionLabel}`,
    newValue: {
      sectionKey
    }
  });

  await supabase
    .from('notifications')
    .insert({
      org_id: user.orgId,
      target_user_id: userId,
      title: 'New Dashboard Access Granted',
      message:
        `You've been given access to "${sectionLabel}" by your organization admin.`,
      type: 'Accessibility',
      target_role: 'All'
    });

  return true;
};

const revokePermission = async ({
  user,
  userId,
  sectionKey
}) => {
  if (!userId || !sectionKey) {
    const err = new Error(
      'userId and sectionKey are required.'
    );
    err.statusCode = 400;
    throw err;
  }

  const {
    data: target
  } = await supabase
    .from('users')
    .select('org_id, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (
    !target ||
    target.org_id !== user.orgId
  ) {
    const err = new Error(
      'Not authorized for this user.'
    );
    err.statusCode = 403;
    throw err;
  }

  const { error } = await supabase
    .from('staff_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('section_key', sectionKey);

  if (error) {
    const err = new Error(
      'Could not revoke access.'
    );
    err.statusCode = 500;
    throw err;
  }

  const sectionLabel =
    ASSIGNABLE_SECTIONS.find(
      (section) => section.key === sectionKey
    )?.label || sectionKey;

  await logAudit({
    actor: user,
    orgId: user.orgId,
    action: AUDIT_ACTIONS.PERMISSION_REVOKED,
    entityType: 'permission',
    entityId: userId,
    entityLabel:
      `${target.full_name} — ${sectionLabel}`,
    previousValue: {
      sectionKey
    }
  });

  return true;
};

module.exports = {
  ASSIGNABLE_SECTIONS,
  isAssignableSection,
  getAssignableSections,
  getMyPermissions,
  getUserPermissions,
  grantPermission,
  revokePermission
};