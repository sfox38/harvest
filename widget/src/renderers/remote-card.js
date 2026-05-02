/**
 * renderers/remote-card.js - Renderer for the "remote" domain.
 *
 * Renders a send_command button. The remote domain only supports
 * send_command in ALLOWED_SERVICES, so the card is intentionally minimal -
 * a tap action fires the configured command, or shows a static icon if
 * the card is read-only.
 */

import { BaseCard } from "./base-card.js";

const REMOTE_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hrv-spacing-s);
  }

  [part=command-button] {
    min-height: 44px;
    padding: var(--hrv-spacing-xs) var(--hrv-spacing-m);
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

  [part=command-button]:hover  { opacity: 0.88; }
  [part=command-button]:active { opacity: 0.75; }
  [part=command-button]:disabled { opacity: 0.4; cursor: not-allowed; }

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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class RemoteCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */ #commandBtn = null;
  /** @type {HTMLElement|null}       */ #stateLabel = null;

  render() {
    const isWritable = this.def.capabilities === "read-write";
    // tap_action command defaults to "power" if not configured.
    const commandLabel = this.config.tapAction?.data?.command ?? "power";

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${REMOTE_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <span part="state-label"></span>
          ${isWritable ? /* html */`
            <button part="command-button" type="button"
              aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("action.send"))} ${_esc(commandLabel)}">
              ${_esc(commandLabel)}
            </button>
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#commandBtn = this.root.querySelector("[part=command-button]");
    this.#stateLabel = this.root.querySelector("[part=state-label]");

    if (!isWritable) {
      this.root.querySelector("[part=card]")?.setAttribute("data-readonly", "true");
    }

    this.renderIcon(this.def.icon ?? "mdi:remote", "card-icon");

    this._attachGestureHandlers(this.#commandBtn, {
      onTap: () => {
        const cmd    = this.config.tapAction?.data?.command ?? "power";
        const device = this.config.tapAction?.data?.device;
        const data   = device ? { command: cmd, device } : { command: cmd };
        this.config.card?.sendCommand("send_command", data);
      },
    });

    this.renderCompanions();
  }

  applyState(state, _attributes) {
    if (this.#stateLabel) {
      this.#stateLabel.textContent = this.i18n.t(`state.${state}`) !== `state.${state}`
        ? this.i18n.t(`state.${state}`)
        : state;
    }

    const iconName = this.def.icon_state_map?.[state] ?? this.def.icon ?? "mdi:remote";
    this.renderIcon(iconName, "card-icon");

    const label = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`) : state;
    this.announceState(`${this.def.friendly_name}, ${label}`);
  }
}
