/**
 * renderers/sensor-humidity-card.js - Renderer for humidity sensors.
 *
 * Displays current humidity as a percentage. Read-only.
 */

import { BaseCard } from "./base-card.js";

const HUMIDITY_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: baseline;
    gap: var(--hrv-spacing-xs);
    margin-top: var(--hrv-spacing-xs);
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

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class HumiditySensorCard extends BaseCard {
  /** @type {HTMLElement|null} */ #valueEl = null;

  render() {
    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${HUMIDITY_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <span part="sensor-value" aria-live="polite">-</span>
          <span part="sensor-unit">${_esc(this.def.unit_of_measurement ?? "%")}</span>
        </div>
        ${this.renderHistoryZoneHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#valueEl = this.root.querySelector("[part=sensor-value]");
    this.renderIcon(this.def.icon ?? "mdi:water-percent", "card-icon");
    this.renderCompanions();
  }

  applyState(state, _attributes) {
    if (this.#valueEl) this.#valueEl.textContent = state;
  }
}
