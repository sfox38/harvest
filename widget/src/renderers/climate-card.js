/**
 * renderers/climate-card.js - Renderer for the "climate" domain.
 *
 * Renders current temperature, HVAC mode, and target temperature controls.
 * Temperature inputs are debounced at 500ms.
 *
 * feature_config provides: min_temp, max_temp, temp_step (from entity).
 * supported_features drives which controls are shown:
 *   "target_temperature"        - single target temp input
 *   "target_temperature_range"  - low/high target temp inputs
 */

import { BaseCard } from "./base-card.js";

const CLIMATE_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    gap: var(--hrv-spacing-s);
  }

  .hrv-climate-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hrv-spacing-s);
  }

  .hrv-climate-label {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
  }

  .hrv-climate-temp {
    font-size: var(--hrv-font-size-l);
    font-weight: var(--hrv-font-weight-bold);
    color: var(--hrv-color-text);
  }

  [part=mode-select],
  [part=fan-mode-select],
  [part=preset-select],
  [part=swing-select] {
    flex: 1;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    cursor: pointer;
  }

  [part=target-temp-input],
  [part=target-temp-low-input],
  [part=target-temp-high-input] {
    width: 72px;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-s);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    text-align: center;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
  }

  [part=card][data-readonly=true] [part=card-body] {
    align-items: center;
  }

  [part=card][data-readonly=true] .hrv-climate-row {
    justify-content: center;
    gap: var(--hrv-spacing-m);
  }

  [part=card][data-readonly=true] [part=state-label] {
    font-size: var(--hrv-font-size-l);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
    text-align: center;
  }
`;

const HVAC_MODES = ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"];

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class ClimateCard extends BaseCard {
  /** @type {HTMLSelectElement|null}  */ #modeSelect      = null;
  /** @type {HTMLSelectElement|null}  */ #fanModeSelect   = null;
  /** @type {HTMLSelectElement|null}  */ #presetSelect    = null;
  /** @type {HTMLSelectElement|null}  */ #swingSelect     = null;
  /** @type {HTMLElement|null}        */ #fanModeLabel    = null;
  /** @type {HTMLElement|null}        */ #presetLabel     = null;
  /** @type {HTMLElement|null}        */ #swingLabel      = null;
  /** @type {HTMLInputElement|null}   */ #targetTempInput = null;
  /** @type {HTMLInputElement|null}   */ #tempLowInput    = null;
  /** @type {HTMLInputElement|null}   */ #tempHighInput   = null;
  /** @type {HTMLElement|null}        */ #currentTempEl   = null;
  /** @type {HTMLElement|null}        */ #stateLabel      = null;
  /** @type {Function}                */ #tempDebounce;
  /** @type {Function}                */ #tempLowDebounce;
  /** @type {Function}                */ #tempHighDebounce;
  // Tracks the value we sent to HA. applyState skips overwriting a control
  // until HA echoes back the expected value, confirming the command was applied.
  // null = no pending command for that control.
  /** @type {object}                  */ #pending = {
    mode: null, targetTemp: null, tempLow: null, tempHigh: null,
    fanMode: null, presetMode: null, swingMode: null,
  };
  /** @type {ReturnType<typeof setTimeout>|null} */ #pendingTimer = null;
  /** @type {string} */ #lastState = "";
  /** @type {object} */ #lastAttrs = {};

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#tempDebounce     = this.debounce(this.#sendTargetTemp.bind(this), 500);
    this.#tempLowDebounce  = this.debounce(this.#sendTempLow.bind(this), 500);
    this.#tempHighDebounce = this.debounce(this.#sendTempHigh.bind(this), 500);
  }

  #resetPendingTimer() {
    clearTimeout(this.#pendingTimer);
    this.#pendingTimer = setTimeout(() => {
      this.#pending = {
        mode: null, targetTemp: null, tempLow: null, tempHigh: null,
        fanMode: null, presetMode: null, swingMode: null,
      };
    }, 10_000);
  }

  render() {
    const isWritable  = this.def.capabilities === "read-write";
    const hints       = this.config.displayHints ?? {};
    const hasTarget   = this.def.supported_features?.includes("target_temperature");
    const hasRange    = this.def.supported_features?.includes("target_temperature_range");
    const hasFanMode  = hints.show_fan_mode !== false && (this.def.supported_features?.includes("fan_mode")
                     || (this.def.feature_config?.fan_modes?.length > 0));
    const hasPreset   = hints.show_presets !== false && (this.def.supported_features?.includes("preset_mode")
                     || (this.def.feature_config?.preset_modes?.length > 0));
    const hasSwing    = hints.show_swing_mode !== false && (this.def.supported_features?.includes("swing_mode")
                     || (this.def.feature_config?.swing_modes?.length > 0));
    const minTemp     = this.def.feature_config?.min_temp ?? 7;
    const maxTemp     = this.def.feature_config?.max_temp ?? 35;
    const step        = this.def.feature_config?.temp_step ?? 0.5;
    const hvacModes   = this.def.feature_config?.hvac_modes ?? HVAC_MODES;
    const fanModes    = this.def.feature_config?.fan_modes ?? [];
    const presetModes = this.def.feature_config?.preset_modes ?? [];
    const swingModes  = this.def.feature_config?.swing_modes ?? [];

    const modeOptions = hvacModes
      .map((m) => `<option value="${_esc(m)}">${_esc(this.i18n.t(`climate.${m}`) || m)}</option>`)
      .join("");
    const fanOptions    = fanModes.map((m) => `<option value="${_esc(m)}">${_esc(m)}</option>`).join("");
    const presetOptions = presetModes.map((m) => `<option value="${_esc(m)}">${_esc(m)}</option>`).join("");
    const swingOptions  = swingModes.map((m) => `<option value="${_esc(m)}">${_esc(m)}</option>`).join("");

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${CLIMATE_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <div class="hrv-climate-row">
            <span class="hrv-climate-label">${_esc(this.i18n.t("climate.current"))}</span>
            <span part="current-temp" class="hrv-climate-temp">-</span>
          </div>
          ${!isWritable ? `<span part="state-label"></span>` : ""}
          ${isWritable && hints.show_hvac_modes !== false && hvacModes.length > 0 ? /* html */`
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.mode"))}</span>
              <select part="mode-select" aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.mode"))}">
                ${modeOptions}
              </select>
            </div>
          ` : ""}
          ${isWritable && hasTarget && !hasRange ? /* html */`
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.target"))}</span>
              <input part="target-temp-input" type="number"
                min="${minTemp}" max="${maxTemp}" step="${step}"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.target"))}">
            </div>
          ` : ""}
          ${isWritable && hasRange ? /* html */`
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.target_low"))}</span>
              <input part="target-temp-low-input" type="number"
                min="${minTemp}" max="${maxTemp}" step="${step}"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.target_low"))}">
            </div>
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.target_high"))}</span>
              <input part="target-temp-high-input" type="number"
                min="${minTemp}" max="${maxTemp}" step="${step}"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.target_high"))}">
            </div>
          ` : ""}
          ${hasFanMode ? /* html */`
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.fan_mode"))}</span>
              ${isWritable && fanOptions
                ? `<select part="fan-mode-select" aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.fan_mode"))}">${fanOptions}</select>`
                : `<span part="fan-mode-label" class="hrv-climate-label"></span>`}
            </div>
          ` : ""}
          ${hasPreset ? /* html */`
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.preset_mode"))}</span>
              ${isWritable && presetOptions
                ? `<select part="preset-select" aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.preset_mode"))}">${presetOptions}</select>`
                : `<span part="preset-label" class="hrv-climate-label"></span>`}
            </div>
          ` : ""}
          ${hasSwing ? /* html */`
            <div class="hrv-climate-row">
              <span class="hrv-climate-label">${_esc(this.i18n.t("climate.swing_mode"))}</span>
              ${isWritable && swingOptions
                ? `<select part="swing-select" aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("climate.swing_mode"))}">${swingOptions}</select>`
                : `<span part="swing-label" class="hrv-climate-label"></span>`}
            </div>
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#modeSelect      = this.root.querySelector("[part=mode-select]");
    this.#fanModeSelect   = this.root.querySelector("[part=fan-mode-select]");
    this.#presetSelect    = this.root.querySelector("[part=preset-select]");
    this.#swingSelect     = this.root.querySelector("[part=swing-select]");
    this.#fanModeLabel    = this.root.querySelector("[part=fan-mode-label]");
    this.#presetLabel     = this.root.querySelector("[part=preset-label]");
    this.#swingLabel      = this.root.querySelector("[part=swing-label]");
    this.#targetTempInput = this.root.querySelector("[part=target-temp-input]");
    this.#tempLowInput    = this.root.querySelector("[part=target-temp-low-input]");
    this.#tempHighInput   = this.root.querySelector("[part=target-temp-high-input]");
    this.#currentTempEl   = this.root.querySelector("[part=current-temp]");
    this.#stateLabel      = this.root.querySelector("[part=state-label]");

    if (!isWritable) {
      this.root.querySelector("[part=card]")?.setAttribute("data-readonly", "true");
    }

    this.renderIcon(this.def.icon ?? "mdi:thermostat", "card-icon");

    this.#modeSelect?.addEventListener("change", (e) => {
      console.warn("[HArvest] climate: mode change ->", e.target.value);
      this.#pending.mode = e.target.value;
      this.#resetPendingTimer();
      this.config.card?.sendCommand("set_hvac_mode", { hvac_mode: e.target.value });
    });

    this.#fanModeSelect?.addEventListener("change", (e) => {
      this.#pending.fanMode = e.target.value;
      this.#resetPendingTimer();
      this.config.card?.sendCommand("set_fan_mode", { fan_mode: e.target.value });
    });

    this.#presetSelect?.addEventListener("change", (e) => {
      this.#pending.presetMode = e.target.value;
      this.#resetPendingTimer();
      this.config.card?.sendCommand("set_preset_mode", { preset_mode: e.target.value });
    });

    this.#swingSelect?.addEventListener("change", (e) => {
      this.#pending.swingMode = e.target.value;
      this.#resetPendingTimer();
      this.config.card?.sendCommand("set_swing_mode", { swing_mode: e.target.value });
    });

    this.#targetTempInput?.addEventListener("input", (e) => {
      this.#pending.targetTemp = parseFloat(e.target.value);
      this.#resetPendingTimer();
      this.#tempDebounce(this.#pending.targetTemp);
    });

    this.#tempLowInput?.addEventListener("input", (e) => {
      this.#pending.tempLow = parseFloat(e.target.value);
      this.#resetPendingTimer();
      this.#tempLowDebounce(this.#pending.tempLow);
    });

    this.#tempHighInput?.addEventListener("input", (e) => {
      this.#pending.tempHigh = parseFloat(e.target.value);
      this.#resetPendingTimer();
      this.#tempHighDebounce(this.#pending.tempHigh);
    });

    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, attributes) {
    this.#lastState = state;
    this.#lastAttrs = { ...attributes };
    const unit = this.def.unit_of_measurement ?? "°";

    if (this.#currentTempEl && attributes.current_temperature !== undefined) {
      this.#currentTempEl.textContent = `${attributes.current_temperature}${unit}`;
    }

    if (this.#stateLabel) {
      const hvacAction = attributes.hvac_action;
      const displayState = hvacAction ?? state;
      this.#stateLabel.textContent =
        this.i18n.t(`state.${displayState}`) !== `state.${displayState}`
          ? this.i18n.t(`state.${displayState}`)
          : displayState;
    }

    // For each control, skip the DOM update if a command is pending confirmation.
    // Clear pending once HA echoes back the value we sent.
    if (this.#modeSelect && !this.isFocused(this.#modeSelect)) {
      if (this.#pending.mode === null || state === this.#pending.mode) {
        this.#modeSelect.value = state;
        this.#pending.mode = null;
      }
    }

    if (this.#targetTempInput && !this.isFocused(this.#targetTempInput) && attributes.temperature !== undefined) {
      const t = attributes.temperature;
      if (this.#pending.targetTemp === null || Math.abs(t - this.#pending.targetTemp) < 0.05) {
        this.#targetTempInput.value = String(t);
        this.#pending.targetTemp = null;
      }
    }

    if (this.#tempLowInput && !this.isFocused(this.#tempLowInput) && attributes.target_temp_low !== undefined) {
      const t = attributes.target_temp_low;
      if (this.#pending.tempLow === null || Math.abs(t - this.#pending.tempLow) < 0.05) {
        this.#tempLowInput.value = String(t);
        this.#pending.tempLow = null;
      }
    }

    if (this.#tempHighInput && !this.isFocused(this.#tempHighInput) && attributes.target_temp_high !== undefined) {
      const t = attributes.target_temp_high;
      if (this.#pending.tempHigh === null || Math.abs(t - this.#pending.tempHigh) < 0.05) {
        this.#tempHighInput.value = String(t);
        this.#pending.tempHigh = null;
      }
    }

    if (attributes.fan_mode !== undefined) {
      const fm = attributes.fan_mode;
      if (this.#fanModeSelect && !this.isFocused(this.#fanModeSelect)) {
        if (this.#pending.fanMode === null || fm === this.#pending.fanMode) {
          this.#fanModeSelect.value = fm;
          this.#pending.fanMode = null;
        }
      }
      if (this.#fanModeLabel) this.#fanModeLabel.textContent = fm;
    }

    if (attributes.preset_mode !== undefined) {
      const pm = attributes.preset_mode;
      if (this.#presetSelect && !this.isFocused(this.#presetSelect)) {
        if (this.#pending.presetMode === null || pm === this.#pending.presetMode) {
          this.#presetSelect.value = pm;
          this.#pending.presetMode = null;
        }
      }
      if (this.#presetLabel) this.#presetLabel.textContent = pm;
    }

    if (attributes.swing_mode !== undefined) {
      const sm = attributes.swing_mode;
      if (this.#swingSelect && !this.isFocused(this.#swingSelect)) {
        if (this.#pending.swingMode === null || sm === this.#pending.swingMode) {
          this.#swingSelect.value = sm;
          this.#pending.swingMode = null;
        }
      }
      if (this.#swingLabel) this.#swingLabel.textContent = sm;
    }

    const action   = attributes.hvac_action ?? state;
    const iconName = this.def.icon_state_map?.[action]
      ?? this.def.icon
      ?? _hvacIcon(action);
    this.renderIcon(iconName, "card-icon");

    const temp = attributes.current_temperature;
    const announceAction = attributes.hvac_action ?? state;
    const stateText = this.i18n.t(`state.${announceAction}`) !== `state.${announceAction}`
      ? this.i18n.t(`state.${announceAction}`) : announceAction;
    this.announceState(
      `${this.def.friendly_name}, ${stateText}${temp !== undefined ? `, ${temp}${unit}` : ""}`,
    );
  }

  predictState(action, data) {
    const attrs = { ...this.#lastAttrs };
    if (action === "set_hvac_mode" && data.hvac_mode) {
      return { state: data.hvac_mode, attributes: attrs };
    }
    if (action === "set_temperature") {
      if (data.temperature !== undefined) attrs.temperature = data.temperature;
      if (data.target_temp_low !== undefined) attrs.target_temp_low = data.target_temp_low;
      if (data.target_temp_high !== undefined) attrs.target_temp_high = data.target_temp_high;
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "set_fan_mode" && data.fan_mode) {
      attrs.fan_mode = data.fan_mode;
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "set_preset_mode" && data.preset_mode) {
      attrs.preset_mode = data.preset_mode;
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "set_swing_mode" && data.swing_mode) {
      attrs.swing_mode = data.swing_mode;
      return { state: this.#lastState, attributes: attrs };
    }
    return null;
  }

  #sendTargetTemp(value) {
    this.config.card?.sendCommand("set_temperature", { temperature: value });
  }

  #sendTempLow(value) {
    this.config.card?.sendCommand("set_temperature", { target_temp_low: value });
  }

  #sendTempHigh(value) {
    this.config.card?.sendCommand("set_temperature", { target_temp_high: value });
  }
}

function _hvacIcon(action) {
  const map = {
    heating:  "mdi:fire",
    cooling:  "mdi:snowflake",
    fan_only: "mdi:fan",
    drying:   "mdi:air-conditioner",
    idle:     "mdi:thermostat",
    off:      "mdi:thermostat",
  };
  return map[action] ?? "mdi:thermostat";
}
