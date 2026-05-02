/**
 * renderers/cover-card.js - Renderer for the "cover" domain.
 *
 * Renders open/stop/close buttons and, when supported, a position slider.
 * The position slider is debounced at 300ms.
 */

import { BaseCard } from "./base-card.js";

const COVER_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    gap: var(--hrv-spacing-s);
  }

  .hrv-cover-controls {
    display: flex;
    gap: var(--hrv-spacing-xs);
  }

  .hrv-cover-btn {
    flex: 1;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed);
  }

  .hrv-cover-btn:hover  { opacity: 0.8; }
  .hrv-cover-btn:active { opacity: 0.6; }
  .hrv-cover-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  [part=position-slider] {
    width: 100%;
    accent-color: var(--hrv-color-primary);
    cursor: pointer;
  }

  .hrv-slider-label {
    display: flex;
    justify-content: space-between;
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    margin-bottom: 2px;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
  }

  [part=card][data-readonly=true] [part=card-body] {
    align-items: center;
  }

  [part=card][data-readonly=true] [part=state-label] {
    font-size: var(--hrv-font-size-l);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
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

export class CoverCard extends BaseCard {
  /** @type {HTMLButtonElement|null} */ #openBtn        = null;
  /** @type {HTMLButtonElement|null} */ #stopBtn        = null;
  /** @type {HTMLButtonElement|null} */ #closeBtn       = null;
  /** @type {HTMLInputElement|null}  */ #positionSlider = null;
  /** @type {HTMLElement|null}       */ #positionValue  = null;
  /** @type {HTMLElement|null}       */ #stateLabel     = null;
  /** @type {Function}               */ #positionDebounce;
  /** @type {string} */ #lastState = "";
  /** @type {object} */ #lastAttrs = {};

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#positionDebounce = this.debounce(this.#sendPosition.bind(this), 300);
  }

  render() {
    const isWritable   = this.def.capabilities === "read-write";
    const hints        = this.config.displayHints ?? {};
    const hasPosition  = hints.show_position !== false && this.def.supported_features?.includes("set_position");
    const hasButtons   = !this.def.supported_features || this.def.supported_features.includes("buttons");

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${COVER_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          ${!isWritable ? `<span part="state-label"></span>` : ""}
          ${isWritable && hasButtons ? /* html */`
            <div class="hrv-cover-controls">
              <button part="open-button" class="hrv-cover-btn" type="button"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("cover.open"))}">
                ${_esc(this.i18n.t("cover.open"))}
              </button>
              <button part="stop-button" class="hrv-cover-btn" type="button"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("cover.stop"))}">
                ${_esc(this.i18n.t("cover.stop"))}
              </button>
              <button part="close-button" class="hrv-cover-btn" type="button"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("cover.close"))}">
                ${_esc(this.i18n.t("cover.close"))}
              </button>
            </div>
          ` : ""}
          ${isWritable && hasPosition ? /* html */`
            <div>
              <div class="hrv-slider-label">
                <span>${_esc(this.i18n.t("cover.position"))}</span>
                <span part="position-value">-</span>
              </div>
              <input part="position-slider" type="range" min="0" max="100"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("cover.position"))}">
            </div>
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#openBtn        = this.root.querySelector("[part=open-button]");
    this.#stopBtn        = this.root.querySelector("[part=stop-button]");
    this.#closeBtn       = this.root.querySelector("[part=close-button]");
    this.#positionSlider = this.root.querySelector("[part=position-slider]");
    this.#positionValue  = this.root.querySelector("[part=position-value]");
    this.#stateLabel     = this.root.querySelector("[part=state-label]");

    if (!isWritable) {
      this.root.querySelector("[part=card]")?.setAttribute("data-readonly", "true");
    }

    this.renderIcon(this.def.icon ?? "mdi:window-shutter", "card-icon");

    this.#openBtn?.addEventListener("click",  () => this.config.card?.sendCommand("open_cover",  {}));
    this.#stopBtn?.addEventListener("click",  () => this.config.card?.sendCommand("stop_cover",  {}));
    this.#closeBtn?.addEventListener("click", () => this.config.card?.sendCommand("close_cover", {}));

    this.#positionSlider?.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      if (this.#positionValue) this.#positionValue.textContent = `${val}%`;
      this.#positionDebounce(val);
    });

    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, attributes) {
    this.#lastState = state;
    this.#lastAttrs = { ...attributes };
    const label = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`)
      : state;

    if (this.#stateLabel) this.#stateLabel.textContent = label;

    const isMoving = state === "opening" || state === "closing";
    if (this.#stopBtn) this.#stopBtn.disabled = !isMoving;

    if (this.#positionSlider && !this.isFocused(this.#positionSlider) && attributes.current_position !== undefined) {
      this.#positionSlider.value = String(attributes.current_position);
      if (this.#positionValue) this.#positionValue.textContent = `${attributes.current_position}%`;
    }

    const iconName = this.def.icon_state_map?.[state]
      ?? this.def.icon
      ?? _coverIcon(state, attributes);
    this.renderIcon(iconName, "card-icon");

    this.announceState(`${this.def.friendly_name}, ${label}`);
  }

  predictState(action, data) {
    const attrs = { ...this.#lastAttrs };
    if (action === "open_cover") {
      attrs.current_position = 100;
      return { state: "open", attributes: attrs };
    }
    if (action === "close_cover") {
      attrs.current_position = 0;
      return { state: "closed", attributes: attrs };
    }
    if (action === "stop_cover") {
      return { state: this.#lastState, attributes: attrs };
    }
    if (action === "set_cover_position" && data.position !== undefined) {
      attrs.current_position = data.position;
      return { state: data.position > 0 ? "open" : "closed", attributes: attrs };
    }
    return null;
  }

  #sendPosition(value) {
    this.config.card?.sendCommand("set_cover_position", { position: value });
  }
}

function _coverIcon(state, attributes) {
  const pos = attributes?.current_position;
  if (state === "open" || (pos !== undefined && pos > 0)) return "mdi:window-shutter-open";
  return "mdi:window-shutter";
}
