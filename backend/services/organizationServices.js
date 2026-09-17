const supabase = require('../config/supabase');

const { serializeOrg } = require('../utils/serializers');

const {
  computeSubscriptionView,
  TRIAL_PERIOD_DAYS
} = require('../middleware/subscriptionAccess');

const { sendTrialStartedEmail } = require('../utils/mailer');

const {
  logBillingEvent,
  BILLING_EVENTS
} = require('../utils/billingAudit');

const {
  logAudit,
  AUDIT_ACTIONS
} = require('../utils/auditLog');

const createError = (message, statusCode = 500) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ============================================================
// Public
// ============================================================

const getPublicOrganizations = async () => {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('status', 'Active')
    .order('name', { ascending: true });

  if (error) {
    throw createError('Could not fetch organizations.');
  }

  return data;
};

// ============================================================
// Authenticated Organization Member
// ============================================================

const getMyOrganization = async ({ orgId }) => {
  if (!orgId) {
    return null;
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();

  if (error) {
    throw createError('Could not fetch organization.');
  }

  if (!data) {
    return null;
  }

  return {
    ...serializeOrg(data),
    subscription: computeSubscriptionView(data)
  };
};

// ============================================================
// SuperAdmin
// ============================================================

const getOrganizations = async () => {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw createError('Could not fetch organizations.');
  }

  return data.map((org) => ({
    ...serializeOrg(org),
    subscription: computeSubscriptionView(org)
  }));
};

const updateOrgStatus = async ({ id, status, actor }) => {
  const allowedStatuses = [
    'Active',
    'Pending',
    'Suspended'
  ];

  if (!allowedStatuses.includes(status)) {
    throw createError('Invalid status value.', 400);
  }

  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !org) {
    throw createError('Organization not found.', 404);
  }

  const updates = {
    status
  };

  // First-ever approval starts the 7-day free trial.
  const isFirstApproval =
    status === 'Active' &&
    !org.trial_start_date;

  let trialEndAt = null;

  if (isFirstApproval) {
    const now = new Date();

    trialEndAt = new Date(
      now.getTime() +
      TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    updates.trial_start_date = now.toISOString();
    updates.trial_end_date = trialEndAt.toISOString();

    // Reuse payment_due_at so the existing subscription
    // scheduler and requireOperational() continue enforcing
    // trial expiry.
    updates.payment_due_at = trialEndAt.toISOString();

    if (org.subscription_status !== 'Active') {
      updates.subscription_status = 'TrialPending';
    }
  }

  const { error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id);

  if (error) {
    throw createError(
      'Could not update organization status.'
    );
  }

  // Preserve original cascade behavior.
  if (status === 'Active') {
    await supabase
      .from('users')
      .update({ status: 'Active' })
      .eq('org_id', id)
      .eq('role', 'OrgAdmin');
  } else if (status === 'Suspended') {
    await supabase
      .from('users')
      .update({ status: 'Suspended' })
      .eq('org_id', id);
  }

  const statusActionMap = {
    Active: AUDIT_ACTIONS.ORG_APPROVED,
    Suspended: AUDIT_ACTIONS.ORG_SUSPENDED,
    Pending: AUDIT_ACTIONS.ORG_STATUS_CHANGED
  };

  await logAudit({
    actor,
    orgId: id,
    action:
      statusActionMap[status] ||
      AUDIT_ACTIONS.ORG_STATUS_CHANGED,
    entityType: 'organization',
    entityId: id,
    entityLabel: org.name,
    previousValue: {
      status: org.status
    },
    newValue: {
      status
    }
  });

  // ==========================================================
  // First approval / trial start
  // ==========================================================

  if (isFirstApproval) {
    await logBillingEvent({
      orgId: id,
      eventType: BILLING_EVENTS.TRIAL_STARTED,
      newStatus: 'TrialPending',
      metadata: {
        trialEndDate: trialEndAt.toISOString(),
        trialPeriodDays: TRIAL_PERIOD_DAYS
      }
    });

    const { data: admin } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('org_id', id)
      .eq('role', 'OrgAdmin')
      .maybeSingle();

    await supabase
      .from('notifications')
      .insert({
        org_id: id,
        title: 'Free Trial Started',
        message: `Your 7-day free trial is now active and ends on ${trialEndAt.toLocaleDateString(
          'en-GB',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        )}.`,
        type: 'Subscription',
        target_role: 'OrgAdmin'
      });

    if (admin?.email) {
      try {
        await sendTrialStartedEmail({
          to: admin.email,
          fullName: admin.full_name,
          orgName: org.name,
          trialEndDate: trialEndAt.toISOString()
        });
      } catch (mailErr) {
        console.error(
          '[updateOrgStatus] Failed to send trial-started email:',
          mailErr.message
        );
      }
    }
  }

  return true;
};

const deleteOrganization = async ({ id, actor }) => {
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) {
    throw createError(
      'Could not delete organization.'
    );
  }

  await logAudit({
    actor,
    orgId: null,
    action: AUDIT_ACTIONS.ORG_DELETED,
    entityType: 'organization',
    entityId: id,
    entityLabel: org?.name || null
  });

  return true;
};

const setPublicEventsEnabled = async ({ id, enabled }) => {
  const { error } = await supabase
    .from('organizations')
    .update({
      public_events_enabled: Boolean(enabled)
    })
    .eq('id', id);

  if (error) {
    throw createError(
      'Could not update public visibility setting.'
    );
  }

  return true;
};

// ============================================================
// OrgAdmin — Own Organization
// ============================================================

const updateMyDirectoryProfile = async ({
  orgId,
  profileData
}) => {
  if (!orgId) {
    throw createError(
      'No organization on this account.',
      400
    );
  }

  const {
    missionStatement,
    focusArea,
    city,
    website,
    logoUrl,
    directoryVisible
  } = profileData;

  const updates = {};

  if (missionStatement !== undefined) {
    updates.mission_statement = missionStatement;
  }

  if (focusArea !== undefined) {
    updates.focus_area = focusArea;
  }

  if (city !== undefined) {
    updates.city = city;
  }

  if (website !== undefined) {
    updates.website = website;
  }

  if (logoUrl !== undefined) {
    updates.logo_url = logoUrl;
  }

  if (directoryVisible !== undefined) {
    updates.directory_visible = Boolean(directoryVisible);
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    throw createError(
      'Could not update organization profile.'
    );
  }

  return {
    ...serializeOrg(org),
    subscription: computeSubscriptionView(org)
  };
};

const setMyCancellationRequest = async ({
  orgId,
  cancel,
  actor
}) => {
  if (!orgId) {
    throw createError(
      'No organization on this account.',
      400
    );
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .update({
      cancellation_requested_at: cancel
        ? new Date().toISOString()
        : null
    })
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    throw createError(
      'Could not update cancellation status.'
    );
  }

  await logAudit({
    actor,
    orgId,
    action: cancel
      ? AUDIT_ACTIONS.SUBSCRIPTION_CANCELLATION_REQUESTED
      : AUDIT_ACTIONS.SUBSCRIPTION_CANCELLATION_WITHDRAWN,
    entityType: 'organization',
    entityId: orgId,
    entityLabel: org.name
  });

  return {
    ...serializeOrg(org),
    subscription: computeSubscriptionView(org)
  };
};

module.exports = {
  getPublicOrganizations,
  getMyOrganization,
  getOrganizations,
  updateOrgStatus,
  deleteOrganization,
  setPublicEventsEnabled,
  updateMyDirectoryProfile,
  setMyCancellationRequest
};