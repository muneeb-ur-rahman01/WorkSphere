// ============================================================
// Atomic cooldowns (SET key value NX EX <seconds>)
//
// Used for things like the forgot-password cooldown, where we
// want "only one attempt per key per window" without a separate
// GET/EXISTS followed by a SET — that pattern has a race window
// between two concurrent requests. `SET ... NX EX` acquires the
// cooldown atomically in a single round trip.
//
// Fails open (treats the cooldown as "not active") if Redis is
// unreachable, so this never becomes a hard outage for the
// underlying flow — see config/redis.js for the reasoning.
// ============================================================

const { getRedisClient, isRedisConnected } = require('../config/redis');

/**
 * Attempts to acquire a cooldown lock for `key`.
 * @returns {Promise<boolean>} true if the lock was acquired (caller may
 *   proceed), false if a cooldown is already active (caller should not
 *   repeat the side-effecting action, e.g. sending another reset email).
 */
const tryAcquireCooldown = async (key, ttlSeconds) => {
  if (!isRedisConnected()) {
    // Fail open: allow the action through rather than blocking it when
    // Redis is down. Slightly weaker abuse protection beats an outage.
    return true;
  }

  try {
    const redis = getRedisClient();
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    console.error('[cooldown] Redis error, failing open:', err.message);
    return true;
  }
};

/**
 * Clears a cooldown/lock key early (e.g. on successful login, to reset
 * a failure counter immediately rather than waiting out the window).
 */
const clearKey = async (key) => {
  if (!isRedisConnected()) return;

  try {
    await getRedisClient().del(key);
  } catch (err) {
    console.error('[cooldown] Redis error while clearing key:', err.message);
  }
};

/**
 * Atomically increments a counter and sets its TTL on first use only —
 * used for the login-failure counter (as opposed to the pass/fail lock
 * itself, which uses tryAcquireCooldown above).
 * @returns {Promise<number|null>} the new count, or null if Redis is down
 */
const incrementWithExpiry = async (key, ttlSeconds) => {
  if (!isRedisConnected()) return null;

  try {
    const redis = getRedisClient();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }

    return count;
  } catch (err) {
    console.error('[cooldown] Redis error during increment:', err.message);
    return null;
  }
};

/**
 * @returns {Promise<number>} remaining TTL in seconds, 0 if not set/expired,
 *   or -1 if Redis is unreachable (caller should treat as "not locked").
 */
const getTtlSeconds = async (key) => {
  if (!isRedisConnected()) return -1;

  try {
    const ttl = await getRedisClient().ttl(key);
    return ttl > 0 ? ttl : 0;
  } catch (err) {
    console.error('[cooldown] Redis error during ttl check:', err.message);
    return -1;
  }
};

module.exports = {
  tryAcquireCooldown,
  clearKey,
  incrementWithExpiry,
  getTtlSeconds
};
