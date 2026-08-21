// ============================================================
// Payment gateway registry / adapter interface.
//
// Every adapter (jazzcash.js, payfast.js, ...) implements the same shape:
//
//   name: string
//   isConfigured(): boolean
//   initiateCheckout({ amount, txnRefNo, description, billReference, returnUrl })
//     -> { postUrl, method, fields }   (may be async — PayFast fetches a token first)
//   parseCallback(payload) -> {
//     txnRefNo, signatureValid, success, providerTxnId,
//     responseCode, responseMessage, rawProviderMetadata
//   }
//
// This is the ONLY place that knows which gateway is active. To add a new
// provider: implement the interface above in its own file, register it in
// GATEWAYS below, and switch PAYMENT_GATEWAY in .env — no controller,
// route, or billing logic needs to change.
// ============================================================

const jazzcash = require('./jazzcash');
const payfast = require('./payfast');

const GATEWAYS = {
  jazzcash,
  payfast
};

const getActiveGateway = () => {
  const key = (process.env.PAYMENT_GATEWAY || 'payfast').toLowerCase();
  const gateway = GATEWAYS[key];
  if (!gateway) {
    throw new Error(`Unknown PAYMENT_GATEWAY "${key}". Valid options: ${Object.keys(GATEWAYS).join(', ')}`);
  }
  return gateway;
};

module.exports = { getActiveGateway, GATEWAYS };
