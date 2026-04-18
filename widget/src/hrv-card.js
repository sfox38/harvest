/**
 * hrv-card.js - <hrv-card> custom element.
 *
 * HrvCard is the main public-facing Web Component. It:
 *   - Resolves configuration from HTML attributes, a parent <hrv-group>,
 *     and HArvest.config() page-level defaults (in that priority order).
 *   - Registers with the HarvestClient singleton (50ms debounce on first card).
 *   - Renders a skeleton while connecting, then delegates to a BaseCard
 *     renderer once the entity_definition message arrives.
 *   - Applies optimistic UI on commands, reverting after 5s if no server
 *     confirmation arrives.
 *   - Handles stale-state display from the localStorage cache when offline.
 *
 * Usage (custom element mode):
 *   <hrv-card ha-url="https://ha.example.com" token="hwt_..."
 *             entity="light.bedroom_main"></hrv-card>
 *
 * Usage (alias mode):
 *   <hrv-card ha-url="https://ha.example.com" token="hwt_..."
 *             alias="dJ5x3Apd"></hrv-card>
 */

import { getOrCreateClient }   from "./harvest-client.js";
import { StateCache }           from "./state-cache.js";
import { applyErrorState }      from "./error-states.js";
import { ThemeLoader }          from "./theme-loader.js";
import { I18n }                 from "./i18n.js";
import { lookupRenderer }       from "./renderers/index.js";

// Page-level config set by HArvest.config(). Shared across all card instances.
// Exported so harvest-client.js and hrv-mount.js can call getPageConfig().
const _pageConfig = {};

export function config(options) {
  Object.assign(_pageConfig, options);
}

export function getPageConfig() {
  return _pageConfig;
}

// ---------------------------------------------------------------------------
// HrvCard
// ---------------------------------------------------------------------------

export class HrvCard extends HTMLElement {
  /** @type {object|null}  */ #client        = null;
  /** @type {object|null}  */ #renderer      = null;
  /** @type {string}       */ #entityId      = "";
  /** @type {string|null}  */ #alias         = null;
  /** @type {object[]}     */ #companions    = [];
  /** @type {object}       */ #config        = {};
  /** @type {string}       */ #currentState  = "HRV_CONNECTING";
  /** @type {object|null}  */ #optimisticState  = null;
  /** @type {ReturnType<typeof setTimeout>|null} */ #optimisticTimer = null;
  /** @type {object|null}  */ #i18n          = null;

  // -------------------------------------------------------------------------
  // Observed attributes
  // -------------------------------------------------------------------------

  static get observedAttributes() {
    return [
      "token", "ha-url", "entity", "alias", "companion",
      "on-offline", "on-error", "offline-text", "error-text",
      "tap-action", "hold-action", "double-tap-action",
      "show-history", "hours-to-show", "graph",
      "lang", "a11y", "theme-url", "theme",
    ];
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  connectedCallback() {
    this.#resolveConfig();
    this.#i18n = new I18n(this.#config.lang ?? "auto");

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    // Show connecting skeleton immediately.
    this.setErrorState("HRV_CONNECTING");

    // Validate required config before connecting.
    if (!this.#config.haUrl || !this.#config.tokenId) {
      console.error(
        "[HArvest] <hrv-card> missing required ha-url or token. " +
        "Set them as attributes, inside an <hrv-group>, or via HArvest.config().",
      );
      this.setErrorState("HRV_AUTH_FAILED");
      return;
    }

    if (!this.#entityId && !this.#alias) {
      console.error("[HArvest] <hrv-card> missing entity= or alias= attribute.");
      this.setErrorState("HRV_ENTITY_MISSING");
      return;
    }

    // Restore cached state for offline grace (renderer not available yet).
    const entityRef = this.#entityId || this.#alias;
    const cached = StateCache.read(this.#config.tokenId, entityRef);
    if (cached) {
      this.#optimisticState = cached;
    }

    // Register with the client singleton (may trigger 50ms debounce).
    this.#client = getOrCreateClient(
      this.#config.haUrl,
      this.#config.tokenId,
      this.#config.tokenSecret ?? null,
    );

    // Store a back-reference so renderers can call sendCommand via config.card.
    this.#config.card = this;

    this.#client.registerCard(entityRef, this);

    // Register companion entity IDs with the same client.
    for (const companion of this.#companions) {
      this.#client.registerCard(companion.entityId, companion.proxyCard);
    }
  }

  disconnectedCallback() {
    if (!this.#client) return;

    const entityRef = this.#entityId || this.#alias;
    this.#client.unregisterCard(entityRef);

    for (const companion of this.#companions) {
      this.#client.unregisterCard(companion.entityId);
    }

    // Remove dark-mode listener attached by ThemeLoader.
    if (this.shadowRoot) ThemeLoader.detach(this.shadowRoot);

    clearTimeout(this.#optimisticTimer);
    this.#optimisticTimer = null;
  }

  attributeChangedCallback(_name, oldVal, newVal) {
    // Re-resolve config when attributes change after mounting.
    // Skip if shadow root does not exist yet (called before connectedCallback).
    if (!this.shadowRoot || oldVal === newVal) return;
    this.#resolveConfig();
  }

  // -------------------------------------------------------------------------
  // Called by HarvestClient
  // -------------------------------------------------------------------------

  /**
   * Called when the entity_definition message arrives for this card's entity.
   * Attaches the correct renderer and replays any cached state.
   *
   * @param {object} def - EntityDefinition from server
   */
  receiveDefinition(def) {
    const RendererClass = lookupRenderer(def.domain, def.device_class ?? null);
    this.#renderer = new RendererClass(def, this.shadowRoot, this.#config, this.#i18n);
    this.#renderer.render();

    // Apply theme if configured.
    ThemeLoader.resolve(this.#config).then((theme) => {
      if (theme) ThemeLoader.apply(theme, this.shadowRoot);
    });

    // Replay cached state while waiting for the live state_update.
    if (this.#optimisticState) {
      this.#renderer.applyState(
        this.#optimisticState.state,
        this.#optimisticState.attributes,
      );
      this.setErrorState("HRV_STALE");
      this.#optimisticState = null;
    }
  }

  /**
   * Called when a state_update message arrives for this card's entity.
   *
   * @param {string} state
   * @param {object} attributes
   * @param {string} _lastUpdated - ISO 8601 timestamp (used by client for ordering)
   */
  receiveStateUpdate(state, attributes, _lastUpdated) {
    // Cancel any pending optimistic revert.
    if (this.#optimisticTimer) {
      clearTimeout(this.#optimisticTimer);
      this.#optimisticTimer = null;
    }

    // Reflect unavailable/unknown state as a host attribute so CSS can grey
    // out the card without requiring renderer cooperation.
    if (state === "unavailable") {
      this.setAttribute("data-harvest-avail", "unavailable");
      // Set label for the ::after overlay via data attribute on the card div.
      const card = this.shadowRoot?.querySelector("[part=card]");
      if (card) card.setAttribute("data-avail-label", "Unavailable");
    } else if (state === "unknown") {
      this.setAttribute("data-harvest-avail", "unknown");
      const card = this.shadowRoot?.querySelector("[part=card]");
      if (card) card.setAttribute("data-avail-label", "Unknown");
    } else {
      this.removeAttribute("data-harvest-avail");
    }

    if (this.#renderer) {
      requestAnimationFrame(() => {
        this.#renderer?.applyState(state, attributes);
      });
    }

    // Clear stale/offline indicator once live data arrives.
    if (this.#currentState !== "live") {
      this.setErrorState("live");
    }
  }

  /**
   * Called when a history_data message arrives.
   * @param {object[]} points
   */
  receiveHistoryData(points) {
    this.#renderer?.receiveHistoryData?.(points);
  }

  /**
   * Called when a server error message is routed to this card.
   * @param {string} code
   */
  receiveError(code) {
    const permanentCodes = new Set([
      "HRV_TOKEN_INVALID", "HRV_TOKEN_EXPIRED",
      "HRV_TOKEN_REVOKED",  "HRV_TOKEN_INACTIVE",
      "HRV_AUTH_FAILED",
    ]);
    const visibleCode = permanentCodes.has(code)
      ? "HRV_AUTH_FAILED"
      : code === "HRV_ENTITY_NOT_FOUND" ? "HRV_ENTITY_MISSING"
      : "HRV_STALE";
    this.setErrorState(visibleCode);
  }

  /**
   * Called when an ack message is routed to this card.
   * @param {object} _msg
   */
  receiveAck(_msg) {
    // No-op for now; renderers may hook into this in future.
  }

  /**
   * Apply an error/connection state code. Updates the data attribute and
   * visual treatment via applyErrorState().
   *
   * @param {string} code
   */
  setErrorState(code) {
    this.#currentState = code;
    if (this.shadowRoot) {
      applyErrorState(this, this.shadowRoot, code, this.#config, this.#i18n);
    }
  }

  // -------------------------------------------------------------------------
  // Command dispatch
  // -------------------------------------------------------------------------

  /**
   * Called by a companion proxy to forward a companion state update to the
   * renderer. The renderer's updateCompanionState() method handles the DOM
   * update inside the companion zone.
   *
   * @param {string} entityId
   * @param {string} state
   * @param {object} attributes
   */
  _receiveCompanionState(entityId, state, attributes) {
    this.#renderer?.updateCompanionState?.(entityId, state, attributes);
  }

  /**
   * Send a command to the integration via the client.
   * Applies an optimistic visual state if the renderer supports prediction.
   * Reverts after 5 seconds if no server confirmation arrives.
   *
   * @param {string} action
   * @param {object} data
   */
  sendCommand(action, data) {
    if (!this.#client) return;
    const msgId = this.#client.nextMsgId();

    // Optimistic UI.
    const predicted = this.#renderer?.predictState(action, data ?? {});
    if (predicted) {
      requestAnimationFrame(() => {
        this.#renderer?.applyState(predicted.state, predicted.attributes);
      });

      // Revert to cached state after 5s if no server update confirms.
      this.#optimisticTimer = setTimeout(() => {
        const entityRef = this.#entityId || this.#alias;
        const cached = StateCache.read(this.#config.tokenId, entityRef);
        if (cached && this.#renderer) {
          this.#renderer.applyState(cached.state, cached.attributes);
        }
        this.#optimisticTimer = null;
      }, 5000);
    }

    const entityRef = this.#entityId || this.#alias;
    this.#client.sendCommand(entityRef, action, data ?? {}, msgId);
  }

  // -------------------------------------------------------------------------
  // Config resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve configuration from (in priority order):
   *   1. HTML attributes on this element
   *   2. Parent <hrv-group> element attributes
   *   3. HArvest.config() page-level defaults
   *
   * entity= takes priority over alias= when both are present.
   */
  #resolveConfig() {
    const entityAttr = this.getAttribute("entity") ?? "";
    const aliasAttr  = this.getAttribute("alias")  ?? null;

    if (entityAttr && aliasAttr) {
      console.warn(
        "[HArvest] Both entity= and alias= are set on <hrv-card>. " +
        "entity= takes priority. Remove alias= to suppress this warning.",
      );
    }

    this.#entityId = entityAttr || "";
    this.#alias    = entityAttr ? null : aliasAttr;

    this.#config = {
      tokenId:      this.getAttribute("token")        ?? "",
      haUrl:        this.getAttribute("ha-url")       ?? "",
      tokenSecret:  this.getAttribute("token-secret") ?? null,
      entity:       entityAttr,
      alias:        this.#alias,
      entityRef:    entityAttr || aliasAttr || "",
      lang:         this.getAttribute("lang")         ?? "auto",
      themeUrl:     this.getAttribute("theme-url")    ?? null,
      theme:        this._parseJsonAttr("theme"),
      onOffline:    this.getAttribute("on-offline")   ?? "last-state",
      onError:      this.getAttribute("on-error")     ?? "message",
      offlineText:  this.getAttribute("offline-text") ?? "",
      errorText:    this.getAttribute("error-text")   ?? "",
      tapAction:    this._parseJsonAttr("tap-action")        ?? { action: "toggle" },
      holdAction:   this._parseJsonAttr("hold-action")       ?? null,
      doubleTapAction: this._parseJsonAttr("double-tap-action") ?? null,
      showHistory:  this.getAttribute("show-history") === "true",
      hoursToShow:  parseInt(this.getAttribute("hours-to-show") ?? "", 10) || 24,
      graph:        this.getAttribute("graph") ?? "line",
      a11y:         this.getAttribute("a11y") ?? "standard",
      companions:   this.#companions,
      card:         this,
    };

    this.#inheritFromGroup();
    this.#applyPageConfigFallbacks();
    this.#parseCompanions();
  }

  /**
   * Walk up the DOM to find the nearest <hrv-group> ancestor and inherit
   * any config values not already set by this card's own attributes.
   */
  #inheritFromGroup() {
    let ancestor = this.parentElement;
    while (ancestor) {
      if (ancestor.tagName?.toLowerCase() === "hrv-group") {
        if (!this.#config.tokenId) this.#config.tokenId = ancestor.getAttribute("token") ?? "";
        if (!this.#config.haUrl)   this.#config.haUrl   = ancestor.getAttribute("ha-url") ?? "";
        if (!this.#config.themeUrl) this.#config.themeUrl = ancestor.getAttribute("theme-url") ?? null;
        if (this.#config.lang === "auto") this.#config.lang = ancestor.getAttribute("lang") ?? "auto";
        break;
      }
      ancestor = ancestor.parentElement;
    }
  }

  /**
   * Fill remaining gaps from HArvest.config() page-level defaults.
   */
  #applyPageConfigFallbacks() {
    if (!this.#config.tokenId  && _pageConfig.token)    this.#config.tokenId  = _pageConfig.token;
    if (!this.#config.haUrl    && _pageConfig.haUrl)    this.#config.haUrl    = _pageConfig.haUrl;
    if (!this.#config.themeUrl && _pageConfig.themeUrl) this.#config.themeUrl = _pageConfig.themeUrl;
    if (this.#config.lang === "auto" && _pageConfig.lang) this.#config.lang   = _pageConfig.lang;
  }

  /**
   * Parse the companion= attribute into CompanionConfig objects.
   * Format: comma-separated entity IDs or aliases.
   * Companions use the same entity/alias convention as the card's primary ref.
   */
  #parseCompanions() {
    this.#companions = [];
    const raw = this.getAttribute("companion");
    if (!raw) return;

    for (const ref of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
      // Create a minimal proxy card to receive definition and state updates
      // for the companion entity. It shares this card's renderer via callbacks.
      const proxyCard = _makeCompanionProxy(ref, this);
      this.#companions.push({ entityId: ref, proxyCard });
    }

    // Update config.companions reference.
    this.#config.companions = this.#companions;
  }

  /**
   * Parse a JSON-valued attribute safely. Returns null on parse failure.
   * @param {string} name
   * @returns {any}
   */
  _parseJsonAttr(name) {
    const val = this.getAttribute(name);
    if (!val) return null;
    try { return JSON.parse(val); } catch { return null; }
  }
}

// ---------------------------------------------------------------------------
// Companion proxy
// ---------------------------------------------------------------------------

/**
 * Create a minimal object that impersonates an HrvCard for the purposes of
 * receiving entity_definition and state_update messages for a companion entity.
 * The proxy forwards state updates to the parent card's renderer.
 *
 * @param {string}  entityId   - The companion's entity reference
 * @param {HrvCard} parentCard - The owning card
 * @returns {object}
 */
function _makeCompanionProxy(entityId, parentCard) {
  return {
    receiveDefinition(_def) {
      // Companion definitions are not currently used to instantiate a renderer;
      // the parent renderer's renderCompanions() handles companion display.
    },
    receiveStateUpdate(state, attributes, _lastUpdated) {
      parentCard._receiveCompanionState(entityId, state, attributes);
    },
    receiveError(_code) {
      // Companion errors are silently ignored; they do not affect the parent card.
    },
    setErrorState(_code) {
      // No-op for companion proxy.
    },
  };
}

// Register the custom element.
customElements.define("hrv-card", HrvCard);
