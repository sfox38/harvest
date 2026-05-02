/**
 * renderers/sensor-temperature-card.js - Renderer for temperature sensors.
 *
 * Displays the current temperature reading with its unit. Read-only; no
 * commands are possible for sensor entities.
 */

import { BaseCard } from "./base-card.js";

const TEMP_SENSOR_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: var(--hrv-spacing-xs);
    margin-top: var(--hrv-spacing-xs);
  }

  [part=sensor-value] {
    font-size: 2rem;
    font-weight: var(--hrv-font-weight-bold);
    color: var(--hrv-color-text);
    line-height: 1;
  }

  [part=sensor-unit] {
    font-size: var(--hrv-font-size-m);
    color: var(--hrv-color-text-secondary);
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

export class TemperatureSensorCard extends BaseCard {
  /** @type {HTMLElement|null} */ #valueEl = null;
  /** @type {HTMLElement|null} */ #unitEl  = null;

  render() {
    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${TEMP_SENSOR_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <span part="sensor-value" aria-live="polite">-</span>
          <span part="sensor-unit">${_esc(this.def.unit_of_measurement ?? "")}</span>
        </div>
        ${this.renderHistoryZoneHTML()}
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#valueEl = this.root.querySelector("[part=sensor-value]");
    this.#unitEl  = this.root.querySelector("[part=sensor-unit]");

    this.renderIcon(this.def.icon ?? "mdi:thermometer", "card-icon");
    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, attributes) {
    if (this.#valueEl) this.#valueEl.textContent = state;
    if (this.#unitEl && attributes.unit_of_measurement) {
      this.#unitEl.textContent = attributes.unit_of_measurement;
    }
    const unit = attributes.unit_of_measurement ?? this.def.unit_of_measurement ?? "";
    this.announceState(`${this.def.friendly_name}, ${state}${unit ? ` ${unit}` : ""}`);
  }
}
