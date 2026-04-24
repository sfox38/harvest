/**
 * renderers/fan-card.js - Renderer for the "fan" domain.
 *
 * Renders a toggle button and, when the entity supports percentage speed,
 * a speed slider. The fan icon spins via CSS animation when the fan is on.
 * The spin animation respects prefers-reduced-motion (disabled by BaseCard's
 * shared styles).
 *
 * feature_config.speed_count is used only to display integer speed steps
 * in the aria-label; the slider always works in 0-100 percentage terms.
 */

import { BaseCard } from "./base-card.js";

const FAN_CARD_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    gap: var(--hrv-spacing-s);
  }

  [part=toggle-button] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
  }

  [part=toggle-button][aria-pressed=true] {
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
  }

  [part=toggle-button][aria-pressed=false] {
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
  }

  [part=toggle-button]:hover { opacity: 0.88; }
  [part=toggle-button]:active { opacity: 0.75; }
  [part=toggle-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=speed-slider] {
    width: 100%;
    accent-color: var(--hrv-color-primary);
    cursor: pointer;
  }

  .hrv-slider-label {
    display: flex;
    justify-content: space-between;
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    margin-bottom: 2px;
  }

  [part=oscillate-button] {
    width: 100%;
    padding: var(--hrv-spacing-xs) var(--hrv-spacing-s);
    border: 1px solid var(--hrv-color-border);
    border-radius: var(--hrv-radius-s);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
  }
  [part=oscillate-button][aria-pressed=true] {
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
  }
  [part=oscillate-button]:hover { opacity: 0.88; }
  [part=oscillate-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=preset-select],
  [part=direction-select] {
    width: 100%;
    padding: var(--hrv-spacing-xs) var(--hrv-spacing-s);
    border: 1px solid var(--hrv-color-border);
    border-radius: var(--hrv-radius-s);
    background: var(--hrv-color-surface);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    cursor: pointer;
  }

  /* Fan spin animation - only active when data-on=true and data-animate=true */
  [part=card-icon][data-on=true][data-animate=true] svg {
    animation: hrv-fan-spin 2s linear infinite;
    transform-origin: center;
  }

  @keyframes hrv-fan-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* Respects prefers-reduced-motion (already enforced by shared styles,
     but re-stated here for explicitness) */
  @media (prefers-reduced-motion: reduce) {
    [part=card-icon][data-on=true][data-animate=true] svg {
      animation: none;
    }
  }
`;

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class FanCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */ #toggleBtn     = null;
  /** @type {HTMLInputElement|null}  */ #speedSlider   = null;
  /** @type {HTMLElement|null}       */ #speedValue    = null;
  /** @type {HTMLElement|null}       */ #stateLabel    = null;
  /** @type {HTMLButtonElement|null} */ #oscillateBtn  = null;
  /** @type {HTMLSelectElement|null} */ #presetSelect  = null;
  /** @type {HTMLSelectElement|null} */ #directionSelect = null;
  /** @type {string}                 */ #lastState     = "";
  /** @type {object}                 */ #lastAttrs     = {};
  /** @type {Function}               */ #speedDebounce;

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#speedDebounce = this.debounce(this.#sendSpeed.bind(this), 300);
  }

  render() {
    const isWritable   = this.def.capabilities === "read-write";
    const hasSpeed     = this.def.supported_features?.includes("set_speed");
    const hasOscillate = this.def.supported_features?.includes("oscillate");
    const hasDirection = this.def.supported_features?.includes("direction");
    const hasPreset    = this.def.supported_features?.includes("preset_mode")
                      || (this.def.feature_config?.preset_modes?.length > 0);
    const presetModes  = this.def.feature_config?.preset_modes ?? [];
    const presetOptions = presetModes.map((m) => `<option value="${_esc(m)}">${_esc(m)}</option>`).join("");

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${FAN_CARD_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${isWritable ? `<button part="toggle-button" type="button"></button>` : ""}
          <span part="state-label"></span>
          ${isWritable && hasSpeed ? /* html */`
            <div>
              <div class="hrv-slider-label">
                <span>${_esc(this.i18n.t("fan.speed"))}</span>
                <span part="speed-value">-</span>
              </div>
              <input part="speed-slider" type="range" min="0" max="100"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.speed"))}">
            </div>
          ` : ""}
          ${isWritable && hasOscillate ? /* html */`
            <button part="oscillate-button" type="button" aria-pressed="false"
              aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.oscillate"))}">
              ${_esc(this.i18n.t("fan.oscillate"))}
            </button>
          ` : ""}
          ${isWritable && hasDirection ? /* html */`
            <div>
              <div class="hrv-slider-label"><span>${_esc(this.i18n.t("fan.direction"))}</span></div>
              <select part="direction-select" aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.direction"))}">
                <option value="forward">${_esc(this.i18n.t("fan.forward"))}</option>
                <option value="reverse">${_esc(this.i18n.t("fan.reverse"))}</option>
              </select>
            </div>
          ` : ""}
          ${isWritable && hasPreset && presetOptions ? /* html */`
            <div>
              <div class="hrv-slider-label"><span>${_esc(this.i18n.t("fan.preset"))}</span></div>
              <select part="preset-select" aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.preset"))}">
                ${presetOptions}
              </select>
            </div>
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#toggleBtn    = this.root.querySelector("[part=toggle-button]");
    this.#speedSlider  = this.root.querySelector("[part=speed-slider]");
    this.#speedValue   = this.root.querySelector("[part=speed-value]");
    this.#stateLabel   = this.root.querySelector("[part=state-label]");
    this.#oscillateBtn   = this.root.querySelector("[part=oscillate-button]");
    this.#directionSelect = this.root.querySelector("[part=direction-select]");
    this.#presetSelect   = this.root.querySelector("[part=preset-select]");

    this.renderIcon(this.resolveIcon(this.def.icon, "mdi:fan-off"), "card-icon");

    if (this.#toggleBtn) {
      this.#toggleBtn.addEventListener("click", () => {
        this.config.card?.sendCommand("toggle", {});
      });
    }

    if (this.#speedSlider) {
      this.#speedSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.#speedValue) this.#speedValue.textContent = `${val}%`;
        this.#speedDebounce(val);
      });
    }

    if (this.#oscillateBtn) {
      this.#oscillateBtn.addEventListener("click", () => {
        const isOsc = this.#oscillateBtn.getAttribute("aria-pressed") === "true";
        this.config.card?.sendCommand("oscillate", { oscillating: !isOsc });
      });
    }

    if (this.#directionSelect) {
      this.#directionSelect.addEventListener("change", (e) => {
        this.config.card?.sendCommand("set_direction", { direction: e.target.value });
      });
    }

    if (this.#presetSelect) {
      this.#presetSelect.addEventListener("change", (e) => {
        this.config.card?.sendCommand("set_preset_mode", { preset_mode: e.target.value });
      });
    }

    this.renderCompanions();
  }

  applyState(state, attributes) {
    this.#lastState = state;
    this.#lastAttrs = { ...attributes };
    const isOn          = state === "on";
    const isUnavailable = state === "unavailable" || state === "unknown";
    const label         = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`)
      : state;

    if (this.#stateLabel) this.#stateLabel.textContent = label;

    if (this.#toggleBtn) {
      this.#toggleBtn.textContent = this.i18n.t(isOn ? "state.on" : "state.off");
      this.#toggleBtn.setAttribute("aria-pressed", String(isOn));
      this.#toggleBtn.setAttribute(
        "aria-label",
        `${this.def.friendly_name} - ${this.i18n.t("action.toggle")}, ` +
        `${this.i18n.t("action.currently")} ${label}`,
      );
      this.#toggleBtn.disabled = isUnavailable;
    }

    if (this.#speedSlider && !this.isFocused(this.#speedSlider) && attributes.percentage !== undefined) {
      this.#speedSlider.value = String(attributes.percentage);
      if (this.#speedValue) this.#speedValue.textContent = `${attributes.percentage}%`;
    }

    if (this.#oscillateBtn) {
      const osc = !!attributes.oscillating;
      this.#oscillateBtn.setAttribute("aria-pressed", String(osc));
      this.#oscillateBtn.setAttribute("aria-label",
        `${this.def.friendly_name} - ${this.i18n.t("fan.oscillate")}, ${this.i18n.t("action.currently")} ${osc ? this.i18n.t("state.on") : this.i18n.t("state.off")}`);
      this.#oscillateBtn.disabled = isUnavailable;
    }

    if (this.#directionSelect && !this.isFocused(this.#directionSelect) && attributes.direction !== undefined) {
      this.#directionSelect.value = String(attributes.direction);
    }

    if (this.#presetSelect && !this.isFocused(this.#presetSelect) && attributes.preset_mode !== undefined) {
      this.#presetSelect.value = String(attributes.preset_mode);
    }

    const iconEl     = this.root.querySelector("[part=card-icon]");
    const domainDefault = isOn ? "mdi:fan" : "mdi:fan-off";
    const rawIcon    = this.def.icon_state_map?.[state]
      ?? this.def.icon_state_map?.["*"]
      ?? this.def.icon
      ?? domainDefault;
    this.renderIcon(this.resolveIcon(rawIcon, domainDefault), "card-icon");
    if (iconEl) {
      iconEl.setAttribute("data-on", String(isOn));
      iconEl.setAttribute("data-animate", String(!!this.config.animate));
    }

    this.announceState(`${this.def.friendly_name}, ${label}`);
  }

  predictState(action, data) {
    const attrs = { ...this.#lastAttrs };
    if (action === "toggle") {
      const isOn = this.#toggleBtn?.getAttribute("aria-pressed") === "true";
      return { state: isOn ? "off" : "on", attributes: attrs };
    }
    if (action === "set_percentage" && data.percentage !== undefined) {
      attrs.percentage = data.percentage;
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "oscillate" && data.oscillating !== undefined) {
      attrs.oscillating = data.oscillating;
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "set_direction" && data.direction) {
      attrs.direction = data.direction;
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "set_preset_mode" && data.preset_mode) {
      attrs.preset_mode = data.preset_mode;
      return { state: this.#lastState, attributes: attrs };
    }
    return null;
  }

  #sendSpeed(value) {
    this.config.card?.sendCommand("set_percentage", { percentage: value });
  }
}
