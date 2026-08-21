// ============================================================
// JazzCash Hosted Checkout adapter.
//
// Implements the common gateway interface (see ./index.js). We build a
// signed pp_* field set on the server; the browser auto-submits it as a
// POST form to JazzCash's checkout page. JazzCash then redirects the
// customer back to our callback URL with the result, verified here using
// the same secure-hash algorithm. Card data is entered on JazzCash's own
// hosted page and never touches our servers.
//
// Docs: https://developer.jazzcash.com.pk/ (Hosted Checkout / Page Post)
// ============================================================

const crypto = require('crypto');

const isProd = (process.env.JAZZCASH_ENV || 'sandbox').toLowerCase() === 'production';

const CHECKOUT_URL = isProd
  ? 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
  : 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

const MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || '';
const PASSWORD = process.env.JAZZCASH_PASSWORD || '';
const INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || '';

const formatDateTime = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

// JazzCash requires amount in the smallest currency unit (paisa), no decimals.
const toPaisa = (amountRupees) => Math.round(Number(amountRupees) * 100).toString();

const buildSecureHash = (fields) => {
  const sortedKeys = Object.keys(fields)
    .filter((k) => k.startsWith('pp_') && k !== 'pp_SecureHash' && fields[k] !== '' && fields[k] !== undefined && fields[k] !== null)
    .sort();

  const hashString = [INTEGRITY_SALT, ...sortedKeys.map((k) => fields[k])].join('&');
  return crypto.createHmac('sha256', INTEGRITY_SALT).update(hashString).digest('hex').toUpperCase();
};

const isConfigured = () => Boolean(MERCHANT_ID && PASSWORD && INTEGRITY_SALT);

// amount: rupees. txnRefNo: unique reference, must start with "T".
const initiateCheckout = ({ amount, txnRefNo, description, billReference, returnUrl }) => {
  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour expiry

  const fields = {
    pp_Version: '1.1',
    pp_TxnType: 'MPAY', // Hosted Checkout (card + wallet)
    pp_Language: 'EN',
    pp_MerchantID: MERCHANT_ID,
    pp_SubMerchantID: '',
    pp_Password: PASSWORD,
    pp_BankID: '',
    pp_ProductID: '',
    pp_TxnRefNo: txnRefNo,
    pp_Amount: toPaisa(amount),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: formatDateTime(now),
    pp_BillReference: billReference || 'campos-subscription',
    pp_Description: description || 'CampOS Subscription Payment',
    pp_TxnExpiryDateTime: formatDateTime(expiry),
    pp_ReturnURL: returnUrl,
    pp_SecureHash: ''
  };

  fields.pp_SecureHash = buildSecureHash(fields);
  return { postUrl: CHECKOUT_URL, method: 'POST', fields };
};

// Normalizes a JazzCash callback payload into the common shape every
// gateway adapter returns from parseCallback().
const parseCallback = (payload) => {
  const received = payload.pp_SecureHash;
  const recomputed = buildSecureHash(payload);
  const hashValid = Boolean(received) && received.toUpperCase() === recomputed;

  return {
    txnRefNo: payload.pp_TxnRefNo || null,
    signatureValid: hashValid,
    success: hashValid && payload.pp_ResponseCode === '000',
    providerTxnId: payload.pp_RetreivalReferenceNo || payload.pp_TxnRefNo || null,
    responseCode: payload.pp_ResponseCode || null,
    responseMessage: payload.pp_ResponseMessage || (hashValid ? null : 'Secure hash verification failed'),
    // Non-sensitive fields worth keeping for the audit trail — no card data is ever present here.
    rawProviderMetadata: {
      pp_ResponseCode: payload.pp_ResponseCode,
      pp_ResponseMessage: payload.pp_ResponseMessage,
      pp_RetreivalReferenceNo: payload.pp_RetreivalReferenceNo,
      pp_AuthCode: payload.pp_AuthCode
    }
  };
};

module.exports = {
  name: 'JazzCash',
  isConfigured,
  initiateCheckout,
  parseCallback
};
