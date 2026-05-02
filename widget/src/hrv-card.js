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
// Color scheme resolution
// ---------------------------------------------------------------------------

function _resolveColorScheme(cs) {
  if (cs === "light" || cs === "dark") return cs;
  const meta = document.querySelector('meta[name="color-scheme"]');
  const metaVal = meta?.getAttribute("content")?.trim().toLowerCase() || "";
  if (metaVal === "light" || metaVal === "only light") return "light";
  if (metaVal === "dark" || metaVal === "only dark") return "dark";
  const htmlCS = document.documentElement.style.colorScheme || "";
  if (htmlCS === "light") return "light";
  if (htmlCS === "dark") return "dark";
  const computed = getComputedStyle(document.documentElement).colorScheme || "";
  if (computed === "light") return "light";
  if (computed === "dark") return "dark";
  return "auto";
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
  /** @type {object|null}  */ #entityDef     = null;
  /** @type {string|null}  */ #lastState     = null;
  /** @type {object|null}  */ #lastAttributes = null;
  /** @type {Map<string, {state:string, attributes:object}>} */ #lastCompanionStates = new Map();
  /** @type {Map<string, object>} */ #lastCompanionDefs   = new Map();
  /** @type {{points:object[], hours:number}|null} */ #lastHistoryData = null;
  /** @type {object|null} */ #lastTheme = null;

  // -------------------------------------------------------------------------
  // Observed attributes
  // -------------------------------------------------------------------------

  static get observedAttributes() {
    return ["token", "ha-url", "entity", "alias", "token-secret"];
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  connectedCallback() {
    this.#resolveConfig();
    this.#i18n = new I18n(this.#config.lang ?? "auto");

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    // Stamp data-color-scheme so the base-card CSS fallback can force light/dark.
    // Read directly from _pageConfig too in case HArvest.config() was called
    // before this element connected (common script loading order).
    const cs = _resolveColorScheme(this.#config.colorScheme || _pageConfig.colorScheme || "");
    if (cs === "light" || cs === "dark") {
      this.setAttribute("data-color-scheme", cs);
    } else {
      this.removeAttribute("data-color-scheme");
    }

    // Preview mode: attach shadow DOM but skip WebSocket connection.
    // State is injected via setPreview() after mount.
    if (this.hasAttribute("preview")) {
      this.#config.card = this;
      return;
    }

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
    this.#entityDef = def;

    // Apply server-side config from entity_definition.
    this.#config.gestureConfig = def.gesture_config ?? {};
    const hints = def.display_hints ?? {};
    this.#config.graph = hints.graph ?? null;
    this.#config.hours = hints.hours ?? 24;
    this.#config.period = hints.period ?? 10;
    this.#config.animate = !!hints.animate;
    this.#config.colorScheme = def.color_scheme ?? "auto";
    this.#config.displayHints = hints;

    // Reflect per-entity color scheme on the host element and re-apply theme.
    const csNow = _resolveColorScheme(this.#config.colorScheme || _pageConfig.colorScheme || "");
    if (csNow === "light" || csNow === "dark") {
      this.setAttribute("data-color-scheme", csNow);
    } else {
      this.removeAttribute("data-color-scheme");
    }
    if (this.#lastTheme && this.shadowRoot) {
      ThemeLoader.apply(this.#lastTheme, this.shadowRoot, csNow);
    }

    // Reconcile companion proxies from server-delivered list.
    const newCompanionRefs = def.companions ?? [];
    const oldRefs = new Set(this.#companions.map((c) => c.entityId));
    const newRefs = new Set(newCompanionRefs);

    for (const comp of this.#companions) {
      if (!newRefs.has(comp.entityId)) {
        this.#client?.unregisterCard(comp.entityId);
      }
    }

    const kept = this.#companions.filter((c) => newRefs.has(c.entityId));
    const keptIds = new Set(kept.map((c) => c.entityId));
    this.#companions = [...kept];
    for (const ref of newCompanionRefs) {
      if (!keptIds.has(ref)) {
        const proxyCard = _makeCompanionProxy(ref, this);
        this.#companions.push({ entityId: ref, proxyCard, capabilities: null, domain: null });
        this.#client?.registerCardPassive(ref, proxyCard);
      }
    }
    this.#config.companions = this.#companions;

    const RendererClass = this.#client?._getPackRenderer?.(def.domain, def.device_class ?? null)
      || lookupRenderer(def.domain, def.device_class ?? null);
    this.#renderer = new RendererClass(def, this.shadowRoot, this.#config, this.#i18n);
    this.#renderer.render();

    // Replay last known state so the card is not blank after a re-definition.
    if (this.#lastState !== null) {
      this.#renderer.applyState(this.#lastState, this.#lastAttributes);
    } else if (this.#optimisticState) {
      this.#renderer.applyState(
        this.#optimisticState.state,
        this.#optimisticState.attributes,
      );
      this.#optimisticState = null;
    }

    // Replay companion definitions then states so friendly names appear in tooltips.
    for (const [entityId, compDef] of this.#lastCompanionDefs) {
      this.#renderer.updateCompanionDefinition?.(entityId, compDef);
    }
    for (const [entityId, { state, attributes }] of this.#lastCompanionStates) {
      this.#renderer.updateCompanionState?.(entityId, state, attributes);
    }

    if (this.#config.graph) {
      if (this.#lastHistoryData) {
        this.#renderer.receiveHistoryData?.(
          this.#lastHistoryData.points,
          this.#lastHistoryData.hours,
          this.#config.graph,
        );
      }
      if (this.#client) {
        const entityRef = this.#entityId || this.#alias;
        this.#client.requestHistory(entityRef);
      }
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
    this.#lastState = state;
    this.#lastAttributes = attributes;
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
      if (this.#config.graph && state !== "unavailable" && state !== "unknown") {
        this.#renderer.appendHistoryPoint?.(state);
      }
    }

    // Clear stale/offline indicator once live data arrives.
    if (this.#currentState !== "live") {
      this.setErrorState("live");
    }
  }

  /**
   * Called when a history_data message arrives.
   * @param {object[]} points
   * @param {number} hours
   */
  receiveHistoryData(points, hours) {
    this.#lastHistoryData = { points, hours };
    this.#renderer?.receiveHistoryData?.(points, hours, this.#config.graph);
  }

  /**
   * Called when the server pushes a theme update for this token.
   * @param {object} theme - { variables, dark_variables }
   */
  receiveTheme(theme) {
    this.#lastTheme = theme || null;
    if (!this.shadowRoot) return;
    if (theme) {
      const cs = _resolveColorScheme(this.#config.colorScheme || _pageConfig.colorScheme || "");
      ThemeLoader.apply(theme, this.shadowRoot, cs);
    } else {
      ThemeLoader.detach(this.shadowRoot);
      /** @type {HTMLElement} */ (this.shadowRoot.host).style.cssText = "";
    }
  }

  /**
   * Called when a token_config message arrives (token-level display settings).
   * @param {object} config
   */
  receiveTokenConfig(config) {
    this.#config.lang = config.lang ?? "auto";
    this.#config.a11y = config.a11y ?? "standard";
    this.#config.onOffline = config.onOffline ?? "last-state";
    this.#config.onError = config.onError ?? "message";
    this.#config.offlineText = config.offlineText ?? "";
    this.#config.errorText = config.errorText ?? "";
    const newScheme = config.colorScheme ?? "auto";
    const schemeChanged = newScheme !== this.#config.colorScheme;
    this.#config.colorScheme = newScheme;
    if (schemeChanged) {
      const cs = _resolveColorScheme(this.#config.colorScheme || _pageConfig.colorScheme || "");
      if (cs === "light" || cs === "dark") {
        this.setAttribute("data-color-scheme", cs);
      } else {
        this.removeAttribute("data-color-scheme");
      }
      if (this.#lastTheme && this.shadowRoot) {
        ThemeLoader.apply(this.#lastTheme, this.shadowRoot, cs);
      }
    }
    if (this.#i18n) {
      this.#i18n = new I18n(this.#config.lang);
    }
    this.#rebuildRenderer();
  }

  #rebuildRenderer() {
    if (!this.#entityDef || !this.#renderer) return;
    this.#renderer.destroy?.();
    const Cls = this.#client?._getPackRenderer?.(this.#entityDef.domain, this.#entityDef.device_class ?? null)
      || lookupRenderer(this.#entityDef.domain, this.#entityDef.device_class ?? null);
    this.#renderer = new Cls(this.#entityDef, this.shadowRoot, this.#config, this.#i18n);
    this.#renderer.render();
    if (this.#lastState !== null) {
      this.#renderer.applyState(this.#lastState, this.#lastAttributes);
    }
    for (const [entityId, def] of this.#lastCompanionDefs) {
      this.#renderer.updateCompanionDefinition?.(entityId, def);
    }
    for (const [entityId, { state, attributes }] of this.#lastCompanionStates) {
      this.#renderer.updateCompanionState?.(entityId, state, attributes);
    }
    if (this.#lastHistoryData && this.#config.graph) {
      this.#renderer.receiveHistoryData?.(
        this.#lastHistoryData.points,
        this.#lastHistoryData.hours,
        this.#config.graph,
      );
    }
  }

  _reRender() {
    if (!this.#entityDef || !this.#renderer) return;
    const NewRenderer = this.#client?._getPackRenderer?.(this.#entityDef.domain, this.#entityDef.device_class ?? null)
      || lookupRenderer(this.#entityDef.domain, this.#entityDef.device_class ?? null);
    if (NewRenderer === this.#renderer.constructor) return;
    this.#renderer.destroy?.();
    this.#renderer = new NewRenderer(this.#entityDef, this.shadowRoot, this.#config, this.#i18n);
    this.#renderer.render();
    if (this.#lastState !== null) {
      this.#renderer.applyState(this.#lastState, this.#lastAttributes);
    }
    for (const [entityId, def] of this.#lastCompanionDefs) {
      this.#renderer.updateCompanionDefinition?.(entityId, def);
    }
    for (const [entityId, { state, attributes }] of this.#lastCompanionStates) {
      this.#renderer.updateCompanionState?.(entityId, state, attributes);
    }
    if (this.#lastHistoryData && this.#config.graph) {
      this.#renderer.receiveHistoryData?.(
        this.#lastHistoryData.points,
        this.#lastHistoryData.hours,
        this.#config.graph,
      );
    }
  }

  /**
   * Called when a server error message is routed to this card.
   * @param {string} code
   */
  receiveError(code) {
    const permanentCodes = new Set([
      "HRV_TOKEN_INVALID", "HRV_TOKEN_EXPIRED",
      "HRV_TOKEN_REVOKED",
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
  receiveAck(msg) {
    console.warn(
      `[HArvest] ack: ${msg?.entity_id} success=${msg?.success}`,
      msg?.success ? "" : `${msg?.error_code} ${msg?.error_message ?? ""}`,
    );
  }

  /**
   * Apply an error/connection state code. Updates the data attribute and
   * visual treatment via applyErrorState().
   *
   * @param {string} code
   */
  setErrorState(code) {
    this.#currentState = code;
    if (code === "live") this.setAttribute("data-harvest-was-live", "");
    if (this.shadowRoot) {
      applyErrorState(this, this.shadowRoot, code, this.#config, this.#i18n);
    }
  }

  // -------------------------------------------------------------------------
  // Preview mode
  // -------------------------------------------------------------------------

  /**
   * Render a card in preview mode with provided entity data and theme vars.
   * Bypasses WebSocket - the card renders exactly as it would live but with
   * injected state. Interactive controls use optimistic UI (local-only).
   *
   * @param {object}   entityDef  - EntityDefinition (domain, friendly_name, capabilities, supported_features, feature_config, icon)
   * @param {string}   state      - Entity state ("on", "off", "22.4", etc.)
   * @param {object}   attributes - Entity attributes ({brightness: 180, ...})
   * @param {object}   [themeVars] - CSS custom properties to apply
   */
  setPreview(entityDef, state, attributes, themeVars, packId, graphType = null, animate = false) {
    if (!this.shadowRoot) return;

    // Force read-write unless entityDef says otherwise.
    if (!entityDef.capabilities) entityDef.capabilities = "read-write";

    // Apply display config before render() so the history zone is included in the DOM
    // and animate is available to applyState().
    const hints = entityDef.display_hints ?? {};
    if (graphType) this.#config.graph = graphType;
    else if (hints.graph) this.#config.graph = hints.graph;
    this.#config.animate = animate || !!hints.animate;
    this.#config.colorScheme = entityDef.color_scheme ?? "auto";
    this.#config.displayHints = hints;

    // Set up preview companions before render() so renderCompanionZoneHTML() creates the zone.
    const previewComps = entityDef.preview_companions ?? [];
    this.#companions = previewComps.map((c) => ({
      entityId: c.entity_id,
      proxyCard: null,
      capabilities: c.capabilities ?? "read",
      domain: c.domain ?? (c.entity_id ?? "").split(".")[0],
    }));
    this.#config.companions = this.#companions;

    // Check pack renderer first, then fall back to global registry.
    let RendererClass = null;
    if (packId) {
      const pack = window.HArvest?._packs?.[packId];
      if (pack) {
        const dc = entityDef.device_class ?? null;
        const specificKey = dc ? `${entityDef.domain}.${dc}` : null;
        RendererClass = (specificKey && pack[specificKey]) || pack[entityDef.domain] || null;
      }
    }
    if (!RendererClass) RendererClass = lookupRenderer(entityDef.domain, entityDef.device_class ?? null);
    this.#renderer = new RendererClass(entityDef, this.shadowRoot, this.#config, this.#i18n);
    this.#renderer.render();

    // Apply state.
    this.#renderer.applyState(state, attributes);

    // In preview mode, always show controls regardless of entity state (fan off, cover closed, etc.)
    // so the user can see the full card layout when editing settings.
    if (this.shadowRoot) {
      for (const shell of this.shadowRoot.querySelectorAll(".ndl-controls-shell")) {
        shell.setAttribute("data-collapsed", "false");
      }
    }

    this.setErrorState("live");

    // Apply theme CSS variables to the shadow host.
    if (themeVars) {
      this.applyPreviewTheme(themeVars);
    }
  }

  /**
   * Update only the theme CSS variables on a preview card without
   * re-rendering the card structure.
   *
   * @param {object} themeVars - CSS custom properties object
   */
  applyPreviewTheme(themeVars) {
    if (!this.shadowRoot) return;
    const host = this.shadowRoot.host;
    // Wipe all inline styles so no var from the previous theme lingers
    // when the incoming theme does not define that property.
    host.style.cssText = "";
    for (const [key, value] of Object.entries(themeVars)) {
      host.style.setProperty(key, String(value));
    }
  }

  /**
   * Update only the entity state on a preview card.
   *
   * @param {string} state
   * @param {object} attributes
   */
  updatePreviewState(state, attributes) {
    if (this.#renderer) {
      this.#renderer.applyState(state, attributes);
    }
  }

  // -------------------------------------------------------------------------
  // Command dispatch
  // -------------------------------------------------------------------------

  /**
   * Called by a companion proxy when the companion's entity_definition arrives.
   * Stores capabilities/domain on the companion config and forwards to the
   * renderer so it can mark the pill as interactive.
   *
   * @param {string} entityId
   * @param {object} def
   */
  _receiveCompanionDefinition(entityId, def) {
    const comp = this.#companions.find((c) => c.entityId === entityId);
    if (comp) {
      comp.capabilities = def.capabilities ?? "read";
      comp.domain = def.domain ?? entityId.split(".")[0];
    }
    this.#lastCompanionDefs.set(entityId, def);
    this.#renderer?.updateCompanionDefinition?.(entityId, def);
  }

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
    this.#lastCompanionStates.set(entityId, { state, attributes });
    this.#renderer?.updateCompanionState?.(entityId, state, attributes);
  }

  /**
   * Send a command for a companion entity via the shared client.
   *
   * @param {string} entityId
   * @param {string} action
   * @param {object} data
   */
  _sendCompanionCommand(entityId, action, data) {
    if (!this.#client) return;
    const msgId = this.#client.nextMsgId();
    this.#client.sendCommand(entityId, action, data ?? {}, msgId);
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
    // Preview mode: apply optimistic UI only, no server call.
    if (this.hasAttribute("preview")) {
      const predicted = this.#renderer?.predictState(action, data ?? {});
      if (predicted) {
        requestAnimationFrame(() => {
          this.#renderer?.applyState(predicted.state, predicted.attributes);
        });
      }
      return;
    }

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
      lang:         "auto",
      themeUrl:     null,
      theme:        null,
      onOffline:    "last-state",
      onError:      "message",
      offlineText:  "",
      errorText:    "",
      gestureConfig: {},
      graph:        null,
      hours:        24,
      period:       10,
      animate:      false,
      a11y:         "standard",
      companions:   this.#companions,
      card:         this,
    };

    this.#inheritFromGroup();
    this.#applyPageConfigFallbacks();
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
        if (!this.#config.tokenSecret) this.#config.tokenSecret = ancestor.getAttribute("token-secret") ?? null;
        break;
      }
      ancestor = ancestor.parentElement;
    }
  }

  /**
   * Fill remaining gaps from HArvest.config() page-level defaults.
   */
  #applyPageConfigFallbacks() {
    if (!this.#config.tokenId    && _pageConfig.token)       this.#config.tokenId    = _pageConfig.token;
    if (!this.#config.haUrl      && _pageConfig.haUrl)       this.#config.haUrl      = _pageConfig.haUrl;
    if (!this.#config.tokenSecret && _pageConfig.tokenSecret) this.#config.tokenSecret = _pageConfig.tokenSecret;
    if (!this.#config.colorScheme && _pageConfig.colorScheme) this.#config.colorScheme = _pageConfig.colorScheme;
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
    receiveDefinition(def) {
      parentCard._receiveCompanionDefinition(entityId, def);
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

if (!customElements.get("hrv-card")) {
  customElements.define("hrv-card", HrvCard);
}
