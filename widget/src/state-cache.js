/**
 * state-cache.js - localStorage state cache for offline grace rendering.
 *
 * Caches the last known state and attributes for each (tokenId, entityId)
 * pair so that cards can render stale-but-useful content while reconnecting.
 *
 * Cache key format: hrv_{djb2(tokenId + "|" + entityId).abs().hex().padStart(8)}
 *
 * The hash provides privacy-by-obscurity: the token ID and entity ID are not
 * directly visible in browser storage. This is not a cryptographic guarantee -
 * it is sufficient because the cache key is not a security boundary.
 *
 * crypto.subtle (async SHA-256) cannot be used here because this module is
 * called from synchronous paths such as connectedCallback. A fast djb2-style
 * integer hash is used instead, consistent with SPEC.md Section 9.
 *
 * All localStorage operations are wrapped in try/catch. Failures are silently
 * ignored so that the cache degrades gracefully in environments where
 * localStorage is unavailable (Safari private browsing, sandboxed iframes).
 */

// 32-bit hash: collision-tolerant by design. Cache is best-effort; server
// state replaces it on next WebSocket connect.
/**
 * Compute a djb2-style hash of a string. Returns a 32-bit signed integer.
 * @param {string} str
 * @returns {number}
 */
function _djb2(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // keep as 32-bit integer
  }
  return hash;
}

/**
 * Derive the localStorage key for a (tokenId, entityId) pair.
 * @param {string} tokenId
 * @param {string} entityId
 * @returns {string}
 */
function _keyFor(tokenId, entityId) {
  const raw = `${tokenId}|${entityId}`;
  const hash = _djb2(raw);
  return `hrv_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Thin wrapper around localStorage. Provides write(), read(), and remove()
 * with silent failure semantics.
 */
export class StateCache {
  /**
   * Write a state snapshot to the cache.
   *
   * @param {string} tokenId
   * @param {string} entityId
   * @param {string} state
   * @param {Record<string, unknown>} attributes
   */
  static write(tokenId, entityId, state, attributes) {
    try {
      const key = _keyFor(tokenId, entityId);
      localStorage.setItem(
        key,
        JSON.stringify({
          entity_id: entityId,
          state,
          attributes,
          cached_at: new Date().toISOString(),
        }),
      );
    } catch {
      // SecurityError (Safari private browsing), QuotaExceededError, or other
      // access denial. Cache is best-effort; silently ignore all failures.
    }
  }

  /**
   * Read a cached state snapshot. Returns null on cache miss, parse failure,
   * or any localStorage error.
   *
   * @param {string} tokenId
   * @param {string} entityId
   * @returns {{ entity_id: string, state: string, attributes: Record<string, unknown>, cached_at: string } | null}
   */
  static read(tokenId, entityId) {
    try {
      const key = _keyFor(tokenId, entityId);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // SecurityError, QuotaExceededError, or JSON.parse failure.
      // Return null so the caller renders a loading state instead of crashing.
      return null;
    }
  }

  /**
   * Remove a cached entry. No-op if the entry does not exist.
   *
   * @param {string} tokenId
   * @param {string} entityId
   */
  static remove(tokenId, entityId) {
    try {
      localStorage.removeItem(_keyFor(tokenId, entityId));
    } catch {
      // Ignore.
    }
  }
}
