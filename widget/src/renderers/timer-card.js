/**
 * renderers/timer-card.js - Renderer for the "timer" domain.
 *
 * Displays a countdown when active/paused and Start/Pause/Cancel/Finish
 * buttons when read-write. The countdown ticks locally using the
 * finishes_at attribute from HA.
 */

import { BaseCard } from "./base-card.js";

const TIMER_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--hrv-spacing-s);
    margin-top: var(--hrv-spacing-xs);
  }

  [part=timer-display] {
    font-size: 2rem;
    font-weight: var(--hrv-font-weight-bold);
    color: var(--hrv-color-text);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  [part=timer-display][data-paused=true] {
    opacity: 0.6;
  }

  [part=state-label] {
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
  }

  .hrv-timer-controls {
    display: flex;
    gap: var(--hrv-spacing-xs);
    width: 100%;
  }

  .hrv-timer-btn {
    flex: 1;
    padding: var(--hrv-spacing-xs) var(--hrv-spacing-s);
    border: 1px solid var(--hrv-color-border);
    border-radius: var(--hrv-radius-s);
    background: var(--hrv-color-surface-alt);
    color: var(--hrv-color-text);
    font-size: var(--hrv-font-size-s);
    font-family: inherit;
    cursor: pointer;
    transition: opacity var(--hrv-transition-speed);
  }

  .hrv-timer-btn:hover  { opacity: 0.8; }
  .hrv-timer-btn:active { opacity: 0.6; }
  .hrv-timer-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .hrv-timer-btn-primary {
    background: var(--hrv-color-primary);
    color: var(--hrv-color-on-primary);
    border-color: transparent;
  }
`;

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function _formatTime(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export class TimerCard extends BaseCard {
  /** @type {HTMLElement|null}       */ #displayEl   = null;
  /** @type {HTMLElement|null}       */ #stateLabel  = null;
  /** @type {HTMLButtonElement|null} */ #startBtn    = null;
  /** @type {HTMLButtonElement|null} */ #pauseBtn    = null;
  /** @type {HTMLButtonElement|null} */ #cancelBtn   = null;
  /** @type {HTMLButtonElement|null} */ #finishBtn   = null;
  /** @type {ReturnType<typeof setInterval>|null} */ #tickInterval = null;
  /** @type {string}  */ #lastState     = "idle";
  /** @type {object}  */ #lastAttrs     = {};
  /** @type {string|null} */ #finishesAt = null;
  /** @type {number|null} */ #remaining  = null;

  render() {
    const isWritable = this.def.capabilities === "read-write";

    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${TIMER_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <span part="timer-display">00:00</span>
          <span part="state-label"></span>
          ${isWritable ? /* html */`
            <div class="hrv-timer-controls">
              <button part="start-button" class="hrv-timer-btn hrv-timer-btn-primary" type="button">Start</button>
              <button part="pause-button" class="hrv-timer-btn" type="button">Pause</button>
              <button part="cancel-button" class="hrv-timer-btn" type="button">Cancel</button>
              <button part="finish-button" class="hrv-timer-btn" type="button">Finish</button>
            </div>
          ` : ""}
        </div>
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#displayEl  = this.root.querySelector("[part=timer-display]");
    this.#stateLabel = this.root.querySelector("[part=state-label]");
    this.#startBtn   = this.root.querySelector("[part=start-button]");
    this.#pauseBtn   = this.root.querySelector("[part=pause-button]");
    this.#cancelBtn  = this.root.querySelector("[part=cancel-button]");
    this.#finishBtn  = this.root.querySelector("[part=finish-button]");

    this.renderIcon(this.def.icon ?? "mdi:timer-outline", "card-icon");

    this.#startBtn?.addEventListener("click",  () => this.config.card?.sendCommand("start", {}));
    this.#pauseBtn?.addEventListener("click",  () => this.config.card?.sendCommand("pause", {}));
    this.#cancelBtn?.addEventListener("click", () => this.config.card?.sendCommand("cancel", {}));
    this.#finishBtn?.addEventListener("click", () => this.config.card?.sendCommand("finish", {}));

    this.renderCompanions();
  }

  applyState(state, attributes) {
    this.#lastState = state;
    this.#lastAttrs = { ...attributes };

    if (this.#stateLabel) {
      const label = this.i18n.t(`state.${state}`) !== `state.${state}`
        ? this.i18n.t(`state.${state}`)
        : state;
      this.#stateLabel.textContent = label;
    }

    this.#finishesAt = attributes.finishes_at ?? null;
    this.#remaining  = attributes.remaining != null ? this.#parseDuration(attributes.remaining) : null;

    this.#updateButtons(state);
    this.#updateDisplay(state);

    // Start or stop the tick interval based on state.
    if (state === "active" && this.#finishesAt) {
      this.#startTick();
    } else {
      this.#stopTick();
    }

    const iconName = this.def.icon_state_map?.[state]
      ?? this.def.icon
      ?? _timerIcon(state);
    this.renderIcon(iconName, "card-icon");

    if (this.#displayEl) {
      this.#displayEl.setAttribute("data-paused", String(state === "paused"));
    }
  }

  predictState(action, _data) {
    const attrs = { ...this.#lastAttrs };
    if (action === "start") {
      return { state: "active", attributes: attrs };
    }
    if (action === "pause") {
      return { state: "paused", attributes: attrs };
    }
    if (action === "cancel" || action === "finish") {
      return { state: "idle", attributes: attrs };
    }
    return null;
  }

  #updateButtons(state) {
    const isIdle   = state === "idle";
    const isActive = state === "active";
    const isPaused = state === "paused";

    if (this.#startBtn)  this.#startBtn.disabled  = isActive;
    if (this.#pauseBtn)  this.#pauseBtn.disabled  = !isActive;
    if (this.#cancelBtn) this.#cancelBtn.disabled = isIdle;
    if (this.#finishBtn) this.#finishBtn.disabled = isIdle;

    if (this.#startBtn) {
      this.#startBtn.textContent = isPaused ? "Resume" : "Start";
    }
  }

  #updateDisplay(state) {
    if (!this.#displayEl) return;

    if (state === "idle") {
      const dur = this.#lastAttrs.duration;
      this.#displayEl.textContent = dur ? this.#formatDuration(dur) : "00:00";
      return;
    }

    if (state === "paused" && this.#remaining != null) {
      this.#displayEl.textContent = _formatTime(this.#remaining);
      return;
    }

    if (state === "active" && this.#finishesAt) {
      const secs = Math.max(0, (new Date(this.#finishesAt).getTime() - Date.now()) / 1000);
      this.#displayEl.textContent = _formatTime(secs);
    }
  }

  #startTick() {
    this.#stopTick();
    this.#tickInterval = setInterval(() => {
      if (!this.#finishesAt || this.#lastState !== "active") {
        this.#stopTick();
        return;
      }
      const secs = Math.max(0, (new Date(this.#finishesAt).getTime() - Date.now()) / 1000);
      if (this.#displayEl) this.#displayEl.textContent = _formatTime(secs);
      if (secs <= 0) this.#stopTick();
    }, 1000);
  }

  #stopTick() {
    if (this.#tickInterval) {
      clearInterval(this.#tickInterval);
      this.#tickInterval = null;
    }
  }

  #parseDuration(dur) {
    if (typeof dur === "number") return dur;
    if (typeof dur !== "string") return 0;
    const parts = dur.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  #formatDuration(dur) {
    return _formatTime(this.#parseDuration(dur));
  }
}

function _timerIcon(state) {
  if (state === "active") return "mdi:timer";
  if (state === "paused") return "mdi:timer-pause";
  return "mdi:timer-outline";
}
