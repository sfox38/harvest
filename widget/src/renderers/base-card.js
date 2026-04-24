/**
 * renderers/base-card.js - Abstract base class for all HArvest card renderers.
 *
 * Every Tier 1 renderer extends BaseCard and must implement:
 *   render()      - Build the initial shadow DOM HTML structure.
 *   applyState()  - Update the DOM to reflect new entity state + attributes.
 *
 * Optionally override:
 *   predictState() - Return an optimistic EntityState for a given command,
 *                    or null to skip optimistic UI for that action.
 *
 * Shared helpers provided:
 *   renderIcon()           - Inject an MDI SVG into a [part] slot.
 *   renderCompanionZoneHTML() - Return the companion zone placeholder HTML.
 *   renderCompanions()     - Populate the companion zone with live data.
 *   getSharedStyles()      - Return the common CSS block every renderer needs.
 *   debounce()             - Create a debounced wrapper around a function.
 *   setAriaLabel()         - Set aria-label on an element.
 */

import { renderIconSVG, resolveIcon as _resolveIcon, MDI_ICONS } from "../icons.js";
import { getErrorStateStyles } from "../error-states.js";

// ---------------------------------------------------------------------------
// Shared CSS custom property defaults
// These values are overridden by the theme system (ThemeLoader.apply()) when
// a theme-url or inline theme is configured. They serve as safe fallbacks
// when no theme is applied, targeting a clean neutral appearance.
// ---------------------------------------------------------------------------

const SHARED_CSS_VARS = /* css */`
  :host {
    /* Layout */
    --hrv-spacing-xs:  4px;
    --hrv-spacing-s:   8px;
    --hrv-spacing-m:   16px;
    --hrv-spacing-l:   24px;

    /* Border radius */
    --hrv-radius-s:    4px;
    --hrv-radius-m:    8px;
    --hrv-radius-l:    12px;

    /* Typography */
    --hrv-font-size-xs: 11px;
    --hrv-font-size-s:  13px;
    --hrv-font-size-m:  15px;
    --hrv-font-size-l:  18px;
    --hrv-font-weight-normal: 400;
    --hrv-font-weight-medium: 500;
    --hrv-font-weight-bold:   700;
    --hrv-font-family: system-ui, -apple-system, sans-serif;

    /* Colours - light mode defaults */
    --hrv-color-primary:       #6366f1;
    --hrv-color-primary-dim:   #e0e7ff;
    --hrv-color-on-primary:    #ffffff;
    --hrv-color-surface:       #ffffff;
    --hrv-color-surface-alt:   #f3f4f6;
    --hrv-color-border:        #e5e7eb;
    --hrv-color-text:          #111827;
    --hrv-color-text-secondary:#6b7280;
    --hrv-color-text-inverse:  #ffffff;
    --hrv-color-warning:       #f59e0b;
    --hrv-color-error:         #ef4444;
    --hrv-color-success:       #22c55e;
    --hrv-color-icon:          #374151;

    /* State colours */
    --hrv-color-state-on:      #f59e0b;
    --hrv-color-state-off:     #9ca3af;
    --hrv-color-state-unavailable: #d1d5db;

    /* Card */
    --hrv-card-padding:        var(--hrv-spacing-m);
    --hrv-card-radius:         var(--hrv-radius-l);
    --hrv-card-shadow:         0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    --hrv-card-background:     var(--hrv-color-surface);

    /* Icon */
    --hrv-icon-size:           24px;

    /* Transition */
    --hrv-transition-speed:    150ms;

    display: block;
    position: relative;
    font-family: var(--hrv-font-family);
  }

  /* Dark mode overrides - applied when no explicit theme is set */
  @media (prefers-color-scheme: dark) {
    :host {
      --hrv-color-surface:       #1f2937;
      --hrv-color-surface-alt:   #374151;
      --hrv-color-border:        #374151;
      --hrv-color-text:          #f9fafb;
      --hrv-color-text-secondary:#9ca3af;
      --hrv-color-icon:          #d1d5db;
      --hrv-color-primary-dim:   #312e81;
    }
  }

  /* Reduced motion: disable all transitions and animations */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

const CARD_BASE_CSS = /* css */`
  [part=card] {
    background: var(--hrv-card-background);
    border-radius: var(--hrv-card-radius);
    box-shadow: var(--hrv-card-shadow);
    padding: var(--hrv-card-padding);
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
  }

  [part=card-header] {
    display: flex;
    align-items: center;
    gap: var(--hrv-spacing-s);
    margin-bottom: var(--hrv-spacing-s);
  }

  [part=card-icon] {
    width: var(--hrv-icon-size);
    height: var(--hrv-icon-size);
    flex-shrink: 0;
    color: var(--hrv-color-icon);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  [part=card-icon] svg {
    width: 100%;
    height: 100%;
  }

  [part=card-name] {
    font-size: var(--hrv-font-size-m);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
  }

  [part=companion-zone] {
    margin-top: var(--hrv-spacing-s);
    display: flex;
    flex-wrap: wrap;
    gap: var(--hrv-spacing-xs);
    border-top: 1px solid var(--hrv-color-border);
    padding-top: var(--hrv-spacing-s);
  }

  [part=companion-zone]:empty {
    display: none;
  }

  [part=stale-indicator] {
    display: none;
  }

  /* Unavailable / unknown state overlay */
  :host([data-harvest-avail=unavailable]) [part=card],
  :host([data-harvest-avail=unknown]) [part=card] {
    pointer-events: none;
    user-select: none;
  }

  :host([data-harvest-avail=unavailable]) [part=card]::after,
  :host([data-harvest-avail=unknown]) [part=card]::after {
    content: attr(data-avail-label);
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--hrv-font-size-s, 13px);
    color: var(--hrv-color-overlay-text, #ffffff);
    background: var(--hrv-color-overlay, rgba(0, 0, 0, 0.7));
    border-radius: inherit;
    z-index: 10;
    pointer-events: none;
  }
`;

// ---------------------------------------------------------------------------
// History graph CSS
// ---------------------------------------------------------------------------

const HISTORY_CSS = /* css */`
  [part=history-graph] {
    margin-top: var(--hrv-spacing-s);
    width: 100%;
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  [part=history-graph]:empty {
    display: none;
  }

  [part=history-svg] {
    width: 100%;
    height: 48px;
    display: block;
  }

  [part=history-empty] {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
  }
`;

// ---------------------------------------------------------------------------
// BaseCard
// ---------------------------------------------------------------------------

export class BaseCard {
  /** @type {object} */ def;
  /** @type {ShadowRoot} */ root;
  /** @type {object} */ config;
  /** @type {object} */ i18n;
  /** @type {Map<string,string>} */ #iconCache = new Map();

  /**
   * @param {object}     def    - EntityDefinition from server
   * @param {ShadowRoot} root   - The card's shadow root
   * @param {object}     config - Resolved CardConfig
   * @param {object}     i18n   - I18n instance
   */
  constructor(def, root, config, i18n) {
    this.def    = def;
    this.root   = root;
    this.config = config;
    this.i18n   = i18n;
  }

  // -------------------------------------------------------------------------
  // Abstract interface - subclasses must implement
  // -------------------------------------------------------------------------

  /**
   * Build the initial shadow DOM structure. Called once when the entity
   * definition arrives. Must populate this.root with all required elements.
   */
  render() {
    throw new Error(`${this.constructor.name} must implement render()`);
  }

  /**
   * Update the DOM to reflect new entity state and attributes. Called on
   * every state_update message and after optimistic UI reverts.
   *
   * @param {string} _state
   * @param {object} _attributes
   */
  applyState(_state, _attributes) {
    throw new Error(`${this.constructor.name} must implement applyState()`);
  }

  // -------------------------------------------------------------------------
  // Optional override
  // -------------------------------------------------------------------------

  /**
   * Return a predicted EntityState for the given command so the card can
   * apply an optimistic visual update before the server confirms. Return null
   * to skip optimistic UI for this action.
   *
   * @param {string} _action
   * @param {object} _data
   * @returns {{ state: string, attributes: object } | null}
   */
  predictState(_action, _data) {
    return null;
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  /**
   * Render an MDI icon SVG into the element identified by [part=partName].
   * Replaces whatever is currently inside that element. No-op if the element
   * is not found in the shadow root.
   *
   * @param {string} iconName  - MDI icon name, e.g. "mdi:lightbulb"
   * @param {string} partName  - value of the part="" attribute on the container
   */
  renderIcon(iconName, partName) {
    if (this.#iconCache.get(partName) === iconName) return;
    this.#iconCache.set(partName, iconName);
    const container = this.root.querySelector(`[part=${partName}]`);
    if (!container) return;
    container.innerHTML = renderIconSVG(iconName, `${partName}-svg`);
  }

  /**
   * Return true if element currently has focus within this card's shadow root.
   * Use this guard before programmatically updating interactive controls in
   * applyState() to avoid dismissing open dropdowns or cancelling user input.
   *
   * @param {HTMLElement|null} element
   * @returns {boolean}
   */
  isFocused(element) {
    return !!element && this.root.activeElement === element;
  }

  /**
   * Return name if it exists in the MDI bundle, otherwise return fallback.
   * Prevents the generic help-circle from showing when a custom HA icon name
   * is not bundled.
   *
   * @param {string} name     - MDI icon name, e.g. "mdi:lightbulb-on-outline"
   * @param {string} fallback - bundled fallback, e.g. "mdi:lightbulb"
   * @returns {string}
   */
  resolveIcon(name, fallback) {
    return _resolveIcon(name, fallback);
  }

  /**
   * Set aria-label on an element. Convenience wrapper.
   *
   * @param {HTMLElement} el
   * @param {string}      label
   */
  setAriaLabel(el, label) {
    if (el) el.setAttribute("aria-label", label);
  }

  /**
   * Return the HTML placeholder for the companion zone. Include this in the
   * template returned by render() so renderCompanions() has somewhere to write.
   *
   * @returns {string}
   */
  renderCompanionZoneHTML() {
    if (!this.config.companions?.length) return "";
    return `<div part="companion-zone" role="group" aria-label="Companion devices"></div>`;
  }

  /**
   * Populate [part=companion-zone] with a compact icon+state widget for each
   * companion entity. Companions with "read" capability never get tap actions.
   * Call this at the end of render().
   */
  renderCompanions() {
    const zone = this.root.querySelector("[part=companion-zone]");
    if (!zone || !this.config.companions?.length) return;

    zone.innerHTML = "";

    for (const companion of this.config.companions) {
      const pill = document.createElement("div");
      pill.className = "hrv-companion";
      pill.setAttribute("part", "companion");
      pill.setAttribute("data-entity", companion.entityId);

      if (companion.capabilities === "read-write") {
        this.#makeCompanionInteractive(pill, companion.entityId);
      }

      const iconWrap = document.createElement("span");
      iconWrap.setAttribute("part", "companion-icon");
      iconWrap.innerHTML = renderIconSVG("mdi:help-circle", "companion-icon-svg");

      const stateEl = document.createElement("span");
      stateEl.setAttribute("part", "companion-state");
      stateEl.className = "hrv-companion__state";

      pill.appendChild(iconWrap);
      pill.appendChild(stateEl);
      zone.appendChild(pill);
    }
  }

  /**
   * Called when a companion's entity_definition arrives. Updates the pill's
   * icon and marks it interactive if the companion is read-write.
   *
   * @param {string} entityId
   * @param {object} def
   */
  updateCompanionDefinition(entityId, def) {
    const pill = this.root.querySelector(`[part=companion][data-entity="${CSS.escape(entityId)}"]`);
    if (!pill) return;

    if (def.icon) {
      const iconWrap = pill.querySelector("[part=companion-icon]");
      if (iconWrap) iconWrap.innerHTML = renderIconSVG(def.icon, "companion-icon-svg");
    }

    if ((def.capabilities ?? "read") === "read-write" && !pill.hasAttribute("data-interactive")) {
      this.#makeCompanionInteractive(pill, entityId);
    }
  }

  /**
   * Mark a companion pill as interactive and attach a toggle click handler.
   *
   * @param {HTMLElement} pill
   * @param {string} entityId
   */
  #makeCompanionInteractive(pill, entityId) {
    pill.setAttribute("data-interactive", "true");
    pill.setAttribute("role", "button");
    pill.setAttribute("tabindex", "0");
    pill.addEventListener("click", () => {
      this.config.card?._sendCompanionCommand(entityId, "toggle", {});
    });
    pill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.config.card?._sendCompanionCommand(entityId, "toggle", {});
      }
    });
  }

  /**
   * Update a companion's displayed state. Called by HrvCard when a state
   * update arrives for a companion entity ID.
   *
   * @param {string} entityId
   * @param {string} state
   * @param {object} _attributes
   */
  updateCompanionState(entityId, state, _attributes) {
    const pill = this.root.querySelector(`[part=companion][data-entity="${CSS.escape(entityId)}"]`);
    if (!pill) return;
    const stateEl = pill.querySelector("[part=companion-state]");
    if (stateEl) stateEl.textContent = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`)
      : state;
  }

  /**
   * Return the CSS string that every renderer must include in its shadow DOM
   * <style> tag. Contains: CSS custom property defaults, card base layout,
   * companion zone, stale indicator, skeleton, and message overlay styles.
   *
   * @returns {string}
   */
  getSharedStyles() {
    return SHARED_CSS_VARS + CARD_BASE_CSS + getErrorStateStyles() + COMPANION_CSS + HISTORY_CSS;
  }

  /**
   * Create a debounced version of fn that delays execution by ms milliseconds.
   * The timer resets on each call. Useful for slider input events.
   *
   * @param {Function} fn
   * @param {number}   ms
   * @returns {Function}
   */
  debounce(fn, ms) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn(...args); }, ms);
    };
  }

  // -------------------------------------------------------------------------
  // History graph
  // -------------------------------------------------------------------------

  /**
   * Return HTML placeholder for the history graph zone. Include in render()
   * templates between card-body and companion-zone.
   *
   * @returns {string}
   */
  renderHistoryZoneHTML() {
    if (!this.config.graph) return "";
    return `<div part="history-graph" aria-label="History graph"></div>`;
  }

  /** @type {Array<{t:number, s:number}>} */ #historyPoints = [];
  /** @type {number} */ #historyHours = 24;
  /** @type {string} */ #historyGraphType = "line";

  /**
   * Called when history_data arrives from the server.
   *
   * @param {Array<{t:string, s:string}>} points
   * @param {number} hours
   * @param {string} graphType - "line" or "bar"
   */
  receiveHistoryData(points, hours, graphType) {
    this.#historyHours = hours || 24;
    this.#historyGraphType = graphType || "line";

    this.#historyPoints = [];
    for (const p of points) {
      let v = parseFloat(p.s);
      if (isNaN(v)) {
        const lower = String(p.s).toLowerCase();
        if (lower === "on" || lower === "true" || lower === "home") v = 1;
        else if (lower === "off" || lower === "false" || lower === "not_home") v = 0;
        else continue;
      }
      this.#historyPoints.push({ t: new Date(p.t).getTime(), s: v });
    }

    this.#renderHistoryGraph();
  }

  /**
   * Append a live state_update value to the history graph.
   *
   * @param {string} stateValue
   */
  appendHistoryPoint(stateValue) {
    const v = parseFloat(stateValue);
    if (isNaN(v)) return;
    if (this.#historyPoints.length === 0) return;

    const now = Date.now();
    this.#historyPoints.push({ t: now, s: v });

    const cutoff = now - this.#historyHours * 3600_000;
    while (this.#historyPoints.length > 0 && this.#historyPoints[0].t < cutoff) {
      this.#historyPoints.shift();
    }

    this.#renderHistoryGraph();
  }

  #renderHistoryGraph() {
    const zone = this.root.querySelector("[part=history-graph]");
    if (!zone) return;

    if (this.#historyPoints.length < 2) {
      zone.innerHTML = `<span part="history-empty">${this.i18n.t("history.unavailable")}</span>`;
      return;
    }

    const W = 280;
    const H = 60;
    const PAD_X = 0;
    const PAD_Y = 4;

    const pts = this.#historyPoints;
    const tMin = pts[0].t;
    const tMax = pts[pts.length - 1].t;
    const tRange = tMax - tMin || 1;

    let sMin = Infinity;
    let sMax = -Infinity;
    for (const p of pts) {
      if (p.s < sMin) sMin = p.s;
      if (p.s > sMax) sMax = p.s;
    }
    const sRange = sMax - sMin || 1;

    const scaleX = (t) => PAD_X + ((t - tMin) / tRange) * (W - 2 * PAD_X);
    const scaleY = (s) => (H - PAD_Y) - ((s - sMin) / sRange) * (H - 2 * PAD_Y);

    if (this.#historyGraphType === "step") {
      zone.innerHTML = this.#renderStepGraph(pts, W, H, scaleX, scaleY);
    } else if (this.#historyGraphType === "bar") {
      zone.innerHTML = this.#renderBarGraph(pts, W, H, scaleX, scaleY, sMin);
    } else {
      zone.innerHTML = this.#renderLineGraph(pts, W, H, scaleX, scaleY);
    }
  }

  #renderLineGraph(pts, W, H, scaleX, scaleY) {
    const coords = pts.map(p => `${scaleX(p.t).toFixed(1)},${scaleY(p.s).toFixed(1)}`);
    const polyline = coords.join(" ");

    const first = pts[0];
    const last = pts[pts.length - 1];
    const fillCoords = [
      ...coords,
      `${scaleX(last.t).toFixed(1)},${H}`,
      `${scaleX(first.t).toFixed(1)},${H}`,
    ].join(" ");

    return `<svg part="history-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polygon points="${fillCoords}" fill="var(--hrv-color-primary)" opacity="0.1"/>
      <polyline points="${polyline}" fill="none" stroke="var(--hrv-color-primary)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  #renderBarGraph(pts, W, H, scaleX, scaleY, sMin) {
    const gap = 1;
    const totalGaps = (pts.length - 1) * gap;
    const barWidth = Math.max(2, (W - totalGaps) / pts.length);
    const baseline = H;
    let bars = "";
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const x = i * (barWidth + gap);
      const y = scaleY(p.s);
      const h = baseline - y;
      if (h > 0.5) {
        bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" fill="var(--hrv-color-primary)" opacity="0.6" rx="1"/>`;
      }
    }
    return `<svg part="history-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg>`;
  }

  #renderStepGraph(pts, W, H, scaleX, scaleY) {
    let path = "";
    for (let i = 0; i < pts.length; i++) {
      const x = scaleX(pts[i].t);
      const y = scaleY(pts[i].s);
      if (i === 0) {
        path += `M${x.toFixed(1)},${y.toFixed(1)}`;
      } else {
        path += ` H${x.toFixed(1)} V${y.toFixed(1)}`;
      }
    }
    const lastX = scaleX(pts[pts.length - 1].t);
    path += ` H${W.toFixed(1)}`;

    const fillPath = path + ` V${H} H${scaleX(pts[0].t).toFixed(1)} Z`;

    return `<svg part="history-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path d="${fillPath}" fill="var(--hrv-color-primary)" opacity="0.1"/>
      <path d="${path}" fill="none" stroke="var(--hrv-color-primary)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }
}

// ---------------------------------------------------------------------------
// Companion pill CSS (separate constant for readability)
// ---------------------------------------------------------------------------

const COMPANION_CSS = /* css */`
  .hrv-companion {
    display: inline-flex;
    align-items: center;
    gap: var(--hrv-spacing-xs);
    padding: 2px var(--hrv-spacing-s);
    border-radius: var(--hrv-radius-s);
    background: var(--hrv-color-surface-alt);
    cursor: default;
    transition: background var(--hrv-transition-speed);
  }

  .hrv-companion[data-interactive=true] {
    cursor: pointer;
  }

  .hrv-companion[data-interactive=true]:hover {
    background: var(--hrv-color-primary-dim);
  }

  [part=companion-icon] {
    width: 16px;
    height: 16px;
    color: var(--hrv-color-icon);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  [part=companion-icon] svg {
    width: 100%;
    height: 100%;
  }

  .hrv-companion__state {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
  }
`;
