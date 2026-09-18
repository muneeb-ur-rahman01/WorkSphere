// ============================================================
// Request ID middleware
//
// Attaches a unique requestId to every incoming request so it
// can be traced across:
//   Gateway -> Middleware -> Controller -> Service -> Error Logs
//
// If the client (or an upstream proxy/load balancer) already
// sent an X-Request-Id header, we reuse it so traces stay
// consistent end-to-end; otherwise we mint a new UUID.
// ============================================================

const crypto = require('crypto');

const MAX_INCOMING_ID_LENGTH = 128;

const isSafeIncomingId = (value) => {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_INCOMING_ID_LENGTH &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
};

const requestId = (req, res, next) => {
  const incoming = req.headers['x-request-id'];

  req.id = isSafeIncomingId(incoming)
    ? incoming
    : crypto.randomUUID();

  res.set('X-Request-Id', req.id);

  next();
};

module.exports = requestId;
