// ============================================================
// Rate limiting + login/cooldown throttling
//
// Backed by Redis (see gateway/rateLimit.js and gateway/cooldown.js)
// so counters are atomic and shared across every instance of this
// service, instead of an in-memory `new Map()` that resets on
// restart and doesn't work once the app scales beyond one process.
//
// All thresholds are configurable via config/security.js /
// environment variables — nothing here is hard-coded.
// ============================================================

const { createRateLimiter } = require('../gateway/rateLimit');
const {
  tryAcquireCooldown,
  clearKey,
  incrementWithExpiry,
  getTtlSeconds
} = require('../gateway/cooldown');
const { SECURITY_EVENTS, logSecurityEvent } = require('../gateway/securityEvents');

const {
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX,
  PUBLIC_RATE_LIMIT_WINDOW_MS,
  PUBLIC_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  API_RATE_LIMIT_MAX,
  LOGIN_MAX_FAILURES,
  LOGIN_LOCKOUT_MS,
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  PASSWORD_RESET_RATE_LIMIT_MAX,
  REGISTRATION_RATE_LIMIT_WINDOW_MS,
  REGISTRATION_RATE_LIMIT_MAX,
  TWO_FACTOR_RATE_LIMIT_WINDOW_MS,
  TWO_FACTOR_RATE_LIMIT_MAX,
  OTP_RATE_LIMIT_WINDOW_MS,
  OTP_RATE_LIMIT_MAX,
  FILE_UPLOAD_RATE_LIMIT_WINDOW_MS,
  FILE_UPLOAD_RATE_LIMIT_MAX,
  EXPENSIVE_RATE_LIMIT_WINDOW_MS,
  EXPENSIVE_RATE_LIMIT_MAX
} = require('../config/security');

/*
|--------------------------------------------------------------------------
| Key generators
|--------------------------------------------------------------------------
|
| Prefer a per-user key (harder to evade than per-IP) when the request is
| authenticated; fall back to IP for anonymous/public routes.
|
*/

const byIp = (req) => req.ip;

const byUserOrIp = (req) => (req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`);

/*
|--------------------------------------------------------------------------
| IP / user-based rate limiters
|--------------------------------------------------------------------------
*/

const authLimiter = createRateLimiter({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  keyPrefix: 'auth',
  keyGenerator: byIp,
  message: 'Too many requests. Please wait a moment and try again.'
});

const publicLimiter = createRateLimiter({
  windowMs: PUBLIC_RATE_LIMIT_WINDOW_MS,
  max: PUBLIC_RATE_LIMIT_MAX,
  keyPrefix: 'public',
  keyGenerator: byIp,
  message: 'Too many requests. Please wait a moment and try again.'
});

const apiLimiter = createRateLimiter({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
  keyPrefix: 'api',
  keyGenerator: byUserOrIp,
  message: 'Too many requests. Please wait a moment and try again.',
  // Health check should not consume API rate-limit quota.
  skip: (req) => req.path === '/health'
});

const passwordResetLimiter = createRateLimiter({
  windowMs: PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  max: PASSWORD_RESET_RATE_LIMIT_MAX,
  keyPrefix: 'password-reset',
  keyGenerator: byIp,
  message: 'Too many password reset requests. Please wait a moment and try again.'
});

const registrationLimiter = createRateLimiter({
  windowMs: REGISTRATION_RATE_LIMIT_WINDOW_MS,
  max: REGISTRATION_RATE_LIMIT_MAX,
  keyPrefix: 'registration',
  keyGenerator: byIp,
  message: 'Too many registration attempts from this network. Please try again later.'
});

// Reserved for future 2FA/OTP verification endpoints — not currently
// wired to any route since the app doesn't have 2FA/OTP flows yet.
const twoFactorLimiter = createRateLimiter({
  windowMs: TWO_FACTOR_RATE_LIMIT_WINDOW_MS,
  max: TWO_FACTOR_RATE_LIMIT_MAX,
  keyPrefix: 'two-factor',
  keyGenerator: byUserOrIp,
  message: 'Too many verification attempts. Please wait a moment and try again.'
});

const otpLimiter = createRateLimiter({
  windowMs: OTP_RATE_LIMIT_WINDOW_MS,
  max: OTP_RATE_LIMIT_MAX,
  keyPrefix: 'otp',
  keyGenerator: byUserOrIp,
  message: 'Too many verification attempts. Please wait a moment and try again.'
});

const fileUploadLimiter = createRateLimiter({
  windowMs: FILE_UPLOAD_RATE_LIMIT_WINDOW_MS,
  max: FILE_UPLOAD_RATE_LIMIT_MAX,
  keyPrefix: 'file-upload',
  keyGenerator: byUserOrIp,
  message: 'Too many uploads. Please wait a moment and try again.'
});

const expensiveLimiter = createRateLimiter({
  windowMs: EXPENSIVE_RATE_LIMIT_WINDOW_MS,
  max: EXPENSIVE_RATE_LIMIT_MAX,
  keyPrefix: 'expensive',
  keyGenerator: byUserOrIp,
  message: 'Too many requests. Please wait a moment and try again.'
});

/*
|--------------------------------------------------------------------------
| Login failure tracking + account lockout
|--------------------------------------------------------------------------
|
| Redis-backed replacement for the old `new Map()` based tracker:
|   - Failures are counted with atomic INCR/EXPIRE within a rolling
|     window (LOGIN_LOCKOUT_MS is reused as that window).
|   - Once LOGIN_MAX_FAILURES is hit, an atomic `SET key val NX EX`
|     acquires the lock — no separate GET+SET race.
|   - A successful login clears both keys immediately.
|
| Fails open if Redis is unreachable (see gateway/cooldown.js) so an
| outage of the cache layer doesn't lock every user out of the app.
|
*/

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const failuresKey = (email) => `login:failures:${email}`;
const lockKey = (email) => `login:lock:${email}`;

const checkAccountThrottle = async (req, res, next) => {
  const email = normalizeEmail(req.body?.email);

  // If email isn't available, let validation middleware handle it.
  if (!email) {
    return next();
  }

  const ttl = await getTtlSeconds(lockKey(email));

  // ttl === -1 means Redis is unreachable — fail open.
  if (ttl > 0) {
    res.set('Retry-After', String(ttl));

    return res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please try again later.',
      retryAfterSeconds: ttl
    });
  }

  return next();
};

const recordLoginResult = async (email, success, req = null) => {
  const key = normalizeEmail(email);

  if (!key) return;

  if (success) {
    await clearKey(failuresKey(key));
    await clearKey(lockKey(key));
    return;
  }

  logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILED, {
    req,
    metadata: { email: key }
  });

  const windowSeconds = Math.max(1, Math.ceil(LOGIN_LOCKOUT_MS / 1000));
  const failures = await incrementWithExpiry(failuresKey(key), windowSeconds);

  // failures === null means Redis is unreachable — nothing more to do.
  if (failures === null) return;

  if (failures >= LOGIN_MAX_FAILURES) {
    const acquired = await tryAcquireCooldown(lockKey(key), windowSeconds);

    if (acquired) {
      logSecurityEvent(SECURITY_EVENTS.ACCOUNT_LOCKED, {
        req,
        metadata: { email: key, failures }
      });
    }
  }
};

module.exports = {
  authLimiter,
  publicLimiter,
  apiLimiter,
  passwordResetLimiter,
  registrationLimiter,
  twoFactorLimiter,
  otpLimiter,
  fileUploadLimiter,
  expensiveLimiter,
  checkAccountThrottle,
  recordLoginResult
};
