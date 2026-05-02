/**
 * renderers/media-player-card.js - Renderer for the "media_player" domain.
 *
 * Renders playback controls (play/pause, previous, next), volume slider,
 * media title, and source selector. Album art and seek bar are deferred
 * to v1.1 per CLAUDE.md.
 *
 * Volume slider is debounced at 200ms.
 */

import { BaseCard } from "./base-card.js";

const MEDIA_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    gap: var(--hrv-spacing-s);
  }

  [part=media-artist] {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }

  [part=media-title] {
    font-size: var(--hrv-font-size-s);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }

  .hrv-media-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--hrv-spacing-s);
  }

  .hrv-media-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed), background var(--hrv-transition-speed);
    padding: 0;
  }

  .hrv-media-btn:hover  { opacity: 0.8; }
  .hrv-media-btn:active { opacity: 0.6; }
  .hrv-media-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  [part=play-button] {
    width: 44px;
    height: 44px;
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
  }

  .hrv-media-btn svg { width: 20px; height: 20px; }
  [part=play-button] svg { width: 24px; height: 24px; }

  .hrv-volume-row {
    display: flex;
    align-items: center;
    gap: var(--hrv-spacing-s);
  }

  .hrv-volume-icon {
    width: 20px;
    height: 20px;
    color: var(--hrv-color-icon);
    flex-shrink: 0;
  }

  [part=volume-slider] {
    flex: 1;
    accent-color: var(--hrv-color-primary);
    cursor: pointer;
  }

  [part=source-select] {
    width: 100%;
    padding: var(--hrv-spacing-s) var(--hrv-spacing-m);
    border: none;
    border-radius: var(--hrv-radius-m);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-xs);
    font-family: inherit;
    cursor: pointer;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    text-align: center;
  }
`;

import { renderIconSVG } from "../icons.js";

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class MediaPlayerCard extends BaseCard {
  /** @type {HTMLButtonElement|null}  */ #playBtn      = null;
  /** @type {HTMLButtonElement|null}  */ #prevBtn      = null;
  /** @type {HTMLButtonElement|null}  */ #nextBtn      = null;
  /** @type {HTMLButtonElement|null}  */ #muteBtn      = null;
  /** @type {HTMLInputElement|null}   */ #volumeSlider = null;
  /** @type {HTMLSelectElement|null}  */ #sourceSelect = null;
  /** @type {HTMLElement|null}        */ #mediaArtistEl = null;
  /** @type {HTMLElement|null}        */ #mediaTitleEl  = null;
  /** @type {HTMLElement|null}        */ #stateLabel    = null;
  /** @type {boolean}                 */ #isMuted      = false;
  /** @type {Function}                */ #volumeDebounce;

  constructor(def, root, config, i18n) {
    super(def, root, config, i18n);
    this.#volumeDebounce = this.debounce(this.#sendVolume.bind(this), 200);
  }

  render() {
    const isWritable  = this.def.capabilities === "read-write";
    const hints       = this.config.displayHints ?? {};
    const showTransport = hints.show_transport !== false;
    const hasVolume   = hints.show_volume !== false && this.def.supported_features?.includes("volume_set");
    const hasPrevNext = showTransport && this.def.supported_features?.includes("previous_track");
    const hasSource   = hints.show_source !== false && this.def.supported_features?.includes("select_source");

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${MEDIA_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <span part="media-artist"></span>
          <span part="media-title"></span>
          <span part="state-label"></span>
          ${isWritable ? /* html */`
            ${showTransport ? /* html */`
            <div class="hrv-media-controls">
              ${hasPrevNext ? /* html */`
                <button part="prev-button" class="hrv-media-btn" type="button"
                  aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("action.previous"))}">
                  ${renderIconSVG("mdi:skip-previous", "prev-icon")}
                </button>
              ` : ""}
              <button part="play-button" class="hrv-media-btn" type="button"
                aria-pressed="false"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("action.play"))}">
                ${renderIconSVG("mdi:play", "play-icon")}
              </button>
              ${hasPrevNext ? /* html */`
                <button part="next-button" class="hrv-media-btn" type="button"
                  aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("action.next"))}">
                  ${renderIconSVG("mdi:skip-next", "next-icon")}
                </button>
              ` : ""}
            </div>
            ` : ""}
            ${hasVolume ? /* html */`
              <div class="hrv-volume-row">
                <button part="mute-button" class="hrv-media-btn" type="button"
                  style="width:40px;height:40px;border-radius:var(--hrv-radius-s)"
                  aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("action.mute"))}">
                  ${renderIconSVG("mdi:volume-high", "mute-icon")}
                </button>
                <input part="volume-slider" type="range" min="0" max="100"
                  aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("media.volume"))}">
              </div>
            ` : ""}
            ${hasSource ? /* html */`
              <select part="source-select"
                aria-label="${_esc(this.def.friendly_name)} - ${_esc(this.i18n.t("media.source"))}">
                <option value="">- ${_esc(this.i18n.t("media.source"))} -</option>
              </select>
            ` : ""}
          ` : ""}
        </div>
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#playBtn      = this.root.querySelector("[part=play-button]");
    this.#prevBtn      = this.root.querySelector("[part=prev-button]");
    this.#nextBtn      = this.root.querySelector("[part=next-button]");
    this.#muteBtn      = this.root.querySelector("[part=mute-button]");
    this.#volumeSlider = this.root.querySelector("[part=volume-slider]");
    this.#sourceSelect = this.root.querySelector("[part=source-select]");
    this.#mediaArtistEl = this.root.querySelector("[part=media-artist]");
    this.#mediaTitleEl  = this.root.querySelector("[part=media-title]");
    this.#stateLabel    = this.root.querySelector("[part=state-label]");

    this.renderIcon(this.def.icon ?? "mdi:cast", "card-icon");

    this.#playBtn?.addEventListener("click", () => {
      this.config.card?.sendCommand("media_play_pause", {});
    });

    this.#prevBtn?.addEventListener("click", () =>
      this.config.card?.sendCommand("media_previous_track", {}));

    this.#nextBtn?.addEventListener("click", () =>
      this.config.card?.sendCommand("media_next_track", {}));

    this.#muteBtn?.addEventListener("click", () =>
      this.config.card?.sendCommand("volume_mute", { is_volume_muted: !this.#isMuted }));

    this.#volumeSlider?.addEventListener("input", (e) =>
      this.#volumeDebounce(parseInt(e.target.value, 10) / 100));

    this.#sourceSelect?.addEventListener("change", (e) => {
      if (e.target.value) {
        this.config.card?.sendCommand("select_source", { source: e.target.value });
      }
    });

    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, attributes) {
    const isPlaying = state === "playing";

    if (this.#stateLabel) {
      this.#stateLabel.textContent = this.i18n.t(`state.${state}`) !== `state.${state}`
        ? this.i18n.t(`state.${state}`)
        : state;
    }

    if (this.#mediaArtistEl) {
      this.#mediaArtistEl.textContent = attributes.media_artist ?? "";
    }

    if (this.#mediaTitleEl) {
      this.#mediaTitleEl.textContent =
        attributes.media_title ?? attributes.media_album_name ?? "";
    }

    if (this.#playBtn) {
      this.#playBtn.setAttribute("aria-pressed", String(isPlaying));
      this.#playBtn.setAttribute("aria-label",
        `${this.def.friendly_name} - ${this.i18n.t(isPlaying ? "action.pause" : "action.play")}`);
      const iconName = isPlaying ? "mdi:pause" : "mdi:play";
      this.#playBtn.innerHTML = renderIconSVG(iconName, "play-icon");
    }

    if (this.#volumeSlider && !this.isFocused(this.#volumeSlider) && attributes.volume_level !== undefined) {
      this.#volumeSlider.value = String(Math.round(attributes.volume_level * 100));
    }

    this.#isMuted = !!attributes.is_volume_muted;
    if (this.#muteBtn) {
      const iconName = this.#isMuted ? "mdi:volume-off" : "mdi:volume-high";
      this.#muteBtn.innerHTML = renderIconSVG(iconName, "mute-icon");
      this.#muteBtn.setAttribute("aria-label",
        `${this.def.friendly_name} - ${this.i18n.t(this.#isMuted ? "action.unmute" : "action.mute")}`);
    }

    if (this.#sourceSelect && attributes.source_list) {
      const current = attributes.source ?? "";
      const wanted = new Set(attributes.source_list);
      // Remove stale options no longer in source_list.
      for (const opt of [...this.#sourceSelect.options]) {
        if (opt.value && !wanted.has(opt.value)) {
          opt.remove();
        }
      }
      // Add any new sources.
      const existing = new Set(
        [...this.#sourceSelect.options].map((o) => o.value).filter(Boolean),
      );
      for (const src of attributes.source_list) {
        if (!existing.has(src)) {
          const opt = document.createElement("option");
          opt.value = src;
          opt.textContent = src;
          this.#sourceSelect.appendChild(opt);
        }
      }
      if (!this.isFocused(this.#sourceSelect)) this.#sourceSelect.value = current;
    }

    const iconName = this.def.icon_state_map?.[state]
      ?? this.def.icon
      ?? (isPlaying ? "mdi:cast-connected" : "mdi:cast");
    this.renderIcon(iconName, "card-icon");

    const stateLabel = this.i18n.t(`state.${state}`) !== `state.${state}`
      ? this.i18n.t(`state.${state}`) : state;
    const title = attributes.media_title ?? "";
    this.announceState(
      `${this.def.friendly_name}, ${stateLabel}${title ? ` - ${title}` : ""}`,
    );
  }

  #sendVolume(fraction) {
    this.config.card?.sendCommand("volume_set", { volume_level: fraction });
  }
}
