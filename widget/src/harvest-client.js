/**
 * harvest-client.js - HarvestClient singleton and WebSocket management.
 *
 * HarvestClient manages a single authenticated WebSocket connection for a
 * given (haUrl, tokenId) pair. All HrvCard elements sharing the same haUrl
 * and tokenId share one instance. Cards with different tokens get separate
 * clients even when the haUrl is the same.
 *
 * Public exports:
 *   getOrCreateClient(haUrl, tokenId, tokenSecret) -> HarvestClient
 *   destroyClient(haUrl, tokenId)
 */

// Reconnect delay sequence in milliseconds.
const RECONNECT_DELAYS = [5000, 10000, 30000, 60000];

// Heartbeat timeout: if no message arrives in this window, reconnect.
const HEARTBEAT_TIMEOUT_MS = 60_000;

// Auth debounce: wait this long after the first card mounts before opening WS.
const AUTH_DEBOUNCE_MS = 50;

// Maximum consecutive re-auth failures before entering permanent HRV_AUTH_FAILED.
const MAX_REAUTH_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Singleton registry
// ---------------------------------------------------------------------------

/** @type {Map<string, HarvestClient>} */
const _clients = new Map();

/**
 * Return the existing HarvestClient for (haUrl, tokenId), creating one if
 * none exists. tokenSecret is only used when creating a new instance; it is
 * ignored on subsequent lookups.
 *
 * @param {string} haUrl
 * @param {string} tokenId
 * @param {string|null} tokenSecret
 * @returns {HarvestClient}
 */
export function getOrCreateClient(haUrl, tokenId, tokenSecret) {
  const key = `${haUrl}|${tokenId}`;
  if (!_clients.has(key)) {
    _clients.set(key, new HarvestClient(haUrl, tokenId, tokenSecret));
  }
  return _clients.get(key);
}

/**
 * Destroy and remove the client for (haUrl, tokenId) from the registry.
 * After this call the client's WebSocket is closed and the instance is gone.
 *
 * @param {string} haUrl
 * @param {string} tokenId
 */
export function destroyClient(haUrl, tokenId) {
  const key = `${haUrl}|${tokenId}`;
  const client = _clients.get(key);
  if (client) {
    client.destroy();
    _clients.delete(key);
  }
}

// ---------------------------------------------------------------------------
// HarvestClient
// ---------------------------------------------------------------------------

/**
 * Manages a single authenticated WebSocket connection to the HArvest
 * integration for a specific (haUrl, tokenId) combination.
 */
export class HarvestClient {
  /** @type {string} */ #haUrl;
  /** @type {string} */ #tokenId;
  /** @type {string|null} */ #tokenSecret;

  /** @type {WebSocket|null} */ #ws = null;
  /** @type {string|null} */ #sessionId = null;
  /** @type {number} */ #msgIdCounter = 0;

  // entityId -> HrvCard (last-write-wins)
  /** @type {Map<string, object>} */ #cards = new Map();

  // entity IDs collected during the 50ms debounce window
  /** @type {Set<string>} */ #pendingEntityIds = new Set();

  /** @type {ReturnType<typeof setTimeout>|null} */ #authDebounceTimer = null;
  /** @type {ReturnType<typeof setTimeout>|null} */ #reconnectTimer = null;
  /** @type {ReturnType<typeof setTimeout>|null} */ #heartbeatTimer = null;

  /** @type {number} */ #reconnectAttempt = 0;
  /** @type {number} */ #reauthAttempts = 0;

  /** @type {Date|null} */ #absoluteExpiresAt = null;
  /** @type {number} */ #renewalCount = 0;
  // max renewals from the last auth_ok (null = unlimited)
  /** @type {number|null} */ #maxRenewals = null;

  // last_updated timestamps per entity for out-of-order discard
  /** @type {Map<string, {state: string, attributes: object, lastUpdated: Date}>} */ #entityStates = new Map();

  // Flood protection: track malformed message timestamps
  /** @type {number[]} */ #malformedTimestamps = [];
  static #FLOOD_LIMIT = 10;
  static #FLOOD_WINDOW_MS = 5000;

  /** @type {Array<(entityId: string, state: string, attrs: object) => void>} */
  #stateListeners = [];

  // Permanent shutdown flag - set after MAX_REAUTH_ATTEMPTS failures
  /** @type {boolean} */ #permanentFailure = false;

  /**
   * @param {string} haUrl   - Base URL of the HA instance (e.g. https://ha.example.com)
   * @param {string} tokenId - HArvest token ID (hwt_...)
   * @param {string|null} tokenSecret - HMAC secret, or null for unsigned auth
   */
  constructor(haUrl, tokenId, tokenSecret) {
    this.#haUrl = haUrl.replace(/\/$/, ""); // strip trailing slash
    this.#tokenId = tokenId;
    this.#tokenSecret = tokenSecret ?? null;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Register an HrvCard for an entity ID. Starts the 50ms auth debounce if
   * this is the first card and the connection has not been opened yet. If the
   * connection is already open, sends a subscribe message immediately.
   *
   * @param {string} entityId
   * @param {object} card - HrvCard instance
   */
  registerCard(entityId, card) {
    this.#cards.set(entityId, card);

    if (this.#ws !== null && this.#ws.readyState === WebSocket.OPEN && this.#sessionId) {
      // Connection already open: subscribe the new entity immediately.
      this.#sendJson({
        type: "subscribe",
        session_id: this.#sessionId,
        entity_ids: [entityId],
        msg_id: this.#nextMsgId(),
      });
    } else {
      // Queue for the initial auth message.
      this.#pendingEntityIds.add(entityId);

      if (this.#ws === null && this.#authDebounceTimer === null && !this.#permanentFailure) {
        this.#authDebounceTimer = setTimeout(() => {
          this.#authDebounceTimer = null;
          this.#openConnection();
        }, AUTH_DEBOUNCE_MS);
      }
    }
  }

  /**
   * Unregister an HrvCard. Sends an unsubscribe message if connected.
   * No server response is expected.
   *
   * @param {string} entityId
   */
  unregisterCard(entityId) {
    this.#cards.delete(entityId);
    this.#pendingEntityIds.delete(entityId);

    if (this.#ws !== null && this.#ws.readyState === WebSocket.OPEN && this.#sessionId) {
      this.#sendJson({
        type: "unsubscribe",
        session_id: this.#sessionId,
        entity_ids: [entityId],
        msg_id: this.#nextMsgId(),
      });
      // No response expected - fire and forget.
    }
  }

  /**
   * Send a command message to the integration.
   *
   * @param {string} entityId
   * @param {string} action
   * @param {object} data
   * @param {number} msgId
   */
  sendCommand(entityId, action, data, msgId) {
    if (!this.#sessionId || !this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      console.warn("[HArvest] sendCommand called with no active session");
      return;
    }
    this.#sendJson({
      type: "command",
      session_id: this.#sessionId,
      entity_id: entityId,
      action,
      data: data ?? {},
      msg_id: msgId,
    });
  }

  /**
   * Return a new monotonically increasing message ID.
   * @returns {number}
   */
  nextMsgId() {
    return this.#nextMsgId();
  }

  /**
   * Register a listener that is called on every state update for any entity.
   *
   * @param {(entityId: string, state: string, attrs: object) => void} callback
   */
  onAnyState(callback) {
    this.#stateListeners.push(callback);
  }

  /**
   * Return the HrvCard registered for the given entity ID, or null.
   * Used by HArvest.getCard() in the build entry point.
   *
   * @param {string} entityId
   * @returns {object|null}
   */
  _getCard(entityId) {
    return this.#cards.get(entityId) ?? null;
  }

  /**
   * Permanently close the connection and clear all timers.
   */
  destroy() {
    this.#permanentFailure = true;
    clearTimeout(this.#authDebounceTimer);
    clearTimeout(this.#reconnectTimer);
    clearTimeout(this.#heartbeatTimer);
    this.#authDebounceTimer = null;
    this.#reconnectTimer = null;
    this.#heartbeatTimer = null;
    if (this.#ws) {
      this.#ws.onclose = null; // suppress reconnect on deliberate destroy
      this.#ws.close();
      this.#ws = null;
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** @returns {number} */
  #nextMsgId() {
    return ++this.#msgIdCounter;
  }

  /**
   * Open the WebSocket connection. Called after the auth debounce fires or
   * when a reconnect timer fires.
   */
  #openConnection() {
    if (this.#permanentFailure) return;

    const wsUrl = this.#haUrl
      .replace(/^http:/, "ws:")
      .replace(/^https:/, "wss:")
      + "/api/harvest/ws";

    try {
      this.#ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("[HArvest] WebSocket construction failed:", err);
      this.#scheduleReconnect();
      return;
    }

    this.#ws.onopen    = () => { this.#onOpen(); };
    this.#ws.onmessage = (event) => this.#onMessage(event);
    this.#ws.onclose   = (event) => this.#onClose(event);
    this.#ws.onerror   = (event) => this.#onError(event);
  }

  async #onOpen() {
    this.#resetHeartbeat();
    try {
      await this.#sendAuth();
    } catch (err) {
      console.error("[HArvest] HMAC signing failed - entering permanent failure:", err);
      this.#permanentFailure = true;
      for (const card of this.#cards.values()) {
        card.setErrorState?.("HRV_AUTH_FAILED");
      }
      this.#ws?.close();
    }
  }

  /**
   * @param {MessageEvent} event
   */
  #onMessage(event) {
    this.#resetHeartbeat();

    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      console.warn("[HArvest] Received malformed JSON:", event.data?.slice?.(0, 200));
      if (this.#trackMalformed()) this.#ws?.close();
      return;
    }

    if (!msg || typeof msg.type !== "string") {
      console.warn("[HArvest] Message missing type field:", msg);
      if (this.#trackMalformed()) this.#ws?.close();
      return;
    }

    this.#routeMessage(msg);
  }

  /**
   * @param {CloseEvent} event
   */
  #onClose(event) {
    clearTimeout(this.#heartbeatTimer);
    this.#heartbeatTimer = null;
    this.#ws = null;
    this.#sessionId = null;

    if (this.#permanentFailure) return;

    console.debug(`[HArvest] WS closed (code ${event.code}) - scheduling reconnect`);
    this.#scheduleReconnect();
  }

  /**
   * @param {Event} event
   */
  #onError(event) {
    console.warn("[HArvest] WebSocket error:", event);
    // onClose fires after onerror; reconnect is handled there.
  }

  /**
   * Build and send the auth message. Uses all currently known entity IDs
   * (pending set plus already-registered cards that are not yet subscribed).
   */
  async #sendAuth() {
    // Collect all entity IDs currently known to this client.
    const entityIds = [...new Set([
      ...this.#pendingEntityIds,
      ...this.#cards.keys(),
    ])];
    this.#pendingEntityIds.clear();

    /** @type {object} */
    const msg = {
      type: "auth",
      token_id: this.#tokenId,
      entity_ids: entityIds,
      msg_id: this.#nextMsgId(),
    };

    if (this.#tokenSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = this.#generateNonce();
      const signature = await this.#buildHmacSignature(timestamp, nonce);
      msg.timestamp = timestamp;
      msg.nonce = nonce;
      msg.signature = signature;
    }

    // Re-auth after session expiry: include session_id if we have one.
    // For a fresh connect (reconnect) the session_id is already null.

    this.#sendJson(msg);
  }

  /**
   * Schedule a reconnect attempt with exponential backoff and 20% jitter.
   * All cards are set to HRV_STALE while disconnected.
   */
  #scheduleReconnect() {
    const baseDelay = RECONNECT_DELAYS[Math.min(this.#reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    const jitter = baseDelay * 0.2 * Math.random();
    const delay = baseDelay + jitter;

    this.#reconnectAttempt++;

    for (const card of this.#cards.values()) {
      card.setErrorState?.("HRV_STALE");
    }

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.#openConnection();
    }, delay);
  }

  /**
   * Reset the client-side heartbeat watchdog. Called on every inbound message.
   * If no message arrives within HEARTBEAT_TIMEOUT_MS, the WS is closed and
   * a reconnect is triggered.
   */
  #resetHeartbeat() {
    clearTimeout(this.#heartbeatTimer);
    this.#heartbeatTimer = setTimeout(() => {
      console.warn("[HArvest] Heartbeat timeout - reconnecting");
      this.#ws?.close();
    }, HEARTBEAT_TIMEOUT_MS);
  }

  /**
   * Dispatch an inbound message to the appropriate handler by type.
   * @param {object} msg
   */
  #routeMessage(msg) {
    switch (msg.type) {
      case "auth_ok":          return this.#handleAuthOk(msg);
      case "auth_failed":      return this.#handleAuthFailed(msg);
      case "entity_definition":return this.#handleEntityDefinition(msg);
      case "state_update":     return this.#handleStateUpdate(msg);
      case "entity_removed":   return this.#handleEntityRemoved(msg);
      case "history_data":     return this.#handleHistoryData(msg);
      case "subscribe_ok":     return this.#handleSubscribeOk(msg);
      case "session_expiring": return this.#handleSessionExpiring(msg);
      case "ack":              return this.#handleAck(msg);
      case "error":            return this.#handleError(msg);
      default:
        console.debug("[HArvest] Unknown message type:", msg.type);
    }
  }

  // -------------------------------------------------------------------------
  // Message handlers
  // -------------------------------------------------------------------------

  #handleAuthOk(msg) {
    this.#sessionId = msg.session_id;
    this.#reconnectAttempt = 0;
    this.#reauthAttempts = 0;
    this.#absoluteExpiresAt = msg.absolute_expires_at ? new Date(msg.absolute_expires_at) : null;
    this.#renewalCount = 0;
    this.#maxRenewals = msg.max_renewals ?? null;

    // entity_definition and state_update messages follow immediately.
  }

  #handleAuthFailed(msg) {
    const code = msg.code ?? "HRV_AUTH_FAILED";
    console.warn("[HArvest] Auth failed:", code);

    this.#reauthAttempts++;

    const permanentCodes = [
      "HRV_TOKEN_INVALID", "HRV_TOKEN_EXPIRED",
      "HRV_TOKEN_REVOKED", "HRV_TOKEN_INACTIVE",
      "HRV_IP_DENIED", "HRV_ORIGIN_DENIED", "HRV_SIGNATURE_INVALID",
    ];

    const isPermanent = permanentCodes.includes(code) || this.#reauthAttempts >= MAX_REAUTH_ATTEMPTS;

    if (isPermanent) {
      this.#permanentFailure = true;
      for (const card of this.#cards.values()) {
        card.setErrorState?.("HRV_AUTH_FAILED");
      }
    }
    // Non-permanent failures: reconnect backoff handles retry.
  }

  #handleEntityDefinition(msg) {
    const entityId = msg.entity_id;
    const card = this.#cards.get(entityId);
    if (card) {
      card.receiveDefinition?.(msg);
    }
  }

  #handleStateUpdate(msg) {
    const entityId = msg.entity_id;
    const incoming = new Date(msg.last_updated);
    const existing = this.#entityStates.get(entityId);

    // Discard out-of-order updates unless this is an initial push.
    if (existing && !msg.initial && incoming <= existing.lastUpdated) {
      return;
    }

    // Merge delta attributes if not initial.
    let attributes;
    if (msg.initial || msg.attributes !== undefined) {
      attributes = msg.attributes ?? {};
    } else {
      attributes = { ...(existing?.attributes ?? {}) };
      if (msg.attributes_delta) {
        Object.assign(attributes, msg.attributes_delta.changed ?? {});
        for (const key of (msg.attributes_delta.removed ?? [])) {
          delete attributes[key];
        }
      }
    }

    this.#entityStates.set(entityId, { state: msg.state, attributes, lastUpdated: incoming });

    // Write to state cache (imported lazily to avoid circular deps at load time).
    try {
      StateCache.write(this.#tokenId, entityId, msg.state, attributes);
    } catch {
      // StateCache may not be available in all build configurations.
    }

    const card = this.#cards.get(entityId);
    card?.receiveStateUpdate?.(msg.state, attributes, msg.last_updated);

    for (const listener of this.#stateListeners) {
      try { listener(entityId, msg.state, attributes); } catch { /* ignore */ }
    }
  }

  #handleEntityRemoved(msg) {
    const entityId = msg.entity_id;
    const card = this.#cards.get(entityId);
    card?.setErrorState?.("HRV_ENTITY_REMOVED");
  }

  #handleHistoryData(msg) {
    const entityId = msg.entity_id;
    const card = this.#cards.get(entityId);
    card?.receiveHistoryData?.(msg.history ?? []);
  }

  #handleSubscribeOk(_msg) {
    // Subscribe acknowledged - no action needed; entity_definition follows.
    console.debug("[HArvest] subscribe_ok received");
  }

  #handleSessionExpiring(_msg) {
    // The session is about to expire. Attempt renewal unless limits are reached.
    const now = new Date();

    const absoluteExpired = this.#absoluteExpiresAt && now >= this.#absoluteExpiresAt;
    const renewalLimitReached = this.#maxRenewals !== null && this.#renewalCount >= this.#maxRenewals;

    if (absoluteExpired || renewalLimitReached) {
      // Full re-auth required.
      console.debug("[HArvest] Session limit reached - performing full re-auth");
      this.#sessionId = null;
      this.#ws?.close();
      return;
    }

    // Send renew.
    this.#sendJson({
      type: "renew",
      session_id: this.#sessionId,
      token_id: this.#tokenId,
      msg_id: this.#nextMsgId(),
    });
    this.#renewalCount++;
    // Server responds with auth_ok + entity_definition + state_update for all entities.
  }

  #handleAck(msg) {
    // Generic command acknowledgement - cards can hook into this via receiveAck.
    const card = this.#cards.get(msg.entity_id);
    card?.receiveAck?.(msg);
  }

  #handleError(msg) {
    const code = msg.code ?? "HRV_UNKNOWN";
    console.warn("[HArvest] Server error:", code, msg.message ?? "");

    // Route to the affected card if entity_id is present.
    if (msg.entity_id) {
      const card = this.#cards.get(msg.entity_id);
      card?.receiveError?.(code);
    } else {
      // Session-level error: broadcast to all cards.
      for (const card of this.#cards.values()) {
        card.receiveError?.(code);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Crypto
  // -------------------------------------------------------------------------

  /**
   * Build an HMAC-SHA256 hex signature for the auth payload.
   * Payload format: "{token_id}:{timestamp}:{nonce}"
   *
   * @param {number} timestamp - Unix seconds
   * @param {string} nonce     - Random hex nonce
   * @returns {Promise<string>} - Lowercase hex string
   */
  async #buildHmacSignature(timestamp, nonce) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.#tokenSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const data = new TextEncoder().encode(`${this.#tokenId}:${timestamp}:${nonce}`);
    const sig = await crypto.subtle.sign("HMAC", key, data);
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Generate a 16-character random hex nonce.
   * @returns {string}
   */
  #generateNonce() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // -------------------------------------------------------------------------
  // Flood protection
  // -------------------------------------------------------------------------

  /**
   * Record a malformed message timestamp. Returns true if the flood limit is
   * exceeded, signalling that the connection should be closed.
   * @returns {boolean}
   */
  #trackMalformed() {
    const now = Date.now();
    this.#malformedTimestamps.push(now);
    // Purge entries outside the flood window.
    this.#malformedTimestamps = this.#malformedTimestamps.filter(
      (t) => now - t < HarvestClient.#FLOOD_WINDOW_MS,
    );
    if (this.#malformedTimestamps.length >= HarvestClient.#FLOOD_LIMIT) {
      console.warn("[HArvest] Flood protection triggered - closing connection");
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  /**
   * Serialise and send a JSON message on the WebSocket.
   * @param {object} payload
   */
  #sendJson(payload) {
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      try {
        this.#ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn("[HArvest] Failed to send message:", err);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// StateCache reference - resolved at call time to avoid circular imports.
// The real StateCache class is defined in state-cache.js and imported by the
// build entry point. Accessed here via a module-level lazy getter so that
// tree-shakers do not pull in the import unconditionally.
// ---------------------------------------------------------------------------

/** @type {any} */
let _StateCacheRef = null;

/** @returns {any} */
function _getStateCache() {
  return _StateCacheRef;
}

/**
 * Allow the build entry point to wire up the StateCache after both modules
 * have been evaluated.
 * @param {any} sc
 */
export function setStateCacheRef(sc) {
  _StateCacheRef = sc;
}

// Replace the placeholder used inside #handleStateUpdate with the real ref.
const StateCache = new Proxy(
  {},
  {
    get(_target, prop) {
      return _getStateCache()?.[prop];
    },
  },
);
