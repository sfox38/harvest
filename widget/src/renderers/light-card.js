/**
 * renderers/light-card.js - Renderer for the "light" domain.
 *
 * Renders a card with:
 *   - Entity name and icon (updates icon based on icon_state_map or state)
 *   - Toggle button (read-write capability only)
 *   - State label
 *   - Brightness slider (when supported_features includes "brightness")
 *   - Colour temperature slider (when supported_features includes "color_temp")
 *   - Companion zone
 *
 * Slider inputs are debounced at 300ms to avoid flooding the server with
 * turn_on commands while the user is dragging.
 *
 * predictState() handles the "toggle" action for optimistic UI: it flips
 * the current on/off state immediately while the command is in flight.
 */

import { BaseCard } from "./base-card.js";

// Light-specific CSS
const LIGHT_CARD_STYLES = /* css */`
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
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed);
  }

  [part=toggle-button]:hover { opacity: 0.88; }
  [part=toggle-button]:active,
  [part=toggle-button][data-pressing=true] { opacity: 0.65; filter: brightness(1.15); }

  [part=toggle-button][aria-pressed=true] {
    background: var(--hrv-color-state-on);
  }

  [part=toggle-button][aria-pressed=false] {
    background: var(--hrv-color-state-off);
    color: var(--hrv-color-text);
  }

  [part=brightness-slider],
  [part=color-temp-slider] {
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

  [part=color-slider] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 16px;
    border-radius: 8px;
    background: linear-gradient(
      to right,
      hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%),
      hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%),
      hsl(360,100%,50%)
    );
    cursor: pointer;
    border: 1px solid var(--hrv-color-border, rgba(0,0,0,0.1));
    outline: none;
  }
  [part=color-slider]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0,0,0,0.3);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  [part=color-slider]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0,0,0,0.3);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  [part=card-icon] svg {
    transition: color var(--hrv-transition-speed);
  }

  :host([data-harvest-state=live]) [part=card-icon][data-on=true] {
    color: var(--hrv-color-state-on);
  }

  :host([data-harvest-state=live]) [part=card-icon][data-on=false] {
    color: var(--hrv-color-state-off);
  }
`;

// ---------------------------------------------------------------------------
// Colour conversion helpers
// ---------------------------------------------------------------------------

function _rgbToHue(r, g, b) {
  // Returns hue 0-360 from an RGB triplet (0-255 each).
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

export class LightCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */   #toggleBtn         = null;
  /** @type {HTMLInputElement|null}  */   #brightnessSlider  = null;
  /** @type {HTMLInputElement|null}  */   #colorTempSlider   = null;
  /** @type {HTMLInputElement|null}  */   #colorSlider       = null;
  /** @type {HTMLElement|null}       */   #stateLabel        = null;
  /** @type {HTMLElement|null}       */   #brightnessValue   = null;
  /** @type {HTMLElement|null}       */   #colorTempValue    = null;
  /** @type {object}                 */   #lastAttrs         = {};
  /** @type {Function}               */   #brightnessDebounce;
  /** @type {Function}               */   #colorTempDebounce;
  /** @type {Function}               */   #colorDebounce;

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#brightnessDebounce = this.debounce(this.#sendBrightness.bind(this), 300);
    this.#colorTempDebounce  = this.debounce(this.#sendColorTemp.bind(this), 300);
    this.#colorDebounce      = this.debounce(this.#sendHue.bind(this), 300);
  }

  render() {
    const isWritable    = this.def.capabilities === "read-write";
    const hasBrightness = this.def.supported_features?.includes("brightness");
    const hasColorTemp  = this.def.supported_features?.includes("color_temp");
    const hasColor      = this.def.supported_features?.includes("rgb_color");
    // Kelvin range - HA 2022.5+ uses color_temp_kelvin; default 2000-6500K.
    const minCt         = this.def.feature_config?.min_color_temp_kelvin ?? 2000;
    const maxCt         = this.def.feature_config?.max_color_temp_kelvin ?? 6500;

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${LIGHT_CARD_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${isWritable ? /* html */`
            <button part="toggle-button" type="button"></button>
          ` : ""}
          <span part="state-label"></span>
          ${isWritable && hasBrightness ? /* html */`
            <div>
              <div class="hrv-slider-label">
                <span>${_esc(this.i18n.t("light.brightness"))}</span>
                <span part="brightness-value">-</span>
              </div>
              <input part="brightness-slider" type="range" min="0" max="255"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("light.brightness"))}">
            </div>
          ` : ""}
          ${isWritable && hasColor ? /* html */`
            <div data-hrv-slider="color">
              <div class="hrv-slider-label">
                <span>${_esc(this.i18n.t("light.color"))}</span>
              </div>
              <input part="color-slider" type="range" min="0" max="360"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("light.color"))}">
            </div>
          ` : ""}
          ${isWritable && hasColorTemp ? /* html */`
            <div data-hrv-slider="temp">
              <div class="hrv-slider-label">
                <span>${_esc(this.i18n.t("light.color_temp"))}</span>
                <span part="color-temp-value">-</span>
              </div>
              <input part="color-temp-slider" type="range"
                min="${minCt}" max="${maxCt}"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("light.color_temp"))}">
            </div>
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    // Cache element references.
    this.#toggleBtn        = this.root.querySelector("[part=toggle-button]");
    this.#brightnessSlider = this.root.querySelector("[part=brightness-slider]");
    this.#colorTempSlider  = this.root.querySelector("[part=color-temp-slider]");
    this.#colorSlider      = this.root.querySelector("[part=color-slider]");
    this.#stateLabel       = this.root.querySelector("[part=state-label]");
    this.#brightnessValue  = this.root.querySelector("[part=brightness-value]");
    this.#colorTempValue   = this.root.querySelector("[part=color-temp-value]");

    // Initial icon.
    this.renderIcon(this.resolveIcon(this.def.icon, "mdi:lightbulb"), "card-icon");

    // Wire up events.
    if (this.#toggleBtn) {
      this.#toggleBtn.addEventListener("click", () => {
        this.config.card?.sendCommand("toggle", {});
      });
    }

    if (this.#brightnessSlider) {
      this.#brightnessSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.#brightnessValue) {
          this.#brightnessValue.textContent =
            `${Math.round((val / 255) * 100)}%`;
        }
        this.#brightnessDebounce(val);
      });
    }

    if (this.#colorTempSlider) {
      this.#colorTempSlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        if (this.#colorTempValue) {
          this.#colorTempValue.textContent = `${val}K`;
        }
        this.#colorTempDebounce(val);
      });
    }

    if (this.#colorSlider) {
      this.#colorSlider.addEventListener("input", (e) => {
        this.#colorDebounce(parseInt(e.target.value, 10));
      });
    }

    if (this.#toggleBtn) {
      this.#toggleBtn.addEventListener("pointerdown",  () => this.#toggleBtn.setAttribute("data-pressing", "true"));
      this.#toggleBtn.addEventListener("pointerup",    () => this.#toggleBtn.removeAttribute("data-pressing"));
      this.#toggleBtn.addEventListener("pointerleave", () => this.#toggleBtn.removeAttribute("data-pressing"));
      this.#toggleBtn.addEventListener("pointercancel",() => this.#toggleBtn.removeAttribute("data-pressing"));
    }

    this.renderCompanions();
  }

  applyState(state, attributes) {
    this.#lastAttrs = { ...attributes };
    const isOn = state === "on";
    const isUnavailable = state === "unavailable" || state === "unknown";

    // Toggle button.
    if (this.#toggleBtn) {
      const label = this.i18n.t(isOn ? "state.on" : "state.off");
      this.#toggleBtn.textContent = label;
      this.#toggleBtn.setAttribute("aria-pressed", String(isOn));
      this.#toggleBtn.setAttribute(
        "aria-label",
        `${this.def.friendly_name} - ${this.i18n.t("action.toggle")}, ` +
        `${this.i18n.t("action.currently")} ${label}`,
      );
      this.#toggleBtn.disabled = isUnavailable;
    }

    // State label (shown for read-only capability).
    if (this.#stateLabel) {
      this.#stateLabel.textContent = this.i18n.t(`state.${state}`) !== `state.${state}`
        ? this.i18n.t(`state.${state}`)
        : state;
    }

    // Brightness slider.
    if (this.#brightnessSlider && !this.isFocused(this.#brightnessSlider) && attributes.brightness !== undefined) {
      this.#brightnessSlider.value = String(attributes.brightness);
      if (this.#brightnessValue) {
        this.#brightnessValue.textContent =
          `${Math.round((attributes.brightness / 255) * 100)}%`;
      }
    }

    // Color slider - update hue from hs_color or rgb_color attribute.
    if (this.#colorSlider && !this.isFocused(this.#colorSlider)) {
      let hue = null;
      if (attributes.hs_color) {
        hue = Math.round(attributes.hs_color[0]);
      } else if (attributes.rgb_color) {
        hue = _rgbToHue(...attributes.rgb_color);
      }
      if (hue !== null) this.#colorSlider.value = String(hue);
    }

    // Colour temperature slider - use Kelvin (HA 2022.5+).
    // Fall back to converting mireds if kelvin attribute absent.
    if (this.#colorTempSlider && !this.isFocused(this.#colorTempSlider)) {
      let ctK = null;
      if (attributes.color_temp_kelvin !== undefined) {
        ctK = attributes.color_temp_kelvin;
      } else if (attributes.color_temp !== undefined && attributes.color_temp > 0) {
        ctK = Math.round(1_000_000 / attributes.color_temp);
      }
      if (ctK !== null) {
        this.#colorTempSlider.value = String(ctK);
        if (this.#colorTempValue) {
          this.#colorTempValue.textContent = `${ctK}K`;
        }
      }
    }

    // Dim the inactive slider based on the light's current color_mode.
    // Color temp modes: "color_temp". All others (hs, rgb, xy, etc.) are color modes.
    const colorDiv = this.root.querySelector('[data-hrv-slider="color"]');
    const tempDiv  = this.root.querySelector('[data-hrv-slider="temp"]');
    if (colorDiv || tempDiv) {
      const mode = attributes.color_mode;
      const inTempMode = mode === "color_temp";
      const inColorMode = mode && mode !== "color_temp";
      if (colorDiv) colorDiv.style.opacity = inTempMode ? "0.45" : "1";
      if (tempDiv)  tempDiv.style.opacity  = inColorMode ? "0.45" : "1";
    }

    // Icon.
    const domainDefault = isOn ? "mdi:lightbulb" : "mdi:lightbulb-outline";
    const rawIcon = this.def.icon_state_map?.[state]
      ?? this.def.icon_state_map?.["*"]
      ?? this.def.icon
      ?? domainDefault;
    this.renderIcon(this.resolveIcon(rawIcon, domainDefault), "card-icon");

    const iconEl = this.root.querySelector("[part=card-icon]");
    if (iconEl) iconEl.setAttribute("data-on", String(isOn));

    const label = this.i18n.t(isOn ? "state.on" : "state.off");
    this.announceState(`${this.def.friendly_name}, ${label}`);
  }

  predictState(action, data) {
    if (action === "toggle") {
      const isOn = this.#toggleBtn?.getAttribute("aria-pressed") === "true";
      return { state: isOn ? "off" : "on", attributes: { ...this.#lastAttrs } };
    }
    if (action === "turn_on") {
      const attrs = { ...this.#lastAttrs };
      if (data.brightness !== undefined)       attrs.brightness = data.brightness;
      if (data.color_temp_kelvin !== undefined) attrs.color_temp_kelvin = data.color_temp_kelvin;
      if (data.hs_color !== undefined)          attrs.hs_color = data.hs_color;
      return { state: "on", attributes: attrs };
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  #sendBrightness(value) {
    this.config.card?.sendCommand("turn_on", { brightness: value });
  }

  #sendColorTemp(value) {
    // Send Kelvin - color_temp (mireds) is deprecated in HA 2022.5+.
    this.config.card?.sendCommand("turn_on", { color_temp_kelvin: value });
  }

  #sendHue(hue) {
    this.config.card?.sendCommand("turn_on", { hs_color: [hue, 100] });
  }
}

// ---------------------------------------------------------------------------
// Utility: escape HTML special characters for safe insertion in innerHTML.
// ---------------------------------------------------------------------------

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
