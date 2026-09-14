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
  )
};