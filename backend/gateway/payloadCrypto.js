// ============================================================
// Encrypted API transport (application layer, on top of HTTPS)
//
// Goal: request bodies and JSON responses of *authenticated* API calls
// travel as opaque ciphertext, so they are not readable in the browser's
// Network tab, proxy logs, HAR exports or any other place that only sees
// the HTTP body.
//
// How it works
//   - At login the server creates a random 256-bit *session key*. It is
//     returned to the client once (in the login response) and ALSO stored
//     inside the signed JWT, but encrypted with a key derived from
//     JWT_SECRET ("ek" claim) - so a stolen token alone does not reveal
//     the session key, and the server stays stateless.
//   - The client opts in per request with the header  X-WS-Enc: 1  and
//     sends  { "d": "<base64(iv | ciphertext | tag)>" }  (AES-256-GCM).
//   - This middleware decrypts the body into req.body, and wraps res.json
//     so the response is encrypted with the same session key.
//
// What this is NOT: a replacement for HTTPS, authentication or RBAC
// (all of those still apply unchanged). The person logged in on a
// browser holds the session key, so they can always read their *own*
// traffic; URLs / query-strings and HTTP metadata are also still visible.
//
// Anything that does not send X-WS-Enc (public routes, file uploads,
// payment gateway callbacks, old sessions) behaves exactly as before.
// ============================================================

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ENC_HEADER = 'x-ws-enc';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

// Set ENFORCE_ENCRYPTED_API=true once every client is upgraded to reject
// authenticated calls that do not use the encrypted envelope.
const ENFORCE = process.env.ENFORCE_ENCRYPTED_API === 'true';

const serverWrapKey = () =>
  crypto
    .createHash('sha256')
    .update(`ws-session-key-wrap:${process.env.JWT_SECRET || ''}`)
    .digest();

const seal = (key, plaintext) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('base64');
};

const open = (key, payload) => {
  const raw = Buffer.from(String(payload), 'base64');

  if (raw.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Encrypted payload is too short.');
  }

  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(raw.length - TAG_LENGTH);
  const data = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]);
};

// Called at login: returns the raw key (for the client) and the wrapped
// copy to embed in the JWT.
const createSessionKey = () => {
  const key = crypto.randomBytes(32);

  return {
    key: key.toString('base64'),
    ek: seal(serverWrapKey(), key)
  };
};

const sessionKeyFromToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded.ek) return null;

  return open(serverWrapKey(), decoded.ek);
};

const payloadCrypto = (req, res, next) => {
  const wantsEncryption = req.headers[ENC_HEADER] === '1';

  if (!wantsEncryption) {
    // Encrypted transport is only meaningful for authenticated calls.
    if (
      ENFORCE &&
      req.headers.authorization &&
      req.method !== 'OPTIONS'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Encrypted transport is required.'
      });
    }

    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  let key;

  try {
    key = token ? sessionKeyFromToken(token) : null;
  } catch (err) {
    // Invalid / expired token: let requireAuth produce the normal 401.
    return next();
  }

  if (!key) {
    return res.status(400).json({
      success: false,
      error: 'Encrypted transport is not available for this session. Please log in again.'
    });
  }

  // ---- Request body
  const hasBody =
    req.body &&
    typeof req.body === 'object' &&
    Object.keys(req.body).length > 0;

  if (hasBody) {
    if (typeof req.body.d !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Malformed encrypted request.'
      });
    }

    try {
      req.body = JSON.parse(open(key, req.body.d).toString('utf8'));
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Malformed encrypted request.'
      });
    }
  }

  // ---- Response body
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    res.setHeader('X-WS-Enc', '1');

    return originalJson({
      d: seal(key, Buffer.from(JSON.stringify(body === undefined ? null : body), 'utf8'))
    });
  };

  next();
};

module.exports = {
  payloadCrypto,
  createSessionKey
};
