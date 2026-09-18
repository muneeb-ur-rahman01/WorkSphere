// ============================================================
// Structured request logging
//
// Emits one JSON line per completed request:
//   { requestId, timestamp, method, path, statusCode, durationMs,
//     userId, orgId, ip, userAgent }
//
// Deliberately never logs: passwords, password hashes, JWTs,
// Authorization headers, API keys, Redis/Supabase credentials,
// or request bodies. Only metadata about the request is logged.
//
// Also raises generic security events for 401/403/404/429/500
// responses (see gateway/securityEvents.js), including a
// best-effort CROSS_ORGANIZATION_ACCESS_ATTEMPT signal when an
// authenticated user's own orgId doesn't match an orgId they
// referenced on the request.
// ============================================================

const {
  SECURITY_EVENTS,
  logSecurityEvent
} = require('./securityEvents');

const getClientIp = (req) => {
  // trust proxy must be configured in server.js for this to reflect the
  // real client IP behind Render's load balancer rather than its own IP.
  return req.ip || req.connection?.remoteAddress || null;
};

const getReferencedOrgId = (req) => {
  return (
    req.params?.orgId ||
    req.body?.orgId ||
    req.query?.orgId ||
    null
  );
};

const eventForStatus = (req, statusCode) => {
  if (statusCode === 401) return SECURITY_EVENTS.REQUEST_401;
  if (statusCode === 403) {
    const referencedOrgId = getReferencedOrgId(req);

    if (
      req.user?.orgId &&
      referencedOrgId &&
      String(referencedOrgId) !== String(req.user.orgId)
    ) {
      return SECURITY_EVENTS.CROSS_ORGANIZATION_ACCESS_ATTEMPT;
    }

    return SECURITY_EVENTS.REQUEST_403;
  }
  if (statusCode === 404) return SECURITY_EVENTS.REQUEST_404;
  if (statusCode === 429) return SECURITY_EVENTS.REQUEST_429;
  if (statusCode >= 500) return SECURITY_EVENTS.REQUEST_500;
  return null;
};

const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(
      (process.hrtime.bigint() - startedAt) / 1000000n
    );

    const entry = {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id || null,
      orgId: req.user?.orgId || null,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || null
    };

    // One structured JSON line — easy to ship to any log aggregator.
    console.log(JSON.stringify({ type: 'access_log', ...entry }));

    const event = eventForStatus(req, res.statusCode);

    if (event) {
      logSecurityEvent(event, {
        req,
        metadata: { statusCode: res.statusCode, durationMs }
      });
    }
  });

  next();
};

module.exports = requestLogger;
