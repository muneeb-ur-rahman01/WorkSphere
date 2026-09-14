const rateLimit = require('express-rate-limit');

const {
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX,
  PUBLIC_RATE_LIMIT_WINDOW_MS,
  PUBLIC_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  API_RATE_LIMIT_MAX,
  LOGIN_MAX_FAILURES,
  LOGIN_LOCKOUT_MS
} = require('../config/security');

/*
|--------------------------------------------------------------------------
| Generic rate-limit response
|--------------------------------------------------------------------------
*/

const rateLimitedResponse = (req, res) => {
  return res.status(429).json({
    success: false,
    error: 'Too many requests. Please wait a moment and try again.'
  });
};

/*
|--------------------------------------------------------------------------
| IP-based rate limiters
|--------------------------------------------------------------------------
*/

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse
});

const publicLimiter = rateLimit({
  windowMs: PUBLIC_RATE_LIMIT_WINDOW_MS,
  max: PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse
});

const apiLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitedResponse,

  // Health check should not consume API rate-limit quota.
  skip: (req) => req.path === '/health'
});

/*
|--------------------------------------------------------------------------
| Login account lockout
|--------------------------------------------------------------------------
|
| 5 failed attempts
|        ↓
| 15 minute temporary lock
|
| IMPORTANT:
| This is stored in memory.
| For multiple production servers/instances, use Redis instead.
|
*/

const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

const loginAttempts = new Map();

/*
|--------------------------------------------------------------------------
| Normalize email
|--------------------------------------------------------------------------
*/

const normalizeEmail = (email) => {
  return String(email || '')
    .trim()
    .toLowerCase();
};

/*
|--------------------------------------------------------------------------
| Check whether account is temporarily locked
|--------------------------------------------------------------------------
*/

const checkAccountThrottle = (req, res, next) => {
  const email = normalizeEmail(req.body?.email);

  // If email isn't available, let validation middleware handle it.
  if (!email) {
    return next();
  }

  const entry = loginAttempts.get(email);

  if (!entry) {
    return next();
  }

  const now = Date.now();

  /*
   * Lock has expired.
   * Completely reset the failed-attempt counter.
   */
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    loginAttempts.delete(email);
    return next();
  }

  /*
   * Account is currently locked.
   */
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil(
      (entry.lockedUntil - now) / 1000
    );

    res.set('Retry-After', String(retryAfterSeconds));

    return res.status(429).json({
      success: false,
      error: 'Too many failed login attempts. Please try again later.',
      retryAfterSeconds
    });
  }

  return next();
};

/*
|--------------------------------------------------------------------------
| Record login result
|--------------------------------------------------------------------------
*/

const recordLoginResult = (email, success) => {
  const key = normalizeEmail(email);

  if (!key) {
    return;
  }

  /*
   * Successful login:
   * clear all failed attempts and unlock account.
   */
  if (success) {
    loginAttempts.delete(key);
    return;
  }

  /*
   * Failed login
   */
  const entry = loginAttempts.get(key) || {
    failures: 0,
    lockedUntil: null,
    lastFailureAt: null
  };

  entry.failures += 1;
  entry.lastFailureAt = Date.now();

  /*
   * 5th failed attempt = 15 minute lock.
   */
  if (entry.failures >= LOGIN_MAX_FAILURES) {
  entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
}

  loginAttempts.set(key, entry);
};

module.exports = {
  authLimiter,
  publicLimiter,
  apiLimiter,
  checkAccountThrottle,
  recordLoginResult
};