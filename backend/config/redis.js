// ============================================================
// Redis connection (config/redis.js)
//
// Redis is used ONLY for short-lived / non-permanent state:
//   - API rate limiting counters
//   - Login failure counters + account lockouts
//   - Forgot-password cooldowns
//   - Optional short-lived caching
//
// Redis is NEVER the primary data store. All permanent
// application data continues to live in Supabase.
//
// The connection is intentionally resilient: if Redis is
// unreachable (misconfigured, restarting, network blip), the
// rest of the application (auth, business logic, Supabase
// access) must keep working. Callers should treat Redis as
// "best effort" and use isRedisConnected() to fail open on
// security-adjacent checks rather than crash or block all
// traffic. This is a deliberate availability/security
// trade-off, not an oversight — see gateway/rateLimit.js and
// gateway/cooldown.js for how callers handle a down Redis.
// ============================================================

const Redis = require('ioredis');

let client = null;
let ready = false;
let loggedMissingUrl = false;

/**
 * Lazily create the singleton ioredis client.
 * Returns null if REDIS_URL is not configured, so the caller
 * can fail open instead of throwing.
 */
const createRedisClient = () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (!loggedMissingUrl) {
      console.warn(
        '[redis] REDIS_URL is not set. Redis-backed rate limiting, ' +
        'login lockouts, and cooldowns are running in fail-open mode ' +
        '(requests will be allowed through without those protections). ' +
        'Set REDIS_URL to enable them.'
      );
      loggedMissingUrl = true;
    }
    return null;
  }

  client = new Redis(redisUrl, {
    // Never let a single slow/broken command hang a request forever;
    // fail fast so callers can fall back gracefully.
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy(times) {
      // Capped exponential-ish backoff, keep retrying indefinitely —
      // Redis coming back should self-heal the connection.
      return Math.min(times * 200, 5000);
    },
    reconnectOnError() {
      // Reconnect on any connection-level error (e.g. READONLY on
      // failover); ioredis will requeue safe commands.
      return true;
    }
  });

  client.on('connect', () => {
    console.log('[redis] Connecting...');
  });

  client.on('ready', () => {
    ready = true;
    console.log('[redis] Connection ready.');
  });

  client.on('error', (err) => {
    ready = false;
    // Never let a Redis error crash the process — just log it.
    console.error('[redis] Connection error:', err.message);
  });

  client.on('close', () => {
    ready = false;
    console.warn('[redis] Connection closed.');
  });

  client.on('reconnecting', (delay) => {
    console.warn(`[redis] Reconnecting in ${delay}ms...`);
  });

  client.on('end', () => {
    ready = false;
    console.warn('[redis] Connection ended (no more reconnects).');
  });

  return client;
};

const getRedisClient = () => client || createRedisClient();

const isRedisConnected = () => ready && !!client;

/**
 * Graceful shutdown hook — call from server.js on SIGTERM/SIGINT.
 */
const closeRedisClient = async () => {
  if (client) {
    try {
      await client.quit();
    } catch (err) {
      console.error('[redis] Error during shutdown:', err.message);
    }
  }
};

// Initialize eagerly at startup (not lazily on first use) so connection
// issues surface in logs immediately rather than on a user's first request.
createRedisClient();

module.exports = {
  getRedisClient,
  isRedisConnected,
  closeRedisClient
};
