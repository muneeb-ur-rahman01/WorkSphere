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

// Saves the complete set of sections for one staff member in a single
// operation (used by the Accessibility screen's Save button). Only the
// difference against what is stored is written, and the staff member gets
// ONE notification listing what was newly granted.
const setUserPermissions = async ({
  user,
  userId,
  sectionKeys
}) => {
  if (!userId || !Array.isArray(sectionKeys)) {
    const err = new Error(
      'userId and sectionKeys are required.'
    );
    err.statusCode = 400;
    throw err;
  }

  const desired = [...new Set(sectionKeys)];

  if (!desired.every(isAssignableSection)) {
    const err = new Error('Invalid section.');
    err.statusCode = 400;
    throw err;
  }

  const { data: target } = await supabase
    .from('users')
    .select('org_id, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (!target || target.org_id !== user.orgId) {
    const err = new Error('Not authorized for this user.');
    err.statusCode = 403;
    throw err;
  }

  const { data: currentRows, error: currentErr } =
    await supabase
      .from('staff_permissions')
      .select('section_key')
      .eq('user_id', userId);

  if (currentErr) {
    const err = new Error('Could not fetch permissions.');
    err.statusCode = 500;
    throw err;
  }

  const current = (currentRows || []).map(
    (row) => row.section_key
  );

  const toGrant = desired.filter((k) => !current.includes(k));
  const toRevoke = current.filter((k) => !desired.includes(k));

  const labelOf = (key) =>
    ASSIGNABLE_SECTIONS.find((s) => s.key === key)?.label ||
    key;

  if (toGrant.length > 0) {
    const { error } = await supabase
      .from('staff_permissions')
      .upsert(
        toGrant.map((key) => ({
          org_id: user.orgId,
          user_id: userId,
          section_key: key,
          granted_by: user.id
        })),
        { onConflict: 'user_id,section_key' }
      );

    if (error) {
      const err = new Error('Could not grant access.');
      err.statusCode = 500;
      throw err;
    }
  }

  if (toRevoke.length > 0) {
    const { error } = await supabase
      .from('staff_permissions')
      .delete()
      .eq('user_id', userId)
      .in('section_key', toRevoke);

    if (error) {
      const err = new Error('Could not revoke access.');
      err.statusCode = 500;
      throw err;
    }
  }

  for (const key of toGrant) {
    await logAudit({
      actor: user,
      orgId: user.orgId,
      action: AUDIT_ACTIONS.PERMISSION_GRANTED,
      entityType: 'permission',
      entityId: userId,
      entityLabel: `${target.full_name} — ${labelOf(key)}`,
      newValue: { sectionKey: key }
    });
  }

  for (const key of toRevoke) {
    await logAudit({
      actor: user,
      orgId: user.orgId,
      action: AUDIT_ACTIONS.PERMISSION_REVOKED,
      entityType: 'permission',
      entityId: userId,
      entityLabel: `${target.full_name} — ${labelOf(key)}`,
      previousValue: { sectionKey: key }
    });
  }

  if (toGrant.length > 0) {
    await supabase.from('notifications').insert({
      org_id: user.orgId,
      target_user_id: userId,
      title: 'New Dashboard Access Granted',
      message:
        `Your organization admin gave you access to: ${toGrant
          .map(labelOf)
          .join(', ')}. ` +
        'You can now find and manage these sections from your dashboard menu.',
      type: 'Accessibility',
      target_role: 'All'
    });
  }

  return {
    sections: desired,
    granted: toGrant,
    revoked: toRevoke
  };
};

module.exports = {
  setUserPermissions,
  ASSIGNABLE_SECTIONS,
  isAssignableSection,
  getAssignableSections,
  getMyPermissions,
  getUserPermissions,
  grantPermission,
  revokePermission
};