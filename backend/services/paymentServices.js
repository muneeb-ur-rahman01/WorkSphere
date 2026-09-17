const supabase = require('../config/supabase');

const { getActiveGateway } = require('../utils/paymentGateways');
const { listPlans, getPlan } = require('../config/plans');
const {
  logBillingEvent,
  BILLING_EVENTS
} = require('../utils/billingAudit');
const { serializePayment } = require('../utils/serializers');

const genTxnRefNo = () =>
  `T${Date.now()}${Math.floor(Math.random() * 1000)}`;

const addBillingCycle = (date, plan) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + (plan.billingCycleMonths || 1));
  return d;
};

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const initiatePayment = async ({
  user,
  orgId,
  plan
}) => {
  const planConfig = getPlan(plan);

  if (!orgId || !planConfig) {
    throw createError(
      'A valid organization and subscription plan are required.',
      400
    );
  }

  if (
    user.role !== 'SuperAdmin' &&
    user.orgId !== orgId
  ) {
    throw createError(
      'You are not authorized to pay for this organization.',
      403
    );
  }

  const {
    data: org,
    error: orgErr
  } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .maybeSingle();

  if (orgErr || !org) {
    throw createError(
      'Organization not found.',
      404
    );
  }

  const gateway = getActiveGateway();

  if (!gateway.isConfigured()) {
    throw createError(
      `${gateway.name} is not configured yet. Add its credentials to backend/.env.`,
      503
    );
  }

  // Reuse latest pending payment for same org + plan.
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

    const {
      data: created,
      error: payErr
    } = await supabase
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
        initiated_by: user.id
      })
      .select()
      .single();

    if (payErr) {
      throw createError(
        'Could not create payment record.'
      );
    }

    payment = created;

    await logBillingEvent({
      orgId,
      userId: user.id,
      eventType: BILLING_EVENTS.PAYMENT_REQUEST_CREATED,
      amount: planConfig.price,
      currency: planConfig.currency,
      txnRefNo,
      gateway: gateway.name,
      metadata: {
        plan: planConfig.key
      }
    });
  }

  const returnUrl =
    process.env.PAYMENT_RETURN_URL ||
    `${process.env.API_URL || 'http://localhost:5000'}/api/payments/callback`;

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
    console.error(
      `[paymentService] ${gateway.name} initiateCheckout failed:`,
      err.message
    );

    throw createError(
      'Could not start the payment gateway checkout. Please try again.',
      502
    );
  }

  await logBillingEvent({
    orgId,
    userId: user.id,
    eventType: BILLING_EVENTS.PAYMENT_INITIATED,
    amount: payment.amount,
    currency: payment.currency,
    txnRefNo: payment.txn_ref_no,
    gateway: gateway.name
  });

  return {
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
  };
};

const handleCallback = async ({
  query,
  body
}) => {
  const payload = {
    ...query,
    ...body
  };

  const clientUrl =
    process.env.CLIENT_URL ||
    'http://localhost:5173';

  const gateway = getActiveGateway();

  let parsed;

  try {
    parsed = gateway.parseCallback(payload);
  } catch (err) {
    console.error(
      '[paymentService] callback parse failed:',
      err.message
    );

    return {
      redirectUrl:
        `${clientUrl}/payment/result?status=failed&reason=invalid_callback`
    };
  }

  if (!parsed.txnRefNo) {
    return {
      redirectUrl:
        `${clientUrl}/payment/result?status=failed&reason=missing_reference`
    };
  }

  const {
    data: payment
  } = await supabase
    .from('payments')
    .select('*')
    .eq('txn_ref_no', parsed.txnRefNo)
    .maybeSingle();

  if (!payment) {
    return {
      redirectUrl:
        `${clientUrl}/payment/result?status=failed&reason=not_found`
    };
  }

  // Idempotency guard.
  if (
    ['Completed', 'Refunded', 'Failed'].includes(
      payment.status
    )
  ) {
    const plan = getPlan(payment.plan);

    return {
      redirectUrl:
        `${clientUrl}/payment/result?status=${payment.status === 'Completed' ? 'success' : 'failed'}&orgId=${payment.org_id}&plan=${encodeURIComponent(plan?.label || payment.plan)}`
    };
  }

  const newStatus =
    parsed.success ? 'Completed' : 'Failed';

  await supabase
    .from('payments')
    .update({
      status: newStatus,
      provider_txn_id: parsed.providerTxnId,
      response_code: parsed.responseCode,
      response_message: parsed.responseMessage,
      provider_metadata:
        parsed.rawProviderMetadata || {},
      jazzcash_txn_id:
        gateway.name === 'JazzCash'
          ? parsed.providerTxnId
          : payment.jazzcash_txn_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', payment.id);

  if (parsed.success) {
    const planConfig = getPlan(payment.plan);

    const start = new Date();

    const end = planConfig
      ? addBillingCycle(start, planConfig)
      : null;

    const {
      data: org
    } = await supabase
      .from('organizations')
      .select('subscription_status')
      .eq('id', payment.org_id)
      .maybeSingle();

    const previousStatus =
      org?.subscription_status ||
      'TrialPending';

    await supabase
      .from('organizations')
      .update({
        sub_plan:
          planConfig?.key || payment.plan,
        billing_cycle:
          planConfig?.billingCycle || 'Monthly',
        plan_price:
          planConfig?.price ?? payment.amount,
        payment_status: 'Paid',
        subscription_status: 'Active',
        subscription_start:
          start.toISOString(),
        subscription_end:
          end ? end.toISOString() : null,
        payment_due_at:
          end ? end.toISOString() : null,
        amount_due: 0,
        last_expiry_notified_at: null
      })
      .eq('id', payment.org_id);

    await logBillingEvent({
      orgId: payment.org_id,
      eventType:
        BILLING_EVENTS.PAYMENT_SUCCESSFUL,
      amount: payment.amount,
      currency: payment.currency,
      txnRefNo: payment.txn_ref_no,
      gateway: gateway.name,
      previousStatus,
      newStatus: 'Active',
      metadata: {
        plan: payment.plan,
        providerTxnId: parsed.providerTxnId
      }
    });

    await logBillingEvent({
      orgId: payment.org_id,
      eventType:
        BILLING_EVENTS.ORG_PAYMENT_COMPLETED,
      previousStatus,
      newStatus: 'Active',
      gateway: gateway.name
    });

    if (previousStatus !== 'Active') {
      await logBillingEvent({
        orgId: payment.org_id,
        eventType:
          BILLING_EVENTS.ORG_OPERATIONS_RESUMED,
        previousStatus,
        newStatus: 'Active',
        gateway: gateway.name
      });
    }

    return {
      redirectUrl:
        `${clientUrl}/payment/result?status=success&orgId=${payment.org_id}&plan=${encodeURIComponent(planConfig?.label || payment.plan)}`
    };
  }

  await logBillingEvent({
    orgId: payment.org_id,
    eventType: BILLING_EVENTS.PAYMENT_FAILED,
    amount: payment.amount,
    currency: payment.currency,
    txnRefNo: payment.txn_ref_no,
    gateway: gateway.name,
    metadata: {
      responseCode: parsed.responseCode,
      responseMessage: parsed.responseMessage
    }
  });

  return {
    redirectUrl:
      `${clientUrl}/payment/result?status=failed&reason=${encodeURIComponent(parsed.responseMessage || 'declined')}`
  };
};

const getPayments = async ({ user }) => {
  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (user.role !== 'SuperAdmin') {
    query = query.eq('org_id', user.orgId);
  }

  const {
    data,
    error
  } = await query;

  if (error) {
    throw createError(
      'Could not fetch payments.'
    );
  }

  return data.map(serializePayment);
};

const getPlans = () => {
  return listPlans();
};

const markRefunded = async ({
  user,
  id,
  reference
}) => {
  const {
    data: payment,
    error: findErr
  } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (findErr || !payment) {
    throw createError(
      'Payment not found.',
      404
    );
  }

  if (payment.status !== 'Completed') {
    throw createError(
      'Only completed payments can be refunded.',
      400
    );
  }

  await supabase
    .from('payments')
    .update({
      status: 'Refunded',
      refunded_at: new Date().toISOString(),
      refund_reference: reference || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  await logBillingEvent({
    orgId: payment.org_id,
    userId: user.id,
    eventType: BILLING_EVENTS.PAYMENT_REFUNDED,
    amount: payment.amount,
    currency: payment.currency,
    txnRefNo: payment.txn_ref_no,
    gateway: payment.gateway,
    metadata: {
      reference: reference || null
    }
  });

  return true;
};

module.exports = {
  initiatePayment,
  handleCallback,
  getPayments,
  getPlans,
  markRefunded
};