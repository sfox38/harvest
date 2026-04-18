/**
 * Shared persistent list of known origins, stored in localStorage.
 * Used by OriginsEditor (TokenDetail) and Wizard Step 3 to share the same URL memory.
 */

const KEY = "hrv_known_origins";

/**
 * Validates a URL entered by the user for use as an origin restriction.
 * Returns an error string, or null if valid.
 */
// RFC 3986 pchar set plus "/" plus non-ASCII Unicode (Thai, CJK, etc. - percent-encoded at store time).
const VALID_PATH_RE = /^[/a-zA-Z0-9\-._~!$&'()*+,;=:@%\u0080-\uFFFF]*$/;

export function validateOriginUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Please enter a URL.";

  // Reject invalid percent-encoding before the browser silently normalizes it.
  // % must be followed by exactly two hex digits.
  if (/%(?![0-9A-Fa-f]{2})/i.test(trimmed)) {
    return "URL contains invalid encoding - % must be followed by two hex digits (e.g. %20).";
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return "Invalid URL. Enter a full URL including https://.";
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return "URL must start with http:// or https://.";
  }

  const hostname = u.hostname;
  if (!hostname) return "URL must include a hostname.";

  // Validate each DNS label: no empty labels, no leading/trailing hyphens.
  for (const label of hostname.split(".")) {
    if (!label) return "Hostname contains an empty label (check for double dots).";
    if (label.startsWith("-") || label.endsWith("-")) {
      return `Hostname label "${label}" cannot start or end with a hyphen.`;
    }
    if (/^[^a-zA-Z0-9]/.test(label)) {
      return `Hostname label "${label}" must start with a letter or digit.`;
    }
  }

  // Validate the raw path segment against RFC 3986 allowed characters.
  // Use the raw input (not the parsed pathname) so the browser cannot silently fix invalid chars.
  const hostIdx = trimmed.indexOf(u.host);
  const rawAfterHost = hostIdx >= 0 ? trimmed.slice(hostIdx + u.host.length) : "";
  const rawPath = rawAfterHost.split(/[?#]/)[0];
  if (rawPath && rawPath !== "/") {
    if (rawPath.includes("..")) return "Path cannot contain '..'.";
    if (rawPath.length > 512) return "Path is too long (max 512 characters).";
    if (!VALID_PATH_RE.test(rawPath)) {
      return "URL path contains invalid characters. Use only letters, digits, hyphens, and valid percent-encoding.";
    }
  }

  return null;
}

export function loadKnownOrigins(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function addKnownOrigin(url: string): void {
  const list = loadKnownOrigins();
  if (!list.includes(url)) {
    list.push(url);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  }
}

/** Decode percent-encoding and truncate for display in SELECT options. */
export function displayOriginLabel(url: string, maxLen = 72): string {
  let decoded = url;
  try { decoded = decodeURIComponent(url); } catch { /* keep raw if decode fails */ }
  return decoded.length > maxLen ? decoded.slice(0, maxLen - 1) + "\u2026" : decoded;
}

export function removeKnownOrigin(url: string): void {
  const next = loadKnownOrigins().filter(o => o !== url);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
}
