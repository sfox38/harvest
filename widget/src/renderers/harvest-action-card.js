/**
 * renderers/harvest-action-card.js - Renderer for harvest_action virtual entities.
 *
 * Renders a trigger button. The entity cycles through idle -> triggered -> idle
 * on the server side (200ms pulse). The icon and button label reflect the
 * current state from icon_state_map.
 *
 * predictState() applies an optimistic "triggered" transition immediately
 * on button press, reverting to "idle" after 500ms if no server update arrives.
 */

import { BaseCard } from "./base-card.js";

const HARVEST_ACTION_STYLES = /* css */`
  [part=card-body] {
    margin-top: var(--hrv-spacing-xs);
  }

  [part=trigger-button] {
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
    transition: opacity var(--hrv-transition-speed), transform 80ms;
  }

  [part=trigger-button]:hover  { opacity: 0.88; }
  [part=trigger-button]:active { opacity: 0.75; transform: scale(0.98); }
  [part=trigger-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=trigger-button][data-state=triggered] {
    opacity: 0.55;
  }

  [part=state-label] {
    display: block;
    margin-top: var(--hrv-spacing-xs);
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    text-align: center;
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

export class HarvestActionCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */ #triggerBtn  = null;
  /** @type {HTMLElement|null}       */ #stateLabel  = null;

  render() {
    const isWritable = this.def.capabilities === "read-write";
    const label      = this.def.friendly_name;

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${HARVEST_ACTION_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(label)}</span>
        </div>
        <div part="card-body">
          ${isWritable ? /* html */`
            <button part="trigger-button" type="button"
              aria-label="${_esc(label)}">
              ${_esc(label)}
            </button>
            <span part="state-label"></span>
          ` : /* html */`
            <span part="state-label">-</span>
          `}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#triggerBtn = this.root.querySelector("[part=trigger-button]");
    this.#stateLabel = this.root.querySelector("[part=state-label]");

    this.renderIcon(
      this.def.icon_state_map?.["idle"] ?? this.def.icon ?? "mdi:play-circle-outline",
      "card-icon",
    );

    this._attachGestureHandlers(this.#triggerBtn, {
      onTap: () => this.config.card?.sendCommand("trigger", {}),
    });

    this.renderCompanions();
  }

  applyState(state, _attributes) {
    const isTriggered = state === "triggered";

    if (this.#triggerBtn) {
      this.#triggerBtn.setAttribute("data-state", state);
      this.#triggerBtn.disabled = isTriggered;
    }

    if (this.#stateLabel) {
      this.#stateLabel.textContent = isTriggered
        ? this.i18n.t("state.triggered")
        : "";
    }

    const iconName = this.def.icon_state_map?.[state]
      ?? this.def.icon
      ?? (isTriggered ? "mdi:play-circle" : "mdi:play-circle-outline");
    this.renderIcon(iconName, "card-icon");

    if (isTriggered) {
      this.announceState(`${this.def.friendly_name}, ${this.i18n.t("state.triggered")}`);
    }
  }

  predictState(action, _data) {
    if (action !== "trigger") return null;
    return { state: "triggered", attributes: {} };
  }
}
