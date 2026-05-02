/**
 * renderers/fan-card.js - Renderer for the "fan" domain.
 *
 * For continuous-speed fans: toggle button + percentage slider.
 * For stepped fans without presets: toggle button + stepped slider (snaps to steps).
 * For stepped fans with presets (cycle fans, typically IR): toggle button + cycle
 * button that advances through speed steps via set_percentage, plus feature buttons
 * whose visual state is always "on" since IR fans have no reliable state feedback.
 *
 * The fan icon spins via CSS animation when the fan is on, respecting
 * prefers-reduced-motion.
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
    background: var(--hrv-color-state-off);
    color: var(--hrv-color-text);
  }

  [part=toggle-button]:hover { opacity: 0.88; }
  [part=toggle-button]:active,
  [part=toggle-button][data-pressing=true] { opacity: 0.65; filter: brightness(1.15); }
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

  [part=cycle-button] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
  }
  [part=cycle-button]:hover { opacity: 0.88; }
  [part=cycle-button]:active,
  [part=cycle-button][data-pressing=true] { opacity: 0.65; filter: brightness(1.15); }
  [part=cycle-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=oscillate-button] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
  }
  [part=oscillate-button][aria-pressed=true] {
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
  }
  [part=oscillate-button]:hover { opacity: 0.88; }
  [part=oscillate-button]:active,
  [part=oscillate-button][data-pressing=true] { opacity: 0.65; filter: brightness(1.15); }
  [part=oscillate-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=preset-button] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
  }
  [part=preset-button][aria-pressed=true] {
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
  }
  [part=preset-button]:hover { opacity: 0.88; }
  [part=preset-button]:active,
  [part=preset-button][data-pressing=true] { opacity: 0.65; filter: brightness(1.15); }
  [part=preset-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=direction-select] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    cursor: pointer;
  }

  [part=card][data-readonly=true] [part=card-body] {
    align-items: center;
    justify-content: center;
  }

  [part=card][data-readonly=true] [part=state-label] {
    font-size: var(--hrv-font-size-l);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
    text-align: center;
  }

  [part=card-icon][data-on=true][data-animate=true] svg {
    animation: hrv-fan-spin 2s linear infinite;
    transform-origin: center;
  }

  @keyframes hrv-fan-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class FanCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */ #toggleBtn       = null;
  /** @type {HTMLInputElement|null}  */ #speedSlider     = null;
  /** @type {HTMLElement|null}       */ #speedValue      = null;
  /** @type {HTMLButtonElement|null} */ #cycleBtn        = null;
  /** @type {HTMLElement|null}       */ #stateLabel      = null;
  /** @type {HTMLButtonElement|null} */ #oscillateBtn    = null;
  /** @type {HTMLButtonElement|null} */ #presetBtn       = null;
  /** @type {HTMLSelectElement|null} */ #directionSelect = null;
  /** @type {string}                 */ #lastState       = "";
  /** @type {object}                 */ #lastAttrs       = {};
  /** @type {number}                 */ #percentage      = 0;
  /** @type {boolean}                */ #isOn            = false;
  /** @type {string|null}            */ #presetMode      = null;
  /** @type {Function}               */ #speedDebounce;

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#speedDebounce = this.debounce(this.#sendSpeed.bind(this), 300);
  }

  get #percentageStep() {
    const fc = this.def.feature_config;
    if (fc?.percentage_step > 1) return fc.percentage_step;
    if (fc?.speed_count > 1)     return 100 / fc.speed_count;
    return 1;
  }
  get #isStepped()  { return this.#percentageStep > 1; }
  get #isCycleFan() { return this.#isStepped && (this.def.feature_config?.preset_modes?.length > 0); }
  get #speedSteps() {
    const step = this.#percentageStep;
    const steps = [];
    for (let i = 1; i * step <= 100.001; i++) {
      steps.push(Math.floor(i * step * 10) / 10);
    }
    return steps;
  }

  render() {
    const isWritable   = this.def.capabilities === "read-write";
    const hasOscillate = this.def.supported_features?.includes("oscillate");
    const hasDirection = this.def.supported_features?.includes("direction");
    const hasPreset    = this.def.supported_features?.includes("preset_mode")
                      || (this.def.feature_config?.preset_modes?.length > 0);
    const presetModes  = this.def.feature_config?.preset_modes ?? [];
    const step         = this.#percentageStep;

    const displayMode  = this.config.displayHints?.display_mode ?? null;
    let hasSpeed       = this.def.supported_features?.includes("set_speed");
    let isCycle        = this.#isCycleFan;

    if (displayMode === "on-off")      { hasSpeed = false; }
    else if (displayMode === "continuous") { isCycle = false; }
    else if (displayMode === "stepped")   { isCycle = false; }
    else if (displayMode === "cycle")     { isCycle = true; }

    let speedHTML = "";
    if (isWritable && hasSpeed) {
      if (isCycle) {
        speedHTML = /* html */`
          <button part="cycle-button" type="button"
            aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.speed"))}">
            ${_esc(this.i18n.t("fan.speed"))}
          </button>`;
      } else {
        const stepAttr = this.#isStepped ? ` step="${step}"` : "";
        speedHTML = /* html */`
          <div>
            <div class="hrv-slider-label">
              <span>${_esc(this.i18n.t("fan.speed"))}</span>
              <span part="speed-value">-</span>
            </div>
            <input part="speed-slider" type="range" min="0" max="100"${stepAttr}
              aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.speed"))}">
          </div>`;
      }
    }

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${FAN_CARD_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${isWritable ? `<button part="toggle-button" type="button"></button>` : ""}
          ${!isWritable ? `<span part="state-label"></span>` : ""}
          ${speedHTML}
          ${isWritable && hasOscillate ? /* html */`
            <button part="oscillate-button" type="button"
              aria-pressed="${isCycle ? "true" : "false"}"
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
          ${isWritable && hasPreset && presetModes.length ? /* html */`
            <button part="preset-button" type="button" aria-pressed="${isCycle ? "true" : "false"}"
              aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("fan.preset"))}">
              ${_esc(this.i18n.t("fan.preset"))}
            </button>
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#toggleBtn     = this.root.querySelector("[part=toggle-button]");
    this.#speedSlider   = this.root.querySelector("[part=speed-slider]");
    this.#speedValue    = this.root.querySelector("[part=speed-value]");
    this.#cycleBtn      = this.root.querySelector("[part=cycle-button]");
    this.#stateLabel    = this.root.querySelector("[part=state-label]");
    this.#oscillateBtn  = this.root.querySelector("[part=oscillate-button]");
    this.#presetBtn     = this.root.querySelector("[part=preset-button]");
    this.#directionSelect = this.root.querySelector("[part=direction-select]");

    if (!isWritable) {
      this.root.querySelector("[part=card]")?.setAttribute("data-readonly", "true");
    }

    this.renderIcon(this.resolveIcon(this.def.icon, "mdi:fan-off"), "card-icon");

    this._attachGestureHandlers(this.#toggleBtn, {
      onTap: () => {
        const tap = this.config.gestureConfig?.tap;
        if (tap) { this._runAction(tap); return; }
        this.config.card?.sendCommand(this.#isOn ? "turn_off" : "turn_on", {});
      },
    });

    if (this.#speedSlider) {
      this.#speedSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.#speedValue) this.#speedValue.textContent = `${val}%`;
        this.#speedDebounce(val);
      });
    }

    if (this.#cycleBtn) {
      this.#cycleBtn.addEventListener("click", () => {
        const steps = this.#speedSteps;
        if (!steps.length) return;
        let nextPct;
        if (!this.#isOn || this.#percentage === 0) {
          nextPct = steps[0];
        } else {
          const nextIdx = steps.findIndex(s => s > this.#percentage);
          nextPct = nextIdx === -1 ? steps[0] : steps[nextIdx];
        }
        this.#percentage = nextPct;
        this.config.card?.sendCommand("set_percentage", { percentage: nextPct });
      });
    }

    if (this.#oscillateBtn) {
      this.#oscillateBtn.addEventListener("click", () => {
        if (isCycle) {
          this.config.card?.sendCommand("oscillate", { oscillating: !this.#lastAttrs.oscillating });
        } else {
          const isOsc = this.#oscillateBtn.getAttribute("aria-pressed") === "true";
          this.config.card?.sendCommand("oscillate", { oscillating: !isOsc });
        }
      });
    }

    if (this.#directionSelect) {
      this.#directionSelect.addEventListener("change", (e) => {
        this.config.card?.sendCommand("set_direction", { direction: e.target.value });
      });
    }

    if (this.#presetBtn) {
      this.#presetBtn.addEventListener("click", () => {
        const presets = presetModes;
        if (!presets.length) return;
        if (isCycle) {
          const mode = this.#presetMode ?? presets[0];
          this.config.card?.sendCommand("set_preset_mode", { preset_mode: mode });
        } else if (!this.#presetMode) {
          this.config.card?.sendCommand("set_preset_mode", { preset_mode: presets[0] });
        } else {
          const idx = presets.indexOf(this.#presetMode);
          if (idx === -1 || idx === presets.length - 1) {
            const step = this.#percentageStep;
            const pct = Math.floor(this.#percentage / step) * step || step;
            this.config.card?.sendCommand("set_percentage", { percentage: pct });
          } else {
            this.config.card?.sendCommand("set_preset_mode", { preset_mode: presets[idx + 1] });
          }
        }
      });
    }

    this.root.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("pointerdown", () => btn.setAttribute("data-pressing", "true"));
      btn.addEventListener("pointerup",   () => btn.removeAttribute("data-pressing"));
      btn.addEventListener("pointerleave",() => btn.removeAttribute("data-pressing"));
      btn.addEventListener("pointercancel",()=> btn.removeAttribute("data-pressing"));
    });

    this.renderCompanions();
  }

  applyState(state, attributes) {
    this.#lastState  = state;
    this.#lastAttrs  = { ...attributes };
    this.#isOn       = state === "on";
    this.#presetMode = attributes.preset_mode ?? null;
    if (attributes.percentage !== undefined) this.#percentage = attributes.percentage;

    const isUnavailable = state === "unavailable" || state === "unknown";
    const label = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`)
      : state;

    if (this.#stateLabel) this.#stateLabel.textContent = label;

    if (this.#toggleBtn) {
      this.#toggleBtn.textContent = this.i18n.t(this.#isOn ? "state.on" : "state.off");
      this.#toggleBtn.setAttribute("aria-pressed", String(this.#isOn));
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

    if (this.#cycleBtn) {
      this.#cycleBtn.disabled = isUnavailable;
    }

    if (this.#oscillateBtn) {
      if (this.#isCycleFan) {
        this.#oscillateBtn.setAttribute("aria-pressed", "true");
      } else {
        const osc = !!attributes.oscillating;
        this.#oscillateBtn.setAttribute("aria-pressed", String(osc));
        this.#oscillateBtn.setAttribute("aria-label",
          `${this.def.friendly_name} - ${this.i18n.t("fan.oscillate")}, ` +
          `${this.i18n.t("action.currently")} ${osc ? this.i18n.t("state.on") : this.i18n.t("state.off")}`);
      }
      this.#oscillateBtn.disabled = isUnavailable;
    }

    if (this.#directionSelect && !this.isFocused(this.#directionSelect) && attributes.direction !== undefined) {
      this.#directionSelect.value = String(attributes.direction);
    }

    if (this.#presetBtn) {
      const active = this.#isCycleFan || !!this.#presetMode;
      this.#presetBtn.setAttribute("aria-pressed", String(active));
      this.#presetBtn.textContent = this.#presetMode
        ?? (this.def.feature_config?.preset_modes?.[0] ?? this.i18n.t("fan.preset"));
      this.#presetBtn.disabled = isUnavailable;
    }

    const iconEl = this.root.querySelector("[part=card-icon]");
    const domainDefault = this.#isOn ? "mdi:fan" : "mdi:fan-off";
    const rawIcon = this.def.icon_state_map?.[state]
      ?? this.def.icon_state_map?.["*"]
      ?? this.def.icon
      ?? domainDefault;
    this.renderIcon(this.resolveIcon(rawIcon, domainDefault), "card-icon");
    if (iconEl) {
      iconEl.setAttribute("data-on", String(this.#isOn));
      iconEl.setAttribute("data-animate", String(!!this.config.animate));
    }

    this.announceState(`${this.def.friendly_name}, ${label}`);
  }

  predictState(action, data) {
    const attrs = { ...this.#lastAttrs };
    if (action === "turn_on")  return { state: "on",  attributes: attrs };
    if (action === "turn_off") return { state: "off", attributes: attrs };
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
