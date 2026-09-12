const supabase = require('../config/supabase');

// ============================================================
// Platform-wide Audit Logging
//
// Canonical action keys. Add new ones here as new flows are wired up so
// the Audit Logs screens (Super Admin + Org Admin) stay meaningful and
// consistent. Keep the dot-namespaced "entity.verb" convention.
// ============================================================
const AUDIT_ACTIONS = {
  ORG_STATUS_CHANGED: 'organization.status_changed',
  ORG_APPROVED: 'organization.approved',
  ORG_REJECTED: 'organization.rejected',
  ORG_SUSPENDED: 'organization.suspended',
  ORG_DELETED: 'organization.deleted',
  USER_STATUS_CHANGED: 'user.status_changed',
  USER_APPROVED: 'user.approved',
  USER_REJECTED: 'user.rejected',
  USER_SUSPENDED: 'user.suspended',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_DELETED: 'user.deleted',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',
  SETTINGS_UPDATED: 'platform_setting.updated',
  PROJECT_CREATED: 'project.created',
  PROJECT_DELETED: 'project.deleted',
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_DELETED: 'campaign.deleted',
  DONOR_CREATED: 'donor.created',
  DONATION_RECORDED: 'donation.recorded',
  SPONSOR_CREATED: 'sponsor.created',
  SPONSORSHIP_RECORDED: 'sponsorship.recorded',
  PARTNER_REQUESTED: 'partner.requested',
  PARTNER_APPROVED: 'partner.approved',
  PARTNER_REJECTED: 'partner.rejected',
  BENEFICIARY_CREATED: 'beneficiary.created',
  EXPENSE_SUBMITTED: 'expense.submitted',
  EXPENSE_APPROVED: 'expense.approved',
  EXPENSE_REJECTED: 'expense.rejected',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_APPROVED: 'document.approved',
  DOCUMENT_REJECTED: 'document.rejected',
  ANNOUNCEMENT_POSTED: 'announcement.posted',
  CONNECTION_REQUESTED: 'connection.requested',
  CONNECTION_ACCEPTED: 'connection.accepted',
  CONNECTION_DECLINED: 'connection.declined',
  CONNECTION_WITHDRAWN: 'connection.withdrawn',
  SUBSCRIPTION_CANCELLATION_REQUESTED: 'subscription.cancellation_requested',
  SUBSCRIPTION_CANCELLATION_WITHDRAWN: 'subscription.cancellation_withdrawn'
};

// Writes one immutable row to audit_logs. Mirrors utils/billingAudit.js:
// never throws, so a logging failure can never block the action that
// triggered it — it's just reported to the server console for follow-up.
//
// actor: { id, role, orgId, fullName } — pass req.user plus a resolved
// display name where you have one handy; fullName is optional.
const logAudit = async ({
  actor,
  orgId = null,
  action,
  entityType,
  entityId = null,
  entityLabel = null,
  previousValue = null,
  newValue = null,
  metadata = {}
}) => {
  try {
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      actor_id: actor?.id || null,
      actor_name: actor?.fullName || null,
      actor_role: actor?.role || null,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      previous_value: previousValue,
      new_value: newValue,
      metadata
    });
  } catch (err) {
    console.error('[auditLog] Failed to log action:', action, err.message);
  }
};

module.exports = { AUDIT_ACTIONS, logAudit };
