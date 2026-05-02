/**
 * renderers/generic-card.js - Fallback renderer for Tier 2 entities.
 *
 * Displays entity name, domain, and current state as text. No interactive
 * controls. Used when no specific renderer is registered for the entity's
 * domain or device_class combination.
 */

import { BaseCard } from "./base-card.js";

const GENERIC_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hrv-spacing-s);
    margin-top: var(--hrv-spacing-xs);
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-m);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
  }

  .hrv-generic-domain {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    background: var(--hrv-color-surface-alt);
    padding: 1px var(--hrv-spacing-xs);
    border-radius: var(--hrv-radius-s);
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

export class GenericCard extends BaseCard {
  /** @type {HTMLElement|null} */ #stateLabel = null;

  render() {
    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${GENERIC_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
          <span class="hrv-generic-domain">${_esc(this.def.domain)}</span>
        </div>
        <div part="card-body">
          <span part="state-label" aria-live="polite">-</span>
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#stateLabel = this.root.querySelector("[part=state-label]");
    this.renderIcon(this.def.icon ?? "mdi:eye", "card-icon");
    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, _attributes) {
    const label = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`)
      : state;
    if (this.#stateLabel) this.#stateLabel.textContent = label;
    this.announceState(`${this.def.friendly_name}, ${label}`);
  }
}
