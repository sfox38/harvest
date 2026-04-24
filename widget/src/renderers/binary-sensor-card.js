/**
 * renderers/binary-sensor-card.js - Renderer for binary_sensor entities.
 *
 * Displays on/off state with a coloured indicator. Always read-only -
 * binary_sensor has no entries in ALLOWED_SERVICES.
 */

import { BaseCard } from "./base-card.js";

const BINARY_SENSOR_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: center;
    gap: var(--hrv-spacing-s);
    margin-top: var(--hrv-spacing-xs);
  }

  .hrv-binary-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--hrv-color-state-off);
    transition: background var(--hrv-transition-speed);
  }

  .hrv-binary-indicator[data-on=true] {
    background: var(--hrv-color-state-on);
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-m);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
  }
`;

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class BinarySensorCard extends BaseCard {
  /** @type {HTMLElement|null} */ #indicator = null;
  /** @type {HTMLElement|null} */ #stateLabel = null;

  render() {
    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${BINARY_SENSOR_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <div class="hrv-binary-indicator" aria-hidden="true"></div>
          <span part="state-label" aria-live="polite">-</span>
        </div>
        ${this.renderHistoryZoneHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#indicator  = this.root.querySelector(".hrv-binary-indicator");
    this.#stateLabel = this.root.querySelector("[part=state-label]");

    this.renderIcon(
      this.def.icon ?? "mdi:checkbox-blank-circle-outline",
      "card-icon",
    );
    this.renderCompanions();
  }

  applyState(state, _attributes) {
    const isOn = state === "on";
    const label = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`)
      : state;

    if (this.#indicator) this.#indicator.setAttribute("data-on", String(isOn));
    if (this.#stateLabel) this.#stateLabel.textContent = label;

    const iconName = this.def.icon_state_map?.[state]
      ?? this.def.icon
      ?? (isOn ? "mdi:checkbox-blank-circle" : "mdi:checkbox-blank-circle-outline");
    this.renderIcon(iconName, "card-icon");
  }
}
