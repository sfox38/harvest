/**
 * renderers/sensor-battery-card.js - Renderer for battery sensors.
 *
 * Displays current battery level as a percentage with a battery icon that
 * reflects the charge level. Read-only.
 */

import { BaseCard } from "./base-card.js";

const BATTERY_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--hrv-spacing-s);
    margin-top: var(--hrv-spacing-xs);
  }

  [part=battery-icon-wrap] {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  [part=sensor-value] {
    font-size: 2rem;
    font-weight: var(--hrv-font-weight-bold);
    color: var(--hrv-color-primary);
    line-height: 1;
  }

  [part=sensor-unit] {
    font-size: var(--hrv-font-size-m);
    color: var(--hrv-color-text-secondary);
  }
`;

/**
 * Return an MDI battery icon name for the given level (0-100).
 * Mirrors Home Assistant's own battery icon selection logic.
 *
 * @param {number|null} level
 * @returns {string}
 */
function _batteryIcon(level) {
  if (level === null || level === undefined) return "mdi:battery-unknown";
  const n = Number(level);
  if (isNaN(n))                return "mdi:battery-unknown";
  if (n >= 100)                return "mdi:battery";
  if (n >= 90)                 return "mdi:battery-90";
  if (n >= 80)                 return "mdi:battery-80";
  if (n >= 70)                 return "mdi:battery-70";
  if (n >= 60)                 return "mdi:battery-60";
  if (n >= 50)                 return "mdi:battery-50";
  if (n >= 40)                 return "mdi:battery-40";
  if (n >= 30)                 return "mdi:battery-30";
  if (n >= 20)                 return "mdi:battery-20";
  if (n >= 10)                 return "mdi:battery-10";
  return "mdi:battery-outline";
}

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class BatterySensorCard extends BaseCard {
  /** @type {HTMLElement|null} */ #valueEl = null;
  /** @type {string|null} */      #currentIcon = null;

  render() {
    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${BATTERY_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <span part="battery-icon-wrap" aria-hidden="true"></span>
          <span part="sensor-value" aria-live="polite">-</span>
          <span part="sensor-unit">${_esc(this.def.unit_of_measurement ?? "%")}</span>
        </div>
        ${this.renderHistoryZoneHTML()}
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#valueEl = this.root.querySelector("[part=sensor-value]");
    this.renderIcon(this.def.icon ?? "mdi:battery", "card-icon");
    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, _attributes) {
    if (!this.#valueEl) return;

    this.#valueEl.textContent = state;

    const icon = _batteryIcon(state === "unavailable" ? null : state);
    if (icon !== this.#currentIcon) {
      this.#currentIcon = icon;
      this.renderIcon(icon, "battery-icon-wrap");
    }

    const unit = this.def.unit_of_measurement ?? "%";
    this.announceState(`${this.def.friendly_name}, ${state} ${unit}`);
  }
}
