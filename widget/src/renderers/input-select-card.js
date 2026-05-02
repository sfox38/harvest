/**
 * renderers/input-select-card.js - Renderer for input_select entities.
 *
 * Renders a dropdown populated with the entity's option list from attributes.
 * Selecting an option sends a select_option command.
 */

import { BaseCard } from "./base-card.js";

const INPUT_SELECT_STYLES = /* css */`
  [part=card-body] {
    margin-top: var(--hrv-spacing-xs);
  }

  [part=option-select] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    cursor: pointer;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
    display: block;
    margin-top: var(--hrv-spacing-xs);
  }

  [part=card][data-readonly=true] [part=card-body] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  [part=card][data-readonly=true] [part=state-label] {
    font-size: var(--hrv-font-size-l);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
    margin-top: 0;
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

export class InputSelectCard extends BaseCard {
  /** @type {HTMLSelectElement|null} */ #select     = null;
  /** @type {HTMLElement|null}       */ #stateLabel = null;

  render() {
    const isWritable = this.def.capabilities === "read-write";

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${INPUT_SELECT_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${isWritable
            ? `<select part="option-select" aria-label="${_esc(this.def.friendly_name)}"></select>`
            : `<span part="state-label">-</span>`
          }
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#select     = this.root.querySelector("[part=option-select]");
    this.#stateLabel = this.root.querySelector("[part=state-label]");

    if (!isWritable) {
      this.root.querySelector("[part=card]")?.setAttribute("data-readonly", "true");
    }

    this.renderIcon(this.def.icon ?? "mdi:format-list-bulleted", "card-icon");

    this.#select?.addEventListener("change", (e) => {
      this.config.card?.sendCommand("select_option", { option: e.target.value });
    });

    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, attributes) {
    if (this.#stateLabel) {
      this.#stateLabel.textContent = state;
      return;
    }

    if (!this.#select) return;

    // Rebuild options if the list has changed.
    const options = attributes.options ?? [];
    const existingValues = new Set(
      [...this.#select.options].map((o) => o.value),
    );
    const newValues = new Set(options);

    // Add any new options.
    for (const opt of options) {
      if (!existingValues.has(opt)) {
        const el = document.createElement("option");
        el.value = opt;
        el.textContent = opt;
        this.#select.appendChild(el);
      }
    }

    // Remove options no longer in the list.
    for (const el of [...this.#select.options]) {
      if (!newValues.has(el.value)) el.remove();
    }

    if (!this.isFocused(this.#select)) this.#select.value = state;

    this.announceState(`${this.def.friendly_name}, ${state}`);
  }
}
