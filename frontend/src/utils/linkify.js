// ============================================================
// Link helpers
//   - splitTextByLinks(): find real, valid web links inside chat text so
//     they can be rendered as clickable <a> elements.
//   - isValidGoogleDriveUrl(): strict check used by the Documents form.
// ============================================================

const URL_CANDIDATE = /((?:https?:\/\/|www\.)[^\s<>"'`]+)/gi;

const TRAILING_PUNCTUATION = /[.,;:!?'"\]}>]+$/;

// Removes punctuation that belongs to the sentence, not the link, while
// keeping a closing ")" that balances an opening "(" inside the link.
const trimTrailing = (raw) => {
  let value = raw.replace(TRAILING_PUNCTUATION, '');

  while (value.endsWith(')')) {
    const opens = (value.match(/\(/g) || []).length;
    const closes = (value.match(/\)/g) || []).length;

    if (closes > opens) {
      value = value.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
    } else {
      break;
    }
  }

  return value;
};

const HOST_PATTERN =
  /^(localhost|(\d{1,3}\.){3}\d{1,3}|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/i;

// Returns a safe, absolute http(s) URL string, or null when the text is
// not a proper link.
export const toSafeUrl = (raw) => {
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (!HOST_PATTERN.test(url.hostname)) return null;

    return url.href;
  } catch {
    return null;
  }
};

/**
 * Splits text into [{ type: 'text', value } | { type: 'link', value, href }].
 * Only valid links become 'link' parts; anything else stays plain text.
 */
export const splitTextByLinks = (text) => {
  const source = String(text ?? '');
  const parts = [];
  let cursor = 0;

  for (const match of source.matchAll(URL_CANDIDATE)) {
    const start = match.index;
    const shown = trimTrailing(match[0]);
    const href = toSafeUrl(shown);

    if (!href) continue;

    if (start > cursor) {
      parts.push({ type: 'text', value: source.slice(cursor, start) });
    }

    parts.push({ type: 'link', value: shown, href });
    cursor = start + shown.length;
  }

  if (cursor < source.length) {
    parts.push({ type: 'text', value: source.slice(cursor) });
  }

  return parts;
};

const DRIVE_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'drive.usercontent.google.com'
];

// A Google Drive / Docs (Docs, Sheets, Slides live on Drive) share link:
// https, on a Google Drive host, and pointing at something (not the bare
// homepage).
export const isValidGoogleDriveUrl = (value) => {
  const raw = String(value ?? '').trim();

  if (!raw || /\s/.test(raw)) return false;

  try {
    const url = new URL(raw);

    if (url.protocol !== 'https:') return false;
    if (!DRIVE_HOSTS.includes(url.hostname.toLowerCase())) return false;

    const hasPath = url.pathname.replace(/\//g, '').length > 0;
    const hasId = url.searchParams.has('id');

    return hasPath && (url.pathname.length > 1 || hasId);
  } catch {
    return false;
  }
};
