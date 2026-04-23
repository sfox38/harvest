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
  /** @type {HTMLButtonElement|null} */ #toggleBtn   = null;
  /** @type {HTMLInputElement|null}  */ #speedSlider  = null;
  /** @type {HTMLElement|null}       */ #speedValue   = null;
  /** @type {HTMLElement|null}       */ #stateLabel   = null;
  /** @type {Function}               */ #speedDebounce;

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#speedDebounce = this.debounce(this.#sendSpeed.bind(this), 300);
  }

  render() {
    const isWritable  = this.def.capabilities === "read-write";
    const hasSpeed    = this.def.supported_features?.includes("set_speed");

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
                <span>Speed</span>
                <span part="speed-value">-</span>
              </div>
              <input part="speed-slider" type="range" min="0" max="100"
                aria-label="Fan speed">
            </div>
          ` : ""}
        </div>
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#toggleBtn  = this.root.querySelector("[part=toggle-button]");
    this.#speedSlider = this.root.querySelector("[part=speed-slider]");
    this.#speedValue  = this.root.querySelector("[part=speed-value]");
    this.#stateLabel  = this.root.querySelector("[part=state-label]");

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

    this.renderCompanions();
  }

  applyState(state, attributes) {
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
  }

  predictState(action, _data) {
    if (action !== "toggle") return null;
    const isOn = this.#toggleBtn?.getAttribute("aria-pressed") === "true";
    return { state: isOn ? "off" : "on", attributes: {} };
  }

  #sendSpeed(value) {
    this.config.card?.sendCommand("set_percentage", { percentage: value });
  }
}
