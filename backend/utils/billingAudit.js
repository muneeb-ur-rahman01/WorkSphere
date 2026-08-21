const supabase = require('../config/supabase');

// Canonical event types — keep this list in sync with anywhere events are
// logged, so the Super Admin billing history filter stays meaningful.
const BILLING_EVENTS = {
  ORG_REGISTERED: 'organization_registered',
  PLAN_SELECTED: 'plan_selected',
  PAYMENT_REQUEST_CREATED: 'payment_request_created',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESSFUL: 'payment_successful',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_CANCELLED: 'payment_cancelled',
  PAYMENT_REFUNDED: 'payment_refunded',
  PAYMENT_OVERDUE: 'payment_became_overdue',
  ORG_SUSPENDED: 'organization_suspended',
  ORG_PAYMENT_COMPLETED: 'organization_payment_completed',
  ORG_OPERATIONS_RESUMED: 'organization_operations_resumed'
};

// Writes one immutable row to billing_events. Never throws — a logging
// failure should never block the payment/subscription flow that triggered
// it; it just gets logged to the server console for follow-up.
const logBillingEvent = async ({
  orgId,
  userId = null,
  eventType,
  amount = null,
  currency = 'PKR',
  txnRefNo = null,
  previousStatus = null,
  newStatus = null,
  gateway = null,
  metadata = {}
}) => {
  try {
    await supabase.from('billing_events').insert({
      org_id: orgId,
      user_id: userId,
      event_type: eventType,
      amount,
      currency,
      txn_ref_no: txnRefNo,
      previous_status: previousStatus,
      new_status: newStatus,
      gateway,
      metadata
    });
  } catch (err) {
    console.error('[billingAudit] Failed to log billing event:', eventType, err.message);
  }
};

module.exports = { BILLING_EVENTS, logBillingEvent };
