// ============================================================
// Centralized security configuration.
//
// Security thresholds can be configured through environment
// variables. Safe defaults are provided for local development
// and production deployments.
// ============================================================

const int = (value, fallback) => {
  const n = parseInt(value, 10);

  return Number.isFinite(n) && n > 0
    ? n
    : fallback;
};

module.exports = {
  // ==========================================================
  // Auth route rate limiting
  // ==========================================================
  //
  // Protects login/register/forgot-password routes by IP.
  //
  AUTH_RATE_LIMIT_WINDOW_MS: int(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  AUTH_RATE_LIMIT_MAX: int(
    process.env.AUTH_RATE_LIMIT_MAX,
    20
  ),

  // ==========================================================
  // Public API rate limiting
  // ==========================================================

  PUBLIC_RATE_LIMIT_WINDOW_MS: int(
    process.env.PUBLIC_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  PUBLIC_RATE_LIMIT_MAX: int(
    process.env.PUBLIC_RATE_LIMIT_MAX,
    100
  ),

  // ==========================================================
  // General API rate limiting
  // ==========================================================

  API_RATE_LIMIT_WINDOW_MS: int(
    process.env.API_RATE_LIMIT_WINDOW_MS,
    60 * 1000
  ),

  API_RATE_LIMIT_MAX: int(
    process.env.API_RATE_LIMIT_MAX,
    300
  ),

  // ==========================================================
  // Login account lockout
  // ==========================================================
  //
  // 5 failed login attempts
  //        ↓
  // 15 minute temporary lock
  //
  // The lock is tracked per normalized email address.
  //

  LOGIN_MAX_FAILURES: int(
    process.env.LOGIN_MAX_FAILURES,
    5
  ),

  LOGIN_LOCKOUT_MS: int(
    process.env.LOGIN_LOCKOUT_MS,
    15 * 60 * 1000
  ),

  // ==========================================================
  // Forgot-password cooldown
  // ==========================================================

  FORGOT_PASSWORD_COOLDOWN_MS: int(
    process.env.FORGOT_PASSWORD_COOLDOWN_MS,
    60 * 1000
  ),

  // ==========================================================
  // Forgot-password / password-reset rate limiting (by IP)
  // ==========================================================
  //
  // Separate from the per-email cooldown above: this bounds how many
  // forgot-password / reset-password requests a single IP can make,
  // regardless of which email addresses it targets.
  //
  PASSWORD_RESET_RATE_LIMIT_WINDOW_MS: int(
    process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  PASSWORD_RESET_RATE_LIMIT_MAX: int(
    process.env.PASSWORD_RESET_RATE_LIMIT_MAX,
    10
  ),

  // ==========================================================
  // Registration rate limiting (by IP)
  // ==========================================================

  REGISTRATION_RATE_LIMIT_WINDOW_MS: int(
    process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS,
    60 * 60 * 1000
  ),

  REGISTRATION_RATE_LIMIT_MAX: int(
    process.env.REGISTRATION_RATE_LIMIT_MAX,
    10
  ),

  // ==========================================================
  // Two-factor verification rate limiting (by IP)
  // ==========================================================
  //
  // Reserved for when 2FA/OTP verification endpoints are added —
  // the limiter is available (see middleware/rateLimiter.js) even
  // though no route currently uses it.
  //
  TWO_FACTOR_RATE_LIMIT_WINDOW_MS: int(
    process.env.TWO_FACTOR_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  TWO_FACTOR_RATE_LIMIT_MAX: int(
    process.env.TWO_FACTOR_RATE_LIMIT_MAX,
    10
  ),

  // ==========================================================
  // OTP verification rate limiting (by IP)
  // ==========================================================
  //
  // Reserved for when OTP endpoints are added.
  //
  OTP_RATE_LIMIT_WINDOW_MS: int(
    process.env.OTP_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  OTP_RATE_LIMIT_MAX: int(
    process.env.OTP_RATE_LIMIT_MAX,
    10
  ),

  // ==========================================================
  // File upload rate limiting (by user, falls back to IP)
  // ==========================================================
  //
  // Applied to endpoints that accept file uploads (e.g. prescription
  // audio dictation), which are relatively expensive to process.
  //
  FILE_UPLOAD_RATE_LIMIT_WINDOW_MS: int(
    process.env.FILE_UPLOAD_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  FILE_UPLOAD_RATE_LIMIT_MAX: int(
    process.env.FILE_UPLOAD_RATE_LIMIT_MAX,
    30
  ),

  // ==========================================================
  // "Expensive" endpoint rate limiting (by user, falls back to IP)
  // ==========================================================
  //
  // For endpoints that call out to a third-party service (payment
  // gateway initiation, AI calls, etc.) and are costlier per-request
  // than a typical CRUD call.
  //
  EXPENSIVE_RATE_LIMIT_WINDOW_MS: int(
    process.env.EXPENSIVE_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),

  EXPENSIVE_RATE_LIMIT_MAX: int(
    process.env.EXPENSIVE_RATE_LIMIT_MAX,
    20
  )
};