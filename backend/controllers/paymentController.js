const supabase = require('../config/supabase');
const { getActiveGateway } = require('../utils/paymentGateways');
const { listPlans, getPlan } = require('../config/plans');
const { logBillingEvent, BILLING_EVENTS } = require('../utils/billingAudit');
const { serializePayment } = require('../utils/serializers');

const genTxnRefNo = () => `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

const addBillingCycle = (date, plan) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + (plan.billingCycleMonths || 1));
  return d;
};

// POST /api/payments/initiate  (protected)
// body: { orgId, plan }  -> plan key, e.g. 'Basic' | 'Standard' | 'Premium'
// Idempotent: if this org already has a still-open Pending payment for the
// same plan, that payment is reused instead of creating a new row — so
// retrying a flaky checkout doesn't pile up duplicate "Pending" records.
const initiatePayment = async (req, res) => {
  const { orgId, plan } = req.body;
  const planConfig = getPlan(plan);

  if (!orgId || !planConfig) {
    return res.status(400).json({ success: false, error: 'A valid organization and subscription plan are required.' });
  }

  if (req.user.role !== 'SuperAdmin' && req.user.orgId !== orgId) {
    return res.status(403).json({ success: false, error: 'You are not authorized to pay for this organization.' });
  }

  const { data: org, error: orgErr } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
  if (orgErr || !org) return res.status(404).json({ success: false, error: 'Organization not found.' });

  const gateway = getActiveGateway();
  if (!gateway.isConfigured()) {
    return res.status(503).json({
      success: false,
      error: `${gateway.name} is not configured yet. Add its credentials to backend/.env.`
    });
  }

  // Reuse a recent still-open payment for the same org+plan instead of
  // minting a new txn_ref_no every time the admin clicks "Pay Now".
  const { data: existingPending } = await supabase
    .from('payments')
    .select('*')
    .eq('org_id', orgId)
    .eq('plan', planConfig.key)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let payment = existingPending;
  if (!payment) {
    const txnRefNo = genTxnRefNo();
    const { data: created, error: payErr } = await supabase
      .from('payments')
      .insert({
        org_id: orgId,
        plan: planConfig.key,
        amount: planConfig.price,
        currency: planConfig.currency,
        method: gateway.name,
        gateway: gateway.name,
        status: 'Pending',
        txn_ref_no: txnRefNo,
        org_snapshot_plan: planConfig.key,
        initiated_by: req.user.id
      })
      .select()
      .single();

    if (payErr) return res.status(500).json({ success: false, error: 'Could not create payment record.' });
    payment = created;

    await logBillingEvent({
      orgId,
      userId: req.user.id,
      eventType: BILLING_EVENTS.PAYMENT_REQUEST_CREATED,
      amount: planConfig.price,
      currency: planConfig.currency,
      txnRefNo,
      gateway: gateway.name,
      metadata: { plan: planConfig.key }
    });
  }

  const returnUrl = process.env.PAYMENT_RETURN_URL || `${process.env.API_URL || 'http://localhost:5000'}/api/payments/callback`;

  let checkout;
  try {
    checkout = await gateway.initiateCheckout({
      amount: payment.amount,
      txnRefNo: payment.txn_ref_no,
      description: `CampOS ${planConfig.label} - ${org.name}`,
      billReference: orgId,
      returnUrl
    });
  } catch (err) {
    console.error(`[paymentController] ${gateway.name} initiateCheckout failed:`, err.message);
    return res.status(502).json({ success: false, error: 'Could not start the payment gateway checkout. Please try again.' });
  }

  await logBillingEvent({
    orgId,
    userId: req.user.id,
    eventType: BILLING_EVENTS.PAYMENT_INITIATED,
    amount: payment.amount,
    currency: payment.currency,
    txnRefNo: payment.txn_ref_no,
    gateway: gateway.name
  });

  return res.json({
    success: true,
    gateway: gateway.name,
    postUrl: checkout.postUrl,
    fields: checkout.fields,
    payment: {
      id: payment.id,
      txnRefNo: payment.txn_ref_no,
      amount: payment.amount,
      plan: planConfig.key,
      billingCycle: planConfig.billingCycle
    }
  });
};

// POST/GET /api/payments/callback (public — called by the gateway's servers / browser redirect)
// Idempotent: if the payment referenced by this callback is already in a
// terminal state (Completed/Failed/Refunded), the callback is acknowledged
// without re-applying side effects (no duplicate subscription extensions,
// no duplicate billing events) — this is what makes duplicate/retried
// callbacks from the gateway safe.
const handleCallback = async (req, res) => {
  const payload = { ...req.query, ...req.body };
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const gateway = getActiveGateway();

  let parsed;
  try {
    parsed = gateway.parseCallback(payload);
  } catch (err) {
    console.error('[paymentController] callback parse failed:', err.message);
    return res.redirect(`${clientUrl}/payment/result?status=failed&reason=invalid_callback`);
  }

  if (!parsed.txnRefNo) {
    return res.redirect(`${clientUrl}/payment/result?status=failed&reason=missing_reference`);
  }

  const { data: payment } = await supabase.from('payments').select('*').eq('txn_ref_no', parsed.txnRefNo).maybeSingle();
  if (!payment) {
    return res.redirect(`${clientUrl}/payment/result?status=failed&reason=not_found`);
  }

  // --- Idempotency guard: already-terminal payments are not reprocessed ---
  if (['Completed', 'Refunded', 'Failed'].includes(payment.status)) {
    const plan = getPlan(payment.plan);
    return res.redirect(
      `${clientUrl}/payment/result?status=${payment.status === 'Completed' ? 'success' : 'failed'}&orgId=${payment.org_id}&plan=${encodeURIComponent(plan?.label || payment.plan)}`
    );
  }

  const newStatus = parsed.success ? 'Completed' : 'Failed';

  await supabase
    .from('payments')
    .update({
      status: newStatus,
      provider_txn_id: parsed.providerTxnId,
      response_code: parsed.responseCode,
      response_message: parsed.responseMessage,
      provider_metadata: parsed.rawProviderMetadata || {},
      jazzcash_txn_id: gateway.name === 'JazzCash' ? parsed.providerTxnId : payment.jazzcash_txn_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  if (parsed.success) {
    const planConfig = getPlan(payment.plan);
    const start = new Date();
    const end = planConfig ? addBillingCycle(start, planConfig) : null;

    const { data: org } = await supabase.from('organizations').select('subscription_status').eq('id', payment.org_id).maybeSingle();
    const previousStatus = org?.subscription_status || 'TrialPending';

    await supabase
      .from('organizations')
      .update({
        sub_plan: planConfig?.key || payment.plan,
        billing_cycle: planConfig?.billingCycle || 'Monthly',
        plan_price: planConfig?.price ?? payment.amount,
        payment_status: 'Paid',
        subscription_status: 'Active',
        subscription_start: start.toISOString(),
        subscription_end: end ? end.toISOString() : null,
        payment_due_at: end ? end.toISOString() : null,
        amount_due: 0,
        last_expiry_notified_at: null
      })
      .eq('id', payment.org_id);

    await logBillingEvent({
      orgId: payment.org_id,
      eventType: BILLING_EVENTS.PAYMENT_SUCCESSFUL,
      amount: payment.amount,
      currency: payment.currency,
      txnRefNo: payment.txn_ref_no,
      gateway: gateway.name,
      previousStatus,
      newStatus: 'Active',
      metadata: { plan: payment.plan, providerTxnId: parsed.providerTxnId }
    });
    await logBillingEvent({
      orgId: payment.org_id,
      eventType: BILLING_EVENTS.ORG_PAYMENT_COMPLETED,
      previousStatus,
      newStatus: 'Active',
      gateway: gateway.name
    });
    if (previousStatus !== 'Active') {
      await logBillingEvent({
        orgId: payment.org_id,
        eventType: BILLING_EVENTS.ORG_OPERATIONS_RESUMED,
        previousStatus,
        newStatus: 'Active',
        gateway: gateway.name
      });
    }

    return res.redirect(`${clientUrl}/payment/result?status=success&orgId=${payment.org_id}&plan=${encodeURIComponent(planConfig?.label || payment.plan)}`);
  }

  await logBillingEvent({
    orgId: payment.org_id,
    eventType: BILLING_EVENTS.PAYMENT_FAILED,
    amount: payment.amount,
    currency: payment.currency,
    txnRefNo: payment.txn_ref_no,
    gateway: gateway.name,
    metadata: { responseCode: parsed.responseCode, responseMessage: parsed.responseMessage }
  });

  return res.redirect(`${clientUrl}/payment/result?status=failed&reason=${encodeURIComponent(parsed.responseMessage || 'declined')}`);
};

// GET /api/payments (protected) — org admin sees own org's payments, SuperAdmin sees all
const getPayments = async (req, res) => {
  let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (req.user.role !== 'SuperAdmin') {
    query = query.eq('org_id', req.user.orgId);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, error: 'Could not fetch payments.' });

  return res.json({ success: true, payments: data.map(serializePayment) });
};

// GET /api/payments/plans (public) — plan catalogue for pricing pages
const getPlans = (req, res) => {
  return res.json({ success: true, plans: listPlans() });
};

// POST /api/payments/:id/refund (SuperAdmin only) — records a refund for
// audit purposes. Actually returning the funds still happens on the
// gateway's own dashboard/API per that provider's refund process.
const markRefunded = async (req, res) => {
  const { id } = req.params;
  const { reference } = req.body;

  const { data: payment, error: findErr } = await supabase.from('payments').select('*').eq('id', id).maybeSingle();
  if (findErr || !payment) return res.status(404).json({ success: false, error: 'Payment not found.' });
  if (payment.status !== 'Completed') {
    return res.status(400).json({ success: false, error: 'Only completed payments can be refunded.' });
  }

  await supabase
    .from('payments')
    .update({ status: 'Refunded', refunded_at: new Date().toISOString(), refund_reference: reference || null, updated_at: new Date().toISOString() })
    .eq('id', id);

  await logBillingEvent({
    orgId: payment.org_id,
    userId: req.user.id,
    eventType: BILLING_EVENTS.PAYMENT_REFUNDED,
    amount: payment.amount,
    currency: payment.currency,
    txnRefNo: payment.txn_ref_no,
    gateway: payment.gateway,
    metadata: { reference: reference || null }
  });

  return res.json({ success: true });
};

module.exports = { initiatePayment, handleCallback, getPayments, getPlans, markRefunded };
