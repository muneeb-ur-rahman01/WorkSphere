// ============================================================
// HTTP security headers + CORS
//
// - helmet applies a set of well-established secure defaults
//   (X-Content-Type-Options, X-Frame-Options / frame-ancestors,
//   HSTS, no X-Powered-By, etc.) rather than hand-rolling them.
// - CORS is locked to an explicit allow-list in production.
//   A wildcard "*" origin is only ever used in development,
//   and never together with credentials.
// ============================================================

const helmet = require('helmet');
const cors = require('cors');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * CORS_ORIGINS accepts a comma-separated list, e.g.:
 *   CORS_ORIGINS=https://app.worksphere.com,https://admin.worksphere.com
 * Falls back to CLIENT_URL (existing env var) for backward compatibility,
 * and finally to "*" — but only outside production.
 */
const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGINS || process.env.CLIENT_URL || '';

  const origins = raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }

  if (isProduction) {
    console.warn(
      '[gateway] CORS_ORIGINS / CLIENT_URL is not set in production. ' +
      'No cross-origin browser requests will be allowed until this is configured.'
    );
    return [];
  }

  // Local development convenience only.
  return ['*'];
};

const allowedOrigins = getAllowedOrigins();
const allowAllOrigins = !isProduction && allowedOrigins.includes('*');

const corsOptions = {
  origin(origin, callback) {
    // Non-browser tools (curl, server-to-server, payment gateway
    // callbacks) may not send an Origin header at all — allow those
    // through; they aren't subject to browser CORS enforcement anyway.
    if (!origin) return callback(null, true);

    if (allowAllOrigins || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600
};

const helmetOptions = {
  // The API serves JSON, not HTML, so a content-security-policy tuned
  // for script/style sources isn't meaningful here and could break
  // documented API tooling. Keep the other protections helmet bundles
  // (HSTS, no-sniff, frameguard, etc.) and skip CSP.
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: isProduction
    ? { maxAge: 15552000, includeSubDomains: true }
    : false
};

/**
 * Redirects plain HTTP to HTTPS in production. Render terminates TLS at
 * the edge and forwards the original scheme via X-Forwarded-Proto, so we
 * check that header rather than req.protocol.
 */
const enforceHttps = (req, res, next) => {
  if (!isProduction) return next();

  const forwardedProto = req.headers['x-forwarded-proto'];

  if (forwardedProto && forwardedProto !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }

  next();
};

module.exports = {
  helmetMiddleware: helmet(helmetOptions),
  corsMiddleware: cors(corsOptions),
  enforceHttps
};
