const crypto = require('crypto');
const supabase = require('../config/supabase');
const { getActiveGateway } = require('../utils/paymentGateways');
const { httpErr, toApi, UUID, validDate } = require('./crudFactory');
const { notifyAdmins, notifyUser } = require('../utils/notify');
const { logAudit } = require('../utils/auditLog');

const CURRENCY = (process.env.DONATION_CURRENCY || 'PKR').toUpperCase();
const MAX_AMOUNT = 1000000;
const money = (n) => Math.round(Number(n || 0) * 100) / 100;
const fmt = (n) => money(n).toLocaleString('en-US', { minimumFractionDigits: 2 });
const clientUrl = () => process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

const serialize = (d, extra = {}) => ({
  id: d.id, userId: d.user_id, campaignId: d.campaign_id, amount: Number(d.amount), currency: d.currency,
  donorName: d.donor_name, donorEmail: d.donor_email, paymentMethod: d.payment_method, status: d.status,
  transactionReference: d.txn_ref_no, providerTransactionId: d.provider_txn_id, responseMessage: d.response_message,
  verifiedAt: d.verified_at, createdAt: d.created_at, ...extra
});

// ---------------------------------------------------------------- campaigns (staff view)
const listCampaigns = async ({ user }) => {
  const { data, error } = await supabase.from('campaigns').select('id, title, goal_amount, status').eq('org_id', user.orgId).eq('status', 'Active').order('title');
  if (error) throw httpErr('Could not load campaigns.', 500);
  const ids = data.map((c) => c.id);
  const raised = {};
  if (ids.length) {
    const [org, staff] = await Promise.all([
      supabase.from('donations').select('campaign_id, amount').eq('org_id', user.orgId).in('campaign_id', ids),
      supabase.from('staff_donations').select('campaign_id, amount').eq('org_id', user.orgId).eq('status', 'Succeeded').in('campaign_id', ids)
    ]);
    [...(org.data || []), ...(staff.data || [])].forEach((r) => { raised[r.campaign_id] = (raised[r.campaign_id] || 0) + Number(r.amount); });
  }
  return { currency: CURRENCY, campaigns: data.map((c) => ({ id: c.id, title: c.title, goalAmount: c.goal_amount === null ? null : Number(c.goal_amount), raisedAmount: money(raised[c.id] || 0) })) };
};

// ---------------------------------------------------------------- checkout
const returnUrl = () => process.env.DONATION_RETURN_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/staff-donations/callback`;

const startCheckout = async ({ user, campaignId, amount, donorName, donorEmail, idempotencyKey }) => {
  if (!UUID.test(campaignId || '')) throw httpErr('Select a campaign.');
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 1 || n > MAX_AMOUNT) throw httpErr(`Amount must be between 1 and ${MAX_AMOUNT.toLocaleString('en-US')}.`);
  if (Math.abs(Math.round(n * 100) - n * 100) > 1e-6) throw httpErr('Amount can have at most 2 decimals.');
  if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(idempotencyKey)) throw httpErr('Invalid request key. Please reload the page and try again.');
  const { data: me } = await supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle();
  const name = String(donorName || me?.full_name || '').trim(), email = String(donorEmail || me?.email || '').trim();
  if (name.length < 2 || name.length > 120) throw httpErr('Donor name must be 2-120 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw httpErr('A valid donor email is required.');

  const gateway = getActiveGateway();
  if (!gateway.isConfigured()) throw httpErr('Online payments are not set up yet. Please ask your administrator to configure the payment gateway.', 503);

  const { data: campaign } = await supabase.from('campaigns').select('id, title, status').eq('id', campaignId).eq('org_id', user.orgId).maybeSingle();
  if (!campaign || campaign.status !== 'Active') throw httpErr('This campaign is not accepting donations.', 400);

  // Idempotency: the same key from the same user never creates a second donation.
  let { data: d } = await supabase.from('staff_donations').select('*').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (d) {
    if (d.campaign_id !== campaignId || Math.abs(Number(d.amount) - n) > 0.005) throw httpErr('This request key was already used for a different donation.', 409);
    if (d.status !== 'Pending') return { donation: serialize(d), alreadyProcessed: true };
  } else {
    const txnRefNo = `WSD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const ins = await supabase.from('staff_donations').insert({ org_id: user.orgId, user_id: user.id, campaign_id: campaignId, amount: n, currency: CURRENCY, donor_name: name, donor_email: email, payment_method: gateway.name, txn_ref_no: txnRefNo, idempotency_key: idempotencyKey, provider: gateway.name }).select().single();
    if (ins.error) {
      if (ins.error.code === '23505') {
        ({ data: d } = await supabase.from('staff_donations').select('*').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle());
        if (!d) throw httpErr('Could not start the donation. Please try again.', 409);
      } else throw httpErr('Could not start the donation.', 500);
    } else d = ins.data;
  }

  let checkout;
  try {
    checkout = await gateway.initiateCheckout({ amount: n, txnRefNo: d.txn_ref_no, description: `Donation: ${campaign.title}`, billReference: d.txn_ref_no, returnUrl: returnUrl() });
  } catch (err) {
    console.error('[donations] initiateCheckout failed:', err.message);
    await supabase.rpc('ws_staff_donation_settle', { p_txn: d.txn_ref_no, p_success: false, p_provider: gateway.name, p_provider_txn: null, p_code: 'INIT', p_msg: 'Could not reach the payment gateway' });
    throw httpErr('The payment gateway is unavailable right now. Please try again later.', 502);
  }
  return { donation: serialize(d), checkout };
};

// ---------------------------------------------------------------- gateway callback / webhook
const handleCallback = async ({ payload }) => {
  const done = (status, extra = '') => ({ redirectUrl: `${clientUrl()}/staff/donations?status=${status}${extra}` });
  const gateway = getActiveGateway();
  let parsed;
  try { parsed = gateway.parseCallback(payload || {}); } catch { return done('failed', '&reason=invalid_callback'); }
  if (!parsed.txnRefNo || !String(parsed.txnRefNo).startsWith('WSD-')) return done('failed', '&reason=unknown_reference');
  // An unsigned / forged callback must never change a donation's state (neither success nor failure).
  if (!parsed.signatureValid) return done('failed', '&reason=signature');

  const { data: d } = await supabase.from('staff_donations').select('*').eq('txn_ref_no', parsed.txnRefNo).maybeSingle();
  if (!d) return done('failed', '&reason=unknown_reference');

  let success = parsed.success;
  const paid = Number(payload?.TXNAMT ?? payload?.txnamt ?? payload?.amount);
  if (success && Number.isFinite(paid) && Math.abs(paid - Number(d.amount)) > 0.005) {
    console.error(`[donations] amount mismatch for ${d.txn_ref_no}: expected ${d.amount}, gateway reported ${paid}`);
    success = false;
  }

  const { data, error } = await supabase.rpc('ws_staff_donation_settle', { p_txn: d.txn_ref_no, p_success: success, p_provider: gateway.name, p_provider_txn: parsed.providerTxnId, p_code: parsed.responseCode, p_msg: success ? 'Verified' : (parsed.responseMessage || 'Payment not completed') });
  if (error) { console.error('[donations] settle failed:', error.message); return done('pending', `&ref=${d.txn_ref_no}`); }
  const r = data[0];
  if (r.changed) { // first delivery only: duplicate callbacks change nothing and notify nobody
    if (r.out_status === 'Succeeded') {
      await notifyUser(d.org_id, d.user_id, 'Donation Verified', `Your donation of ${d.currency} ${fmt(d.amount)} was verified. Thank you!`, { dedupe_key: `donation:ok:${d.id}` });
      await notifyAdmins(d.org_id, 'Donation Received', `${d.donor_name} donated ${d.currency} ${fmt(d.amount)} (ref ${d.txn_ref_no}).`, { dedupe_key: `donation:ok:admin:${d.id}` });
    } else {
      await notifyUser(d.org_id, d.user_id, 'Donation Failed', `Your donation of ${d.currency} ${fmt(d.amount)} could not be completed.`, { dedupe_key: `donation:fail:${d.id}` });
    }
  }
  return done(r.out_status === 'Succeeded' ? 'success' : r.out_status === 'Failed' ? 'failed' : 'pending', `&ref=${d.txn_ref_no}`);
};

// ---------------------------------------------------------------- history & reports
const listMine = async ({ user }) => {
  const { data, error } = await supabase.from('staff_donations').select('*').eq('user_id', user.id).eq('org_id', user.orgId).order('created_at', { ascending: false }).limit(200);
  if (error) throw httpErr('Could not load your donations.', 500);
  const { data: camps } = await supabase.from('campaigns').select('id, title').eq('org_id', user.orgId).in('id', [...new Set(data.map((d) => d.campaign_id))]);
  const cn = new Map((camps || []).map((c) => [c.id, c.title]));
  return data.map((d) => serialize(d, { campaignTitle: cn.get(d.campaign_id) || 'Campaign' }));
};

const report = async ({ user, query }) => {
  let q = supabase.from('staff_donations').select('*').eq('org_id', user.orgId).order('created_at', { ascending: false }).limit(2000);
  if (query.from) { if (!validDate(query.from)) throw httpErr('Invalid from date.'); q = q.gte('created_at', `${query.from}T00:00:00Z`); }
  if (query.to) { if (!validDate(query.to)) throw httpErr('Invalid to date.'); q = q.lte('created_at', `${query.to}T23:59:59.999Z`); }
  if (query.campaignId) { if (!UUID.test(query.campaignId)) throw httpErr('Invalid campaign.'); q = q.eq('campaign_id', query.campaignId); }
  if (query.userId) { if (!UUID.test(query.userId)) throw httpErr('Invalid donor.'); q = q.eq('user_id', query.userId); }
  if (query.status) { if (!['Pending', 'Succeeded', 'Failed', 'Refunded'].includes(query.status)) throw httpErr('Invalid status.'); q = q.eq('status', query.status); }
  const { data, error } = await q;
  if (error) throw httpErr('Could not load the fundraising report.', 500);
  const { data: camps } = await supabase.from('campaigns').select('id, title').eq('org_id', user.orgId);
  const cn = new Map((camps || []).map((c) => [c.id, c.title]));
  const rows = data.map((d) => serialize(d, { campaignTitle: cn.get(d.campaign_id) || 'Campaign' }));
  // Totals and analytics count verified (Succeeded) transactions only.
  const verified = rows.filter((r) => r.status === 'Succeeded');
  const byCampaign = {};
  verified.forEach((r) => { byCampaign[r.campaignTitle] = money((byCampaign[r.campaignTitle] || 0) + r.amount); });
  return {
    currency: CURRENCY, rows,
    totals: { verifiedAmount: money(verified.reduce((a, r) => a + r.amount, 0)), verifiedCount: verified.length, pendingCount: rows.filter((r) => r.status === 'Pending').length, failedCount: rows.filter((r) => r.status === 'Failed').length, refundedAmount: money(rows.filter((r) => r.status === 'Refunded').reduce((a, r) => a + r.amount, 0)) },
    byCampaign: Object.entries(byCampaign).map(([campaign, amount]) => ({ campaign, amount }))
  };
};

const refund = async ({ user, id }) => {
  if (!UUID.test(id || '')) throw httpErr('Invalid donation.');
  const { data, error } = await supabase.rpc('ws_staff_donation_refund', { p_id: id, p_org: user.orgId, p_admin: user.id });
  if (error) throw httpErr(error.message.includes('only succeeded') ? 'Only verified (succeeded) donations can be marked as refunded.' : 'Could not mark the donation as refunded.', error.message.includes('only succeeded') ? 409 : 500);
  await notifyUser(user.orgId, data.user_id, 'Donation Refunded', `Your donation of ${data.currency} ${fmt(data.amount)} (ref ${data.txn_ref_no}) was refunded.`, { dedupe_key: `donation:refund:${data.id}` });
  await notifyAdmins(user.orgId, 'Donation Refunded', `Donation ${data.txn_ref_no} (${data.currency} ${fmt(data.amount)}) was marked as refunded.`, { dedupe_key: `donation:refund:admin:${data.id}` });
  await logAudit({ actor: user, orgId: user.orgId, action: 'donation.refunded', entityType: 'staff_donation', entityId: id, entityLabel: data.txn_ref_no });
  return serialize(data);
};

const gatewayStatus = () => { const g = getActiveGateway(); return { gateway: g.name, configured: g.isConfigured(), currency: CURRENCY }; };

module.exports = { listCampaigns, startCheckout, handleCallback, listMine, report, refund, gatewayStatus, toApi };
