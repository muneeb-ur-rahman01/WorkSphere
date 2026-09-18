// ============================================================
// Security event tracking
//
// A small, well-known set of security-relevant event types that
// the gateway and auth flows can raise. Every event is:
//   1. Emitted as a structured JSON console log line, and
//   2. Written to the existing audit_logs table via utils/auditLog.js,
//      so it shows up alongside the platform's other audit history
//      instead of creating a second, disconnected logging system.
//
// logSecurityEvent() never throws — a logging failure must never
// block the request that triggered it (mirrors utils/auditLog.js
// and utils/billingAudit.js, which follow the same principle).
//
// Never pass passwords, password hashes, tokens, JWTs, Authorization
// headers, API keys, or Redis/Supabase credentials into `metadata`.
// ============================================================

const { logAudit } = require('../utils/auditLog');

const SECURITY_EVENTS = Object.freeze({
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  TWO_FACTOR_FAILED: 'TWO_FACTOR_FAILED',
  TWO_FACTOR_SUCCESS: 'TWO_FACTOR_SUCCESS',
  REQUEST_401: 'REQUEST_401',
  REQUEST_403: 'REQUEST_403',
  REQUEST_404: 'REQUEST_404',
  REQUEST_429: 'REQUEST_429',
  REQUEST_500: 'REQUEST_500',
  RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
  SUSPICIOUS_REQUEST: 'SUSPICIOUS_REQUEST',
  CROSS_ORGANIZATION_ACCESS_ATTEMPT: 'CROSS_ORGANIZATION_ACCESS_ATTEMPT'
});

// Events noisy enough (every 404, every plain 401 from an expired token)
// that they're only useful server-side, not worth a permanent audit row.
// They are still console-logged for tracing.
const CONSOLE_ONLY_EVENTS = new Set([
  SECURITY_EVENTS.REQUEST_404
]);

const logSecurityEvent = (
  event,
  { req = null, userId = null, orgId = null, metadata = {} } = {}
) => {
  try {
    const resolvedUserId = userId || req?.user?.id || null;
    const resolvedOrgId = orgId || req?.user?.orgId || null;

    const entry = {
      type: 'security_event',
      event,
      timestamp: new Date().toISOString(),
      requestId: req?.id || null,
      userId: resolvedUserId,
      orgId: resolvedOrgId,
      path: req?.originalUrl?.split('?')[0] || null,
      method: req?.method || null,
      ip: req?.ip || null,
      ...metadata
    };

    console.log(JSON.stringify(entry));

    if (CONSOLE_ONLY_EVENTS.has(event)) {
      return;
    }

    // Fire and forget — logAudit() already never throws, but we don't
    // await it here either so security logging can't slow the response.
    logAudit({
      actor: resolvedUserId ? { id: resolvedUserId } : null,
      orgId: resolvedOrgId,
      action: `security.${event.toLowerCase()}`,
      entityType: 'security_event',
      metadata
    });
  } catch (err) {
    // Never let logging break the request it's describing.
    console.error('[securityEvents] Failed to log event:', event, err.message);
  }
};

module.exports = { SECURITY_EVENTS, logSecurityEvent };
