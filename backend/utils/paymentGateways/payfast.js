// ============================================================
// PayFast (Pakistan) adapter — https://gopayfast.com
//
// PayFast is licensed by the State Bank of Pakistan and is the default
// gateway for CampOS (Stripe does not do direct merchant onboarding in
// Pakistan, so it is intentionally not used here — see gateway index.js).
//
// Integration shape, per PayFast's Merchant Integration Guide (token-based
// auth, then a signed hosted-checkout form POST redirect, then a server
// callback with the transaction result):
//   1. POST merchant_id + secured_key to PayFast's token endpoint to get a
//      short-lived access token.
//   2. Build a signed field set and auto-submit it as a browser form POST
//      to PayFast's transaction endpoint — the customer enters card data
//      on PayFast's own PCI-DSS-compliant hosted page, never on ours.
//   3. PayFast redirects back to our callback URL with the result, which
//      we verify server-side before trusting it.
//
// IMPORTANT — before going live: the exact field/header names below
// (PAYFAST_* env vars, endpoint paths, signature recipe) must be confirmed
// against the current PayFast Merchant Integration Guide / developer
// portal for your merchant account, since PSPs revise these periodically.
// Treat this file as the integration *shape*, not a guaranteed-correct
// wire format — verify against PayFast's docs (or their integration
// support team) during sandbox testing before enabling PAYMENT_GATEWAY=payfast
// in production.
// ============================================================

const crypto = require('crypto');

const isProd = (process.env.PAYFAST_ENV || 'sandbox').toLowerCase() === 'production';

const TOKEN_URL = process.env.PAYFAST_TOKEN_URL ||
  (isProd ? 'https://ipg1.apps.net.pk/Ecommerce/api/Token' : 'https://ipguat.apps.net.pk/Ecommerce/api/Token');
const CHECKOUT_URL = process.env.PAYFAST_CHECKOUT_URL ||
  (isProd ? 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction' : 'https://ipguat.apps.net.pk/Ecommerce/api/Transaction');

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '';
const SECURED_KEY = process.env.PAYFAST_SECURED_KEY || '';
const STORE_ID = process.env.PAYFAST_STORE_ID || '';

const isConfigured = () => Boolean(MERCHANT_ID && SECURED_KEY);

// PayFast amounts are typically decimal rupees (unlike JazzCash's paisa)
const toRupees = (amount) => Number(amount).toFixed(2);

const buildSignature = (fields) => {
  const sortedKeys = Object.keys(fields).sort();
  const raw = sortedKeys.map((k) => `${k}=${fields[k]}`).join('&');
  return crypto.createHmac('sha256', SECURED_KEY).update(raw).digest('hex');
};

// Fetches a one-time access token used to authenticate the transaction
// initiation request. Cached tokens are intentionally NOT kept here since
// tokens are short-lived and payment initiation is infrequent per org.
const fetchAccessToken = async () => {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ MERCHANT_ID, SECURED_KEY }).toString()
  });
  if (!res.ok) throw new Error('PayFast token request failed.');
  const data = await res.json();
  if (!data || !data.ACCESS_TOKEN) throw new Error('PayFast did not return an access token.');
  return data.ACCESS_TOKEN;
};

// amount: rupees. txnRefNo: unique reference (e.g. same format used for JazzCash).
const initiateCheckout = async ({ amount, txnRefNo, description, billReference, returnUrl }) => {
  const accessToken = await fetchAccessToken();

  const fields = {
    MERCHANT_ID,
    STORE_ID,
    TXNAMT: toRupees(amount),
    BASKET_ID: txnRefNo,
    ORDER_DATE: new Date().toISOString(),
    TXNDESC: description || 'CampOS Subscription Payment',
    CUSTOMER_MOBILE_NO: '',
    CUSTOMER_EMAIL_ADDRESS: '',
    SUCCESS_URL: returnUrl,
    FAILURE_URL: returnUrl,
    CHECKOUT_URL: returnUrl,
    CURRENCY_CODE: 'PKR',
    TOKEN: accessToken,
    PROCCODE: '00',
    TRAN_TYPE: 'ECOMM_PURCHASE',
    VERSION: 'PF-1.0',
    RECURRING_TXN: 'false',
    ITEMS: description || 'CampOS Subscription',
    ORDER_REF: billReference || 'campos-subscription'
  };

  fields.SIGNATURE = buildSignature(fields);
  return { postUrl: CHECKOUT_URL, method: 'POST', fields };
};

// Normalizes a PayFast callback payload into the common shape every
// gateway adapter returns from parseCallback().
const parseCallback = (payload) => {
  const receivedSignature = payload.SIGNATURE || payload.signature;
  const forVerification = { ...payload };
  delete forVerification.SIGNATURE;
  delete forVerification.signature;
  const recomputed = buildSignature(forVerification);
  const signatureValid = Boolean(receivedSignature) && receivedSignature === recomputed;

  // PayFast's ERR_CODE '000'/'00' family generally denotes success; treat
  // anything else (or a missing/invalid signature) as not successful.
  const errCode = payload.ERR_CODE || payload.err_code;
  const success = signatureValid && (errCode === '000' || errCode === '00');

  return {
    txnRefNo: payload.BASKET_ID || payload.basket_id || null,
    signatureValid,
    success,
    providerTxnId: payload.TRANSACTION_ID || payload.transaction_id || null,
    responseCode: errCode || null,
    responseMessage: payload.ERR_MSG || payload.err_msg || (signatureValid ? null : 'Signature verification failed'),
    rawProviderMetadata: {
      ERR_CODE: errCode,
      ERR_MSG: payload.ERR_MSG || payload.err_msg,
      TRANSACTION_ID: payload.TRANSACTION_ID || payload.transaction_id
    }
  };
};

module.exports = {
  name: 'PayFast',
  isConfigured,
  initiateCheckout,
  parseCallback
};
