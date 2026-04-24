/**
 * renderers/input-number-card.js - Renderer for input_number entities.
 *
 * Renders a range slider and numeric input. feature_config provides
 * min, max, and step from the entity attributes. Slider and number
 * input are kept in sync; changes are debounced at 300ms.
 */

import { BaseCard } from "./base-card.js";

const INPUT_NUMBER_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    gap: var(--hrv-spacing-s);
  }

  .hrv-number-row {
    display: flex;
    align-items: center;
    gap: var(--hrv-spacing-s);
  }

  [part=value-slider] {
    flex: 1;
    accent-color: var(--hrv-color-primary);
    cursor: pointer;
  }

  [part=value-input] {
    width: 64px;
    padding: var(--hrv-spacing-xs) var(--hrv-spacing-s);
    border: 1px solid var(--hrv-color-border);
    border-radius: var(--hrv-radius-s);
    background: var(--hrv-color-surface);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    text-align: center;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
  }
`;

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class InputNumberCard extends BaseCard {
  /** @type {HTMLInputElement|null} */ #slider     = null;
  /** @type {HTMLInputElement|null} */ #numberInput = null;
  /** @type {HTMLElement|null}      */ #stateLabel  = null;
  /** @type {Function}              */ #sendDebounce;

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#sendDebounce = this.debounce(this.#sendValue.bind(this), 300);
  }

  render() {
    const isWritable = this.def.capabilities === "read-write";
    const min  = this.def.feature_config?.min  ?? 0;
    const max  = this.def.feature_config?.max  ?? 100;
    const step = this.def.feature_config?.step ?? 1;
    const unit = this.def.unit_of_measurement  ?? "";

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${INPUT_NUMBER_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${isWritable ? /* html */`
            <div class="hrv-number-row">
              <input part="value-slider" type="range"
                min="${min}" max="${max}" step="${step}"
                aria-label="${_esc(this.def.friendly_name)}">
              <input part="value-input" type="number"
                min="${min}" max="${max}" step="${step}"
                aria-label="${_esc(this.def.friendly_name)} value">
              ${unit ? `<span part="state-label">${_esc(unit)}</span>` : ""}
            </div>
          ` : /* html */`
            <div class="hrv-number-row">
              <span part="state-label">-</span>
              ${unit ? `<span>${_esc(unit)}</span>` : ""}
            </div>
          `}
        </div>
        ${this.renderHistoryZoneHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#slider      = this.root.querySelector("[part=value-slider]");
    this.#numberInput = this.root.querySelector("[part=value-input]");
    this.#stateLabel  = this.root.querySelector("[part=state-label]");

    this.renderIcon(this.def.icon ?? "mdi:ray-vertex", "card-icon");

    this.#slider?.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      if (this.#numberInput) this.#numberInput.value = String(v);
      this.#sendDebounce(v);
    });

    this.#numberInput?.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      if (this.#slider) this.#slider.value = String(v);
      this.#sendDebounce(v);
    });

    this.renderCompanions();
  }

  applyState(state, _attributes) {
    const value = parseFloat(state);
    if (!isNaN(value)) {
      if (this.#slider      && !this.isFocused(this.#slider))      this.#slider.value      = String(value);
      if (this.#numberInput && !this.isFocused(this.#numberInput)) this.#numberInput.value = String(value);
    }
    if (this.#stateLabel && this.def.capabilities !== "read-write") {
      this.#stateLabel.textContent = state;
    }
  }

  predictState(action, data) {
    if (action === "set_value" && data.value !== undefined) {
      return { state: String(data.value), attributes: {} };
    }
    return null;
  }

  #sendValue(value) {
    this.config.card?.sendCommand("set_value", { value });
  }
}
