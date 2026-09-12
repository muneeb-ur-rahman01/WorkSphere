const supabase = require('../config/supabase');
const { serializeOrg } = require('../utils/serializers');
const { computeSubscriptionView, TRIAL_PERIOD_DAYS } = require('../middleware/subscriptionAccess');
const { sendTrialStartedEmail } = require('../utils/mailer');
const { logBillingEvent, BILLING_EVENTS } = require('../utils/billingAudit');
const { logAudit, AUDIT_ACTIONS } = require('../utils/auditLog');

// GET /api/organizations/public (no auth - powers the public staff self-registration form)
// Returns only the minimal, non-sensitive fields (id + name) for organizations
// that are currently Active, so the "Select Organization" dropdown always
// reflects real active orgs, independent of whether the visitor is logged in.
const getPublicOrganizations = async (req, res) => {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('status', 'Active')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch organizations.' });
  return res.json({ success: true, organizations: data });
};

// GET /api/organizations/me (any authenticated org member - OrgAdmin/Employee/Intern/Volunteer)
// Includes a computed `subscription` block (due date, overdue days, whether
// the payment reminder should show) so the dashboard doesn't need a second
// round trip or its own copy of the overdue-days math.
const getMyOrganization = async (req, res) => {
  if (!req.user.orgId) return res.json({ success: true, organization: null });
  const { data, error } = await supabase.from('organizations').select('*').eq('id', req.user.orgId).maybeSingle();
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch organization.' });
  if (!data) return res.json({ success: true, organization: null });

  return res.json({
    success: true,
    organization: { ...serializeOrg(data), subscription: computeSubscriptionView(data) }
  });
};

// GET /api/organizations (SuperAdmin only)
// Includes a computed `subscription` block per org (trial status/days
// remaining, payment/lock status, etc.) so the Manage Organizations table
// can show trial + subscription info without extra round trips.
const getOrganizations = async (req, res) => {
  const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch organizations.' });
  return res.json({
    success: true,
    organizations: data.map((o) => ({ ...serializeOrg(o), subscription: computeSubscriptionView(o) }))
  });
};

// PATCH /api/organizations/:id/status  body: { status }
const updateOrgStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Active', 'Pending', 'Suspended'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status value.' });
  }

  const { data: org, error: fetchErr } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
  if (fetchErr || !org) return res.status(404).json({ success: false, error: 'Organization not found.' });

  const updates = { status };

  // First-ever approval (Pending/anything -> Active, no trial started yet)
  // kicks off the 7-day free trial. Re-activating an org that was merely
  // Suspended does NOT restart the trial — trial_start_date is only ever
  // set once.
  const isFirstApproval = status === 'Active' && !org.trial_start_date;
  let trialEndAt = null;
  if (isFirstApproval) {
    const now = new Date();
    trialEndAt = new Date(now.getTime() + TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    updates.trial_start_date = now.toISOString();
    updates.trial_end_date = trialEndAt.toISOString();
    // Reuse the existing payment_due_at field so the hourly overdue sweep
    // (subscriptionScheduler.suspendOverdueOrganizations) and
    // requireOperational() enforce trial expiry automatically.
    updates.payment_due_at = trialEndAt.toISOString();
    if (org.subscription_status !== 'Active') updates.subscription_status = 'TrialPending';
  }

  const { error } = await supabase.from('organizations').update(updates).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update organization status.' });

  // Mirror behaviour of the original app: activating/suspending an org cascades to its users
  if (status === 'Active') {
    await supabase.from('users').update({ status: 'Active' }).eq('org_id', id).eq('role', 'OrgAdmin');
  } else if (status === 'Suspended') {
    await supabase.from('users').update({ status: 'Suspended' }).eq('org_id', id);
  }

  const statusActionMap = {
    Active: AUDIT_ACTIONS.ORG_APPROVED,
    Suspended: AUDIT_ACTIONS.ORG_SUSPENDED,
    Pending: AUDIT_ACTIONS.ORG_STATUS_CHANGED
  };
  await logAudit({
    actor: req.user,
    orgId: id,
    action: statusActionMap[status] || AUDIT_ACTIONS.ORG_STATUS_CHANGED,
    entityType: 'organization',
    entityId: id,
    entityLabel: org.name,
    previousValue: { status: org.status },
    newValue: { status }
  });

  if (isFirstApproval) {
    await logBillingEvent({
      orgId: id,
      eventType: BILLING_EVENTS.TRIAL_STARTED,
      newStatus: 'TrialPending',
      metadata: { trialEndDate: trialEndAt.toISOString(), trialPeriodDays: TRIAL_PERIOD_DAYS }
    });

    const { data: admin } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('org_id', id)
      .eq('role', 'OrgAdmin')
      .maybeSingle();

    await supabase.from('notifications').insert({
      org_id: id,
      title: 'Free Trial Started',
      message: `Your 7-day free trial is now active and ends on ${trialEndAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
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
        console.error('[updateOrgStatus] Failed to send trial-started email:', mailErr.message);
      }
    }
  }

  return res.json({ success: true });
};

// DELETE /api/organizations/:id
const deleteOrganization = async (req, res) => {
  const { id } = req.params;
  const { data: org } = await supabase.from('organizations').select('name').eq('id', id).maybeSingle();

  const { error } = await supabase.from('organizations').delete().eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not delete organization.' });

  await logAudit({
    actor: req.user,
    orgId: null, // org no longer exists after this point
    action: AUDIT_ACTIONS.ORG_DELETED,
    entityType: 'organization',
    entityId: id,
    entityLabel: org?.name || null
  });

  return res.json({ success: true });
};

// PATCH /api/organizations/:id/public-events (SuperAdmin)  body: { enabled }
// Master switch for whether an organization's approved camps/events are
// eligible to show on the public Home Page at all — individual items still
// need their own visibility_status = 'Approved' on top of this.
const setPublicEventsEnabled = async (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body;

  const { error } = await supabase.from('organizations').update({ public_events_enabled: Boolean(enabled) }).eq('id', id);
  if (error) return res.status(500).json({ success: false, error: 'Could not update public visibility setting.' });
  return res.json({ success: true });
};

// PATCH /api/organizations/me/directory-profile (OrgAdmin — own org only)
// body: { missionStatement, focusArea, city, website, logoUrl, directoryVisible }
// Editing the small, public-safe subset of fields shown in the cross-org
// Directory (spec section 6/16). Everything else about the org (billing,
// subscription, users, etc.) is untouched by this endpoint.
const updateMyDirectoryProfile = async (req, res) => {
  if (!req.user.orgId) return res.status(400).json({ success: false, error: 'No organization on this account.' });
  const { missionStatement, focusArea, city, website, logoUrl, directoryVisible } = req.body;

  const updates = {};
  if (missionStatement !== undefined) updates.mission_statement = missionStatement;
  if (focusArea !== undefined) updates.focus_area = focusArea;
  if (city !== undefined) updates.city = city;
  if (website !== undefined) updates.website = website;
  if (logoUrl !== undefined) updates.logo_url = logoUrl;
  if (directoryVisible !== undefined) updates.directory_visible = Boolean(directoryVisible);

  const { data: org, error } = await supabase
    .from('organizations').update(updates).eq('id', req.user.orgId).select().single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update organization profile.' });

  return res.json({ success: true, organization: { ...serializeOrg(org), subscription: computeSubscriptionView(org) } });
};

// PATCH /api/organizations/me/cancellation (OrgAdmin — own org only)  body: { cancel: boolean }
// Records intent to cancel (or withdraws that intent) — see schema note on
// cancellation_requested_at: this does not itself revoke access.
const setMyCancellationRequest = async (req, res) => {
  if (!req.user.orgId) return res.status(400).json({ success: false, error: 'No organization on this account.' });
  const { cancel } = req.body;

  const { data: org, error } = await supabase
    .from('organizations')
    .update({ cancellation_requested_at: cancel ? new Date().toISOString() : null })
    .eq('id', req.user.orgId)
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: 'Could not update cancellation status.' });

  await logAudit({
    actor: req.user,
    orgId: req.user.orgId,
    action: cancel ? AUDIT_ACTIONS.SUBSCRIPTION_CANCELLATION_REQUESTED : AUDIT_ACTIONS.SUBSCRIPTION_CANCELLATION_WITHDRAWN,
    entityType: 'organization',
    entityId: req.user.orgId,
    entityLabel: org.name
  });

  return res.json({ success: true, organization: { ...serializeOrg(org), subscription: computeSubscriptionView(org) } });
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
