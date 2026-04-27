/**
 * renderers/switch-card.js - Renderer for the "switch" domain.
 *
 * Renders a toggle button and state label. Reuses the same on/off colour
 * semantics as LightCard. predictState() handles "toggle" optimistically.
 */

import { BaseCard } from "./base-card.js";

const SWITCH_CARD_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--hrv-spacing-s);
  }

  [part=toggle-button] {
    padding: var(--hrv-spacing-xs) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
    min-width: 64px;
  }

  [part=toggle-button][aria-pressed=true] {
    background: var(--hrv-color-state-on);
    color: var(--hrv-color-text-inverse);
  }

  [part=toggle-button][aria-pressed=false] {
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
  }

  [part=toggle-button]:hover { opacity: 0.88; }
  [part=toggle-button]:active { opacity: 0.75; }
  [part=toggle-button]:disabled { opacity: 0.4; cursor: not-allowed; }

  [part=state-label] {
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
  }

  [part=card][data-readonly=true] [part=card-body] {
    justify-content: center;
  }

  [part=card][data-readonly=true] [part=state-label] {
    font-size: var(--hrv-font-size-l);
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

export class SwitchCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */ #toggleBtn  = null;
  /** @type {HTMLElement|null}       */ #stateLabel = null;

  render() {
    const isWritable = this.def.capabilities === "read-write";

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${SWITCH_CARD_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${!isWritable ? `<span part="state-label"></span>` : ""}
          ${isWritable ? `<button part="toggle-button" type="button"></button>` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#toggleBtn  = this.root.querySelector("[part=toggle-button]");
    this.#stateLabel = this.root.querySelector("[part=state-label]");

    if (!isWritable) {
      this.root.querySelector("[part=card]")?.setAttribute("data-readonly", "true");
    }

    this.renderIcon(
      this.def.icon ?? "mdi:toggle-switch-off",
      "card-icon",
    );

    this._attachGestureHandlers(this.#toggleBtn, {
      onTap: () => {
        const tap = this.config.gestureConfig?.tap;
        if (tap) { this._runAction(tap); return; }
        const isOn = this.#toggleBtn?.getAttribute("aria-pressed") === "true";
        this.config.card?.sendCommand(isOn ? "turn_off" : "turn_on", {});
      },
    });

    this.renderCompanions();
  }

  applyState(state, _attributes) {
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

    const iconName = this.def.icon_state_map?.[state]
      ?? this.def.icon
      ?? (isOn ? "mdi:toggle-switch" : "mdi:toggle-switch-off");
    this.renderIcon(iconName, "card-icon");

    this.announceState(`${this.def.friendly_name}, ${label}`);
  }

  predictState(action, _data) {
    if (action === "turn_on")  return { state: "on",  attributes: {} };
    if (action === "turn_off") return { state: "off", attributes: {} };
    return null;
  }
}
