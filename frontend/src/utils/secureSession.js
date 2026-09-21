// ============================================================
// Session storage + encrypted API transport (client side)
//
// * The login token, the signed-in user and the per-session encryption key
//   live in sessionStorage - i.e. they are tied to ONE browser tab/window
//   and disappear when it is closed. Nothing is kept in localStorage, so
//   opening a new window never shows a stale "Go to Portal / Logout" state
//   from an earlier session.
// * encryptJson / decryptJson implement the AES-256-GCM envelope that
//   backend/gateway/payloadCrypto.js expects:  base64( iv | ciphertext | tag ).
// ============================================================

const TOKEN_KEY = 'token';
const USER_KEY = 'campos_current_user';
const ENC_KEY = 'ws_ek';

// Older builds stored the session in localStorage. Remove those leftovers
// once so an old, never-logged-out session can't keep the UI "signed in".
try {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
} catch {
  /* storage unavailable - nothing to clean */
}

const read = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null || value === undefined) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    /* storage unavailable */
  }
};

export const getToken = () => read(TOKEN_KEY);

export const getEncKey = () => read(ENC_KEY);

export const getStoredUser = () => {
  // A user record without its token is not a real session.
  if (!getToken()) return null;

  try {
    const saved = read(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) =>
  write(USER_KEY, user ? JSON.stringify(user) : null);

export const setSession = ({ token, encKey }) => {
  write(TOKEN_KEY, token || null);
  write(ENC_KEY, encKey || null);
};

// Used after a profile change: the server re-issues the token, the
// encryption key stays the same.
export const setToken = (token) => write(TOKEN_KEY, token || null);

export const clearSession = () => {
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
  write(ENC_KEY, null);
};

// ------------------------------------------------------------
// AES-256-GCM envelope
// ------------------------------------------------------------

export const isEncryptionAvailable = () =>
  typeof window !== 'undefined' &&
  !!window.crypto?.subtle &&
  typeof TextEncoder !== 'undefined';

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
};

const base64ToBytes = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

let cachedRaw = null;
let cachedKey = null;

const importKey = async (rawB64) => {
  if (cachedKey && cachedRaw === rawB64) return cachedKey;

  cachedKey = await window.crypto.subtle.importKey(
    'raw',
    base64ToBytes(rawB64),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  cachedRaw = rawB64;

  return cachedKey;
};

export const encryptJson = async (value, rawKeyB64) => {
  const key = await importKey(rawKeyB64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = new Uint8Array(
    await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(value))
    )
  );

  const out = new Uint8Array(iv.length + encrypted.length);
  out.set(iv, 0);
  out.set(encrypted, iv.length);

  return bytesToBase64(out);
};

export const decryptJson = async (payloadB64, rawKeyB64) => {
  const key = await importKey(rawKeyB64);
  const raw = base64ToBytes(payloadB64);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.subarray(0, 12) },
    key,
    raw.subarray(12)
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
};
