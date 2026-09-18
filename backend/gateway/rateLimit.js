// ============================================================
// Redis-backed rate limiting
//
// Uses atomic INCR + EXPIRE against Redis so counters are shared
// across every instance of the app (important once this service
// scales beyond a single process/dyno), instead of an in-memory
// `new Map()` that resets on restart and isn't shared across
// instances.
//
// Fail-open by design: if Redis is unreachable, requests are
// allowed through rather than the whole API going down because
// a cache dependency is unavailable. This is logged loudly so
// it's visible in monitoring, and it only affects rate limiting —
// authentication/authorization checks downstream are unaffected.
// ============================================================

const { getRedisClient, isRedisConnected } = require('../config/redis');
const { SECURITY_EVENTS, logSecurityEvent } = require('./securityEvents');

/**
 * @param {object} options
 * @param {number} options.windowMs - rolling window size in milliseconds
 * @param {number} options.max - max requests allowed per window per key
 * @param {string} options.keyPrefix - namespaces this limiter's Redis keys
 * @param {(req) => string} [options.keyGenerator] - defaults to req.ip
 * @param {string} [options.message] - response body message on 429
 * @param {(req) => boolean} [options.skip] - return true to bypass the limiter
 */
const createRateLimiter = ({
  windowMs,
  max,
  keyPrefix,
  keyGenerator = (req) => req.ip,
  message = 'Too many requests. Please wait a moment and try again.',
  skip
}) => {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

  return async function rateLimiterMiddleware(req, res, next) {
    if (typeof skip === 'function' && skip(req)) {
      return next();
    }

    if (!isRedisConnected()) {
      // Fail open — see module header.
      return next();
    }

    try {
      const redis = getRedisClient();
      const identifier = keyGenerator(req) || 'unknown';
      const key = `ratelimit:${keyPrefix}:${identifier}`;

      // Atomic: INCR returns the post-increment count in one round trip.
      // Setting the TTL only on the first hit (count === 1) turns this
      // into a fixed rolling window without a separate GET/EXISTS check
      // that could race with concurrent requests.
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.expire(key, windowSec);
      }

      const ttl = await redis.ttl(key);
      const resetSeconds = ttl > 0 ? ttl : windowSec;

      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(Math.max(max - count, 0)));
      res.set(
        'X-RateLimit-Reset',
        String(Math.floor(Date.now() / 1000) + resetSeconds)
      );

      if (count > max) {
        res.set('Retry-After', String(resetSeconds));

        logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_TRIGGERED, {
          req,
          metadata: { keyPrefix, limit: max, windowMs }
        });

        return res.status(429).json({
          success: false,
          error: message
        });
      }

      return next();
    } catch (err) {
      console.error(`[rateLimit:${keyPrefix}] Redis error, failing open:`, err.message);
      return next();
    }
  };
};

module.exports = { createRateLimiter };
