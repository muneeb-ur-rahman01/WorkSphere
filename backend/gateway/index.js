// ============================================================
// Secure API Gateway Layer
//
//   Client
//     |
//     v
//   Secure API Gateway Layer   <-- this file
//     |
//     v
//   Security Middleware / Routes / Controllers / Services / Supabase
//
// This is an application-level gateway: it runs inside the existing
// Express app on the existing Render service. It is NOT a separate
// deployment, process, or microservice — just the first layer of
// middleware applied before any route is reached.
//
// applyGateway(app) wires, in order:
//   1. requestId          - every request gets a traceable requestId
//   2. enforceHttps        - HTTP -> HTTPS redirect in production
//   3. helmet               - standard secure HTTP headers
//   4. cors                 - explicit origin allow-list
//   5. body parsers          - size-limited JSON/urlencoded parsing
//   6. timeoutGuard          - bounds how long a request can run
//   7. requestLogger         - structured logs + generic security events
//   8. apiLimiter             - baseline Redis-backed rate limit on /api
//   9. payloadCrypto         - encrypted request/response envelope (opt-in per request)
//
// Auth, RBAC, org isolation, and Supabase RLS are unchanged and continue
// to run further down the existing Routes -> Middleware -> Controllers
// -> Services -> Supabase chain, after this layer.
// ============================================================

const express = require('express');

const requestId = require('./requestId');
const { helmetMiddleware, corsMiddleware, enforceHttps } = require('./securityHeaders');
const timeoutGuard = require('./timeoutGuard');
const requestLogger = require('./requestLogger');
const { apiLimiter } = require('../middleware/rateLimiter');
const { payloadCrypto } = require('./payloadCrypto');

const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Reasonable default: generous enough for normal JSON payloads and small
// base64 attachments, small enough to stop a request body from being
// used to exhaust server memory. Override per-deployment via env.
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || '2mb';
const URLENCODED_BODY_LIMIT = process.env.URLENCODED_BODY_LIMIT || '2mb';

const applyGateway = (app) => {
  // Required for req.ip / X-Forwarded-Proto to reflect the real client
  // when running behind Render's load balancer/proxy.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(enforceHttps);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: URLENCODED_BODY_LIMIT }));

  app.use(timeoutGuard);
  app.use(requestLogger);

  // Baseline rate limit across the whole API. Sensitive routes (login,
  // forgot-password, registration, file upload, etc.) layer additional,
  // stricter limiters on top of this in their own route files.
  app.use('/api', apiLimiter);

  // Authenticated API responses are personal data: never let browsers or
  // intermediary caches store them.
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // Optional encrypted request/response envelope for authenticated calls
  // (see gateway/payloadCrypto.js). Must run after the body parsers.
  app.use('/api', payloadCrypto);
};

module.exports = { applyGateway };
