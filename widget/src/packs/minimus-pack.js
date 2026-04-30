/**
 * minimus-pack.js - HArvest Minimus renderer pack.
 *
 * A collection of alternative renderers that override built-in widgets.
 * Loaded at runtime via script injection; references window.HArvest globals.
 */
(function () {
  "use strict";

  const HArvest = window.HArvest;
  if (!HArvest || !HArvest.renderers || !HArvest.renderers.BaseCard) {
    console.warn("[HArvest Minimus] HArvest not found - pack not loaded.");
    return;
  }

  const BaseCard = HArvest.renderers.BaseCard;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function _esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function _debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn.apply(this, args); }, ms);
    };
  }

  function _capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
  }

  // Shared companion dot styles for all cards that don't extend DIAL_STYLES.
  // Shows each companion as a colored circle; hides the base-card icon and text.
  const COMPANION_DOT_STYLES = /* css */`
    [part=companion-zone] {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      padding: 8px var(--hrv-card-padding, 16px) var(--hrv-card-padding, 16px);
      border-top: none;
      margin-top: 0;
    }
    [part=companion-zone]:empty { display: none; }
    [part=companion] {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      border: none;
      padding: 0;
      cursor: default;
      flex-shrink: 0;
      box-shadow: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s);
    }
    [part=companion][data-on=true] { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    [part=companion][data-interactive=true] { cursor: pointer; }
    [part=companion][data-interactive=true]:hover { opacity: 0.88; }
    [part=companion-icon]  { display: none; }
    [part=companion-state] { display: none; }
  `;

  // Set each companion dot's tooltip from its aria-label (entity ID initially;
  // base-card updateCompanionState() will enrich it with state when data arrives).
  function _applyCompanionTooltips(root) {
    root.querySelectorAll("[part=companion]").forEach((el) => {
      el.title = el.getAttribute("aria-label") ?? "";
    });
  }

  // ---------------------------------------------------------------------------
  // SVG arc helpers - stroke-dashoffset approach
  // ---------------------------------------------------------------------------

  const ARC_CX = 60;
  const ARC_CY = 60;
  const ARC_R = 48;
  const ARC_START_DEG = 225;
  const ARC_SWEEP_DEG = 270;
  const ARC_LENGTH = 2 * Math.PI * ARC_R * (ARC_SWEEP_DEG / 360);

  function _degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function _arcPoint(angleDeg) {
    const rad = _degToRad(angleDeg);
    return {
      x: ARC_CX + ARC_R * Math.cos(rad),
      y: ARC_CY - ARC_R * Math.sin(rad),
    };
  }

  function _trackPath() {
    const start = _arcPoint(ARC_START_DEG);
    const end = _arcPoint(ARC_START_DEG - ARC_SWEEP_DEG);
    return `M ${start.x} ${start.y} A ${ARC_R} ${ARC_R} 0 1 1 ${end.x} ${end.y}`;
  }

  // ---------------------------------------------------------------------------
  // DialLightCard
  // ---------------------------------------------------------------------------

  const TRACK_D = _trackPath();
  const DIAL_MODES = ["brightness", "temp", "color"];
  const ARC_SEG_COUNT = 120;

  function _buildArcSegments(colorFn) {
    const segSweep = ARC_SWEEP_DEG / ARC_SEG_COUNT;
    let html = "";
    for (let i = 0; i < ARC_SEG_COUNT; i++) {
      const startAngle = ARC_START_DEG - i * segSweep;
      const endAngle = ARC_START_DEG - (i + 1) * segSweep;
      const s = _arcPoint(startAngle);
      const e = _arcPoint(endAngle);
      const d = `M ${s.x} ${s.y} A ${ARC_R} ${ARC_R} 0 0 1 ${e.x} ${e.y}`;
      const cap = (i === 0 || i === ARC_SEG_COUNT - 1) ? "round" : "butt";
      html += `<path d="${d}" stroke="${colorFn(i / ARC_SEG_COUNT)}" fill="none" stroke-width="8" stroke-linecap="${cap}" />`;
    }
    return html;
  }

  const RAINBOW_SEGS = _buildArcSegments(
    (t) => `hsl(${Math.round(t * 360)},100%,50%)`,
  );

  const TEMP_SEGS = _buildArcSegments((t) => {
    const r = 255;
    const g = Math.round(143 + (255 - 143) * t);
    const b = Math.round(255 * t);
    return `rgb(${r},${g},${b})`;
  });

  const DIAL_STYLES = /* css */`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      align-items: stretch;
      gap: 10px;
    }

    [part=card-body].hrv-no-dial {
      align-items: center;
      justify-content: center;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-dial-column {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    [part=companion-zone] {
      margin-top: 6px;
      border-top: none;
      padding-top: 0;
      padding-bottom: var(--hrv-card-padding, 16px);
      justify-content: center;
      gap: 12px;
    }

    [part=companion-zone]:empty { display: none; }

    [part=companion] {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      border: none;
      padding: 0;
      cursor: default;
      flex-shrink: 0;
      box-shadow: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s);
    }

    [part=companion][data-on=true] { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    [part=companion][data-interactive=true] { cursor: pointer; }
    [part=companion][data-interactive=true]:hover { opacity: 0.88; }

    [part=companion-icon] { display: none; }
    [part=companion-state] { display: none; }

    .hrv-dial-wrap {
      position: relative;
      flex: none;
      width: 100%;
      aspect-ratio: 1 / 1;
      touch-action: none;
      cursor: grab;
    }
    .hrv-dial-wrap:active { cursor: grabbing; }
    .hrv-dial-thumb-hit {
      touch-action: none;
      cursor: grab;
      fill: transparent;
    }
    .hrv-dial-thumb-hit:active { cursor: grabbing; }

    .hrv-dial-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-shrink: 0;
    }

    .hrv-dial-wrap svg {
      width: 100%;
      height: 100%;
    }

    .hrv-dial-track {
      fill: none;
      stroke: var(--hrv-color-surface-alt, #e0e0e0);
      stroke-width: 8;
      stroke-linecap: round;
    }

    .hrv-dial-fill {
      fill: none;
      stroke: var(--hrv-color-state-on, #ffc107);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.15s ease;
    }

    .hrv-dial-segs { display: none; }
    .hrv-dial-segs-visible { display: block; }

    .hrv-dial-thumb {
      fill: none;
      stroke: var(--hrv-ex-ring, #fff);
      stroke-width: 1.5;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
      transition: cx 0.15s ease, cy 0.15s ease;
    }

    .hrv-dial-pct {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: var(--hrv-font-size-l, 18px);
      font-weight: var(--hrv-font-weight-bold, 700);
      color: var(--hrv-color-text, #1a1a1a);
      pointer-events: none;
      user-select: none;
    }

    .hrv-mode-switch {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 36px;
      height: 84px;
      background: var(--hrv-color-surface-alt, #e0e0e0);
      border-radius: 18px;
      position: relative;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }

    .hrv-mode-switch[data-count="2"] { height: 56px; }

    .hrv-mode-switch-thumb {
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      left: 6px;
      top: 2px;
      transition: top 0.15s ease;
      pointer-events: none;
    }

    .hrv-mode-switch[data-pos="1"] .hrv-mode-switch-thumb { top: 30px; }
    .hrv-mode-switch[data-pos="2"] .hrv-mode-switch-thumb { top: 58px; }

    .hrv-mode-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--hrv-color-text-secondary, #888);
      left: 15px;
      opacity: 0.4;
    }

    .hrv-mode-dot:nth-child(2) { top: 11px; }
    .hrv-mode-dot:nth-child(3) { top: 39px; }
    .hrv-mode-dot:nth-child(4) { top: 67px; }

    .hrv-mode-switch[data-pos="0"] .hrv-mode-dot:nth-child(2),
    .hrv-mode-switch[data-pos="1"] .hrv-mode-dot:nth-child(3),
    .hrv-mode-switch[data-pos="2"] .hrv-mode-dot:nth-child(4) { opacity: 0; }

    [part=toggle-button] {
      width: 44px;
      height: 44px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      cursor: pointer;
      box-shadow: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s);
    }

    [part=toggle-button]:hover { opacity: 0.88; }
    [part=toggle-button]:active { opacity: 0.75; }

    [part=toggle-button][aria-pressed=true] {
      box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff);
    }

    [part=toggle-button][aria-pressed=false] {
      box-shadow: none;
    }

    .hrv-light-ro-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: var(--hrv-spacing-m, 16px) 0;
    }
    .hrv-light-ro-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      box-shadow: 0 0 0 0 transparent;
      transition: box-shadow 200ms ease, opacity 200ms ease;
    }
    .hrv-light-ro-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }
    .hrv-light-ro-circle [part=ro-state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    .hrv-light-ro-circle [part=ro-state-icon] svg { width: 40px; height: 40px; }
    .hrv-light-ro-dots {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .hrv-light-ro-dots:empty { display: none; }
    .hrv-light-ro-dot {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--hrv-ex-dot-bg, rgba(255,255,255,0.45));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--hrv-ex-dot-text, #000);
      line-height: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-dial-fill { transition: none; }
      .hrv-dial-thumb { transition: none; }
      .hrv-mode-switch-thumb { transition: none; }
    }
  `;

  // Light-specific toggle override: vertical pill switch (same as SwitchCard).
  // Applied only to DialLightCard's style block so FanCard toggle stays circular.
  const LIGHT_TOGGLE_STYLES = /* css */`
    [part=toggle-button] {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      position: relative;
      width: 36px;
      height: 72px;
      border-radius: 18px;
      background: var(--hrv-ex-toggle-idle, rgba(255,255,255,0.25));
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.3));
      cursor: pointer;
      padding: 0;
      margin: 0;
      outline: none;
      font: inherit;
      color: inherit;
      transition: background 250ms ease, border-color 250ms ease;
    }
    [part=toggle-button]:focus-visible {
      box-shadow: 0 0 0 3px var(--hrv-color-primary, #1976d2);
    }
    [part=toggle-button][aria-pressed=true] {
      background: var(--hrv-color-primary, #1976d2);
      border-color: var(--hrv-color-primary, #1976d2);
      box-shadow: none;
    }
    .hrv-dial-wrap {
      max-width: 200px;
      margin: 0 auto;
    }
    [part=toggle-button]:hover { opacity: 0.85; }
    [part=toggle-button]:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hrv-light-toggle-knob {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: top 200ms ease;
      pointer-events: none;
      top: 40px;
    }
    [part=toggle-button][aria-pressed=true] .hrv-light-toggle-knob { top: 4px; }
    @media (prefers-reduced-motion: reduce) {
      [part=toggle-button],
      .hrv-light-toggle-knob { transition: none; }
    }
  `;

  class DialLightCard extends BaseCard {
    #toggleBtn = null;
    #dialFill = null;
    #dialTrack = null;
    #dialThumb = null;
    #dialPct = null;
    #dialSvg = null;
    #modeSwitch = null;
    #colorSegs = null;
    #tempSegs = null;
    #brightness = 0;
    #colorTempK = 4000;
    #hue = 0;
    #isOn = false;
    #dragging = false;
    #dialThumbHit = null;
    #mode = 0; // 0=brightness, 1=temp, 2=color
    #minCt = 2000;
    #maxCt = 6500;
    #sendValue;
    #companionStates = new Map();

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendValue = _debounce(this.#doSendValue.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const features = this.def.supported_features ?? [];
      const hasBrightness = features.includes("brightness");
      const hasColorTemp = features.includes("color_temp");
      const hasColor = features.includes("rgb_color");
      const showDial = isWritable && (hasBrightness || hasColorTemp || hasColor);
      const modeCount = [hasBrightness, hasColorTemp, hasColor].filter(Boolean).length;
      const showSwitch = isWritable && modeCount > 1;
      this.#minCt = this.def.feature_config?.min_color_temp_kelvin ?? 2000;
      this.#maxCt = this.def.feature_config?.max_color_temp_kelvin ?? 6500;

      const startPt = _arcPoint(ARC_START_DEG);

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${DIAL_STYLES}${LIGHT_TOGGLE_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${showDial ? "" : "hrv-no-dial"}">
            ${showDial ? /* html */`
              <div class="hrv-dial-column">
                <div class="hrv-dial-wrap" role="slider" aria-valuemin="0"
                  aria-valuemax="100" aria-valuenow="0"
                  aria-label="${_esc(this.def.friendly_name)} brightness"
                  title="Drag to adjust">
                  <svg viewBox="0 0 120 120">
                    <g class="hrv-dial-segs hrv-dial-segs-color">${RAINBOW_SEGS}</g>
                    <g class="hrv-dial-segs hrv-dial-segs-temp">${TEMP_SEGS}</g>
                    <path class="hrv-dial-track" d="${TRACK_D}" />
                    <path class="hrv-dial-fill" d="${TRACK_D}"
                      stroke-dasharray="${ARC_LENGTH}"
                      stroke-dashoffset="${ARC_LENGTH}" />
                    <circle class="hrv-dial-thumb" r="7"
                      cx="${startPt.x}" cy="${startPt.y}" />
                    <circle class="hrv-dial-thumb-hit" r="16"
                      cx="${startPt.x}" cy="${startPt.y}" />
                  </svg>
                  <span class="hrv-dial-pct">0%</span>
                </div>
                <div part="companion-zone" role="group" aria-label="Companions"></div>
              </div>
            ` : !isWritable ? /* html */`
              <div class="hrv-light-ro-center">
                <div class="hrv-light-ro-circle" data-on="false"
                  role="img" aria-label="${_esc(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
                <div class="hrv-light-ro-dots">
                  ${hasBrightness ? '<span class="hrv-light-ro-dot" data-attr="brightness" title="Brightness"></span>' : ""}
                  ${hasColorTemp ? '<span class="hrv-light-ro-dot" data-attr="temp" title="Color temperature"></span>' : ""}
                  ${hasColor ? '<span class="hrv-light-ro-dot" data-attr="color" title="Color"></span>' : ""}
                </div>
              </div>
            ` : ""}
            ${isWritable ? /* html */`
              <div class="hrv-dial-controls">
                ${showSwitch ? /* html */`
                  <div class="hrv-mode-switch" data-pos="0" data-count="${modeCount}"
                    role="radiogroup" aria-label="Dial mode" tabindex="0">
                    <div class="hrv-mode-switch-thumb"></div>
                    ${"<span class=\"hrv-mode-dot\"></span>".repeat(modeCount)}
                  </div>
                ` : ""}
                <button part="toggle-button" type="button"
                  aria-label="${_esc(this.def.friendly_name)} - toggle"
                  title="Turn ${_esc(this.def.friendly_name)} on / off">
                  <div class="hrv-light-toggle-knob"></div>
                </button>
              </div>
            ` : ""}
          </div>
          ${!showDial ? this.renderCompanionZoneHTML() : ""}
        </div>
      `;

      this.#toggleBtn = this.root.querySelector("[part=toggle-button]");
      this.#dialFill = this.root.querySelector(".hrv-dial-fill");
      this.#dialTrack = this.root.querySelector(".hrv-dial-track");
      this.#dialThumb = this.root.querySelector(".hrv-dial-thumb");
      this.#dialPct = this.root.querySelector(".hrv-dial-pct");
      this.#dialSvg = this.root.querySelector(".hrv-dial-wrap");
      this.#dialThumbHit = this.root.querySelector(".hrv-dial-thumb-hit");
      this.#colorSegs = this.root.querySelector(".hrv-dial-segs-color");
      this.#tempSegs = this.root.querySelector(".hrv-dial-segs-temp");
      this.#modeSwitch = this.root.querySelector(".hrv-mode-switch");

      if (this.#toggleBtn) {
        this._attachGestureHandlers(this.#toggleBtn, {
          onTap: () => {
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("toggle", {});
          },
        });
      }

      if (this.#dialSvg) {
        this.#dialSvg.addEventListener("pointerdown", this.#onPointerDown.bind(this));
        this.#dialSvg.addEventListener("pointermove", this.#onPointerMove.bind(this));
        this.#dialSvg.addEventListener("pointerup", this.#onPointerUp.bind(this));
        this.#dialSvg.addEventListener("pointercancel", this.#onPointerUp.bind(this));
      }

      if (showDial) this.#buildModeMap();

      if (this.#modeSwitch) {
        this.#modeSwitch.addEventListener("click", this.#onModeSwitchClick.bind(this));
        this.#modeSwitch.addEventListener("keydown", this.#onModeSwitchKey.bind(this));
        this.#modeSwitch.addEventListener("mousemove", this.#onModeSwitchHover.bind(this));
      }

      this.#applyModeVisuals();

      if (this.root.querySelector("[part=ro-state-icon]")) {
        this.renderIcon(this.resolveIcon(this.def.icon, "mdi:lightbulb"), "ro-state-icon");
      }

      this.renderCompanions();
      this.root.querySelectorAll("[part=companion]").forEach((el) => {
        el.title = el.getAttribute("aria-label") ?? "Companion";
        const entityId = el.getAttribute("data-entity");
        if (entityId && this.#companionStates.has(entityId)) {
          const state = this.#companionStates.get(entityId);
          el.setAttribute("data-on", String(state === "on"));
        }
      });
    }

    #availableModes() {
      const features = this.def.supported_features ?? [];
      const modes = [];
      if (features.includes("brightness")) modes.push("brightness");
      if (features.includes("color_temp")) modes.push("temp");
      if (features.includes("rgb_color")) modes.push("color");
      return modes.length > 0 ? modes : ["brightness"];
    }

    #modeMap = [];

    #buildModeMap() {
      const features = this.def.supported_features ?? [];
      const has = [
        features.includes("brightness"),
        features.includes("color_temp"),
        features.includes("rgb_color"),
      ];
      this.#modeMap = [];
      if (has[0]) this.#modeMap.push(0);
      if (has[1]) this.#modeMap.push(1);
      if (has[2]) this.#modeMap.push(2);
      if (this.#modeMap.length === 0) this.#modeMap.push(0);
      if (!this.#modeMap.includes(this.#mode)) {
        this.#mode = this.#modeMap[0];
      }
    }

    #onModeSwitchClick(e) {
      const rect = this.#modeSwitch.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const third = rect.height / 3;
      let pos;
      if (y < third) pos = 0;
      else if (y < third * 2) pos = 1;
      else pos = 2;
      pos = Math.min(pos, this.#modeMap.length - 1);
      this.#mode = this.#modeMap[pos];
      this.#modeSwitch.setAttribute("data-pos", String(pos));
      this.#applyModeVisuals();
      this.#switchDialImmediate();
    }

    #onModeSwitchHover(e) {
      const modeNames = { brightness: "Brightness", temp: "Color Temperature", color: "Color" };
      const rect = this.#modeSwitch.getBoundingClientRect();
      const pos = Math.min(Math.floor((e.clientY - rect.top) / (rect.height / this.#modeMap.length)), this.#modeMap.length - 1);
      const mode = DIAL_MODES[this.#modeMap[Math.max(0, pos)]];
      this.#modeSwitch.title = `Dial mode: ${modeNames[mode] ?? mode}`;
    }

    #onModeSwitchKey(e) {
      const posNow = this.#modeMap.indexOf(this.#mode);
      let next = posNow;
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = Math.max(0, posNow - 1);
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") next = Math.min(this.#modeMap.length - 1, posNow + 1);
      else return;
      e.preventDefault();
      this.#mode = this.#modeMap[next];
      this.#modeSwitch.setAttribute("data-pos", String(next));
      this.#applyModeVisuals();
      this.#switchDialImmediate();
    }

    #switchDialImmediate() {
      if (this.#dialThumb) this.#dialThumb.style.transition = "none";
      if (this.#dialFill) this.#dialFill.style.transition = "none";
      this.#syncDialToCurrentMode();
      this.#dialThumb?.getBoundingClientRect();
      this.#dialFill?.getBoundingClientRect();
      if (this.#dialThumb) this.#dialThumb.style.transition = "";
      if (this.#dialFill) this.#dialFill.style.transition = "";
    }

    #applyModeVisuals() {
      if (!this.#dialFill) return;
      const mode = DIAL_MODES[this.#mode];
      const showSegs = mode === "color" || mode === "temp";

      this.#dialTrack.style.display = showSegs ? "none" : "";
      this.#dialFill.style.display = showSegs ? "none" : "";

      if (this.#colorSegs) {
        this.#colorSegs.classList.toggle("hrv-dial-segs-visible", mode === "color");
      }
      if (this.#tempSegs) {
        this.#tempSegs.classList.toggle("hrv-dial-segs-visible", mode === "temp");
      }

      if (mode === "brightness") {
        this.#dialFill.setAttribute("stroke-dasharray", String(ARC_LENGTH));
      }

      const labels = { brightness: "brightness", temp: "color temperature", color: "color" };
      const titleLabels = { brightness: "Drag to adjust brightness", temp: "Drag to adjust color temperature", color: "Drag to adjust color" };
      this.#dialSvg?.setAttribute("aria-label", `${_esc(this.def.friendly_name)} ${labels[mode]}`);
      if (this.#dialSvg) this.#dialSvg.title = titleLabels[mode];
    }

    #syncDialToCurrentMode() {
      const mode = DIAL_MODES[this.#mode];
      if (mode === "brightness") {
        const display = this.#isOn ? this.#brightness : 0;
        this.#updateDial(Math.round((display / 255) * 100));
      } else if (mode === "temp") {
        const pct = Math.round(((this.#colorTempK - this.#minCt) / (this.#maxCt - this.#minCt)) * 100);
        this.#updateDial(Math.max(0, Math.min(100, pct)));
      } else {
        const pct = Math.round((this.#hue / 360) * 100);
        this.#updateDial(pct);
      }
    }

    #updateDial(pct) {
      const mode = DIAL_MODES[this.#mode];
      const sweep = (pct / 100) * ARC_SWEEP_DEG;
      const thumbPos = _arcPoint(ARC_START_DEG - sweep);
      this.#dialThumb?.setAttribute("cx", String(thumbPos.x));
      this.#dialThumb?.setAttribute("cy", String(thumbPos.y));
      this.#dialThumbHit?.setAttribute("cx", String(thumbPos.x));
      this.#dialThumbHit?.setAttribute("cy", String(thumbPos.y));

      if (mode === "brightness") {
        const offset = ARC_LENGTH * (1 - pct / 100);
        this.#dialFill?.setAttribute("stroke-dashoffset", String(offset));
        if (this.#dialPct) this.#dialPct.textContent = pct + "%";
        this.#dialSvg?.setAttribute("aria-valuenow", String(pct));
      } else if (mode === "temp") {
        const k = Math.round(this.#minCt + (pct / 100) * (this.#maxCt - this.#minCt));
        if (this.#dialPct) this.#dialPct.textContent = k + "K";
        this.#dialSvg?.setAttribute("aria-valuenow", String(k));
      } else {
        if (this.#dialPct) this.#dialPct.textContent = Math.round((pct / 100) * 360) + "°";
        this.#dialSvg?.setAttribute("aria-valuenow", String(Math.round((pct / 100) * 360)));
      }
    }

    applyState(state, attributes) {
      this.#isOn = state === "on";
      this.#brightness = attributes?.brightness ?? 0;

      if (attributes?.color_temp_kelvin !== undefined) {
        this.#colorTempK = attributes.color_temp_kelvin;
      } else if (attributes?.color_temp !== undefined && attributes.color_temp > 0) {
        this.#colorTempK = Math.round(1_000_000 / attributes.color_temp);
      }

      if (attributes?.hs_color) {
        this.#hue = Math.round(attributes.hs_color[0]);
      } else if (attributes?.rgb_color) {
        const [r, g, b] = attributes.rgb_color;
        this.#hue = _rgbToHue(r, g, b);
      }

      if (this.#toggleBtn) {
        this.#toggleBtn.setAttribute("aria-pressed", String(this.#isOn));
      }

      const roCircle = this.root.querySelector(".hrv-light-ro-circle");
      if (roCircle) {
        roCircle.setAttribute("data-on", String(this.#isOn));
        const domainDefault = this.#isOn ? "mdi:lightbulb" : "mdi:lightbulb-outline";
        const rawIcon = this.def.icon_state_map?.[state]
          ?? this.def.icon_state_map?.["*"]
          ?? this.def.icon
          ?? domainDefault;
        this.renderIcon(this.resolveIcon(rawIcon, domainDefault), "ro-state-icon");

        const colorMode = attributes?.color_mode;
        const inTempMode = colorMode === "color_temp";
        const inColorMode = colorMode && colorMode !== "color_temp";

        const bDot = this.root.querySelector('[data-attr="brightness"]');
        if (bDot) {
          const pct = Math.round((this.#brightness / 255) * 100);
          bDot.title = this.#isOn ? `Brightness: ${pct}%` : "Brightness: off";
        }

        const tDot = this.root.querySelector('[data-attr="temp"]');
        if (tDot) {
          tDot.title = `Color temperature: ${this.#colorTempK}K`;
          tDot.style.display = inColorMode ? "none" : "";
        }

        const cDot = this.root.querySelector('[data-attr="color"]');
        if (cDot) {
          cDot.style.display = inTempMode ? "none" : "";
          if (attributes?.rgb_color) {
            const [r, g, b] = attributes.rgb_color;
            cDot.style.background = `rgb(${r},${g},${b})`;
            cDot.title = `Color: rgb(${r}, ${g}, ${b})`;
          } else {
            cDot.style.background = `hsl(${this.#hue}, 100%, 50%)`;
            cDot.title = `Color: hue ${this.#hue}°`;
          }
        }
      }

      this.#switchDialImmediate();
    }

    predictState(action, data) {
      if (action === "toggle") {
        return { state: this.#isOn ? "off" : "on", attributes: { brightness: this.#brightness } };
      }
      if (action === "turn_on" && data.brightness !== undefined) {
        return { state: "on", attributes: { brightness: data.brightness } };
      }
      return null;
    }

    // --- Dial pointer interaction ---

    #onPointerDown(e) {
      this.#dragging = true;
      this.#dialSvg?.setPointerCapture(e.pointerId);
      this.#updateFromPointer(e);
    }

    #onPointerMove(e) {
      if (!this.#dragging) return;
      this.#updateFromPointer(e);
    }

    #onPointerUp(e) {
      if (!this.#dragging) return;
      this.#dragging = false;
      try { this.#dialSvg?.releasePointerCapture(e.pointerId); } catch (_) {}
      this.#sendValue();
    }

    #updateFromPointer(e) {
      if (!this.#dialSvg) return;
      const rect = this.#dialSvg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = -(e.clientY - cy);
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      let offset = ARC_START_DEG - angleDeg;
      if (offset < 0) offset += 360;

      if (offset > ARC_SWEEP_DEG) {
        offset = offset > ARC_SWEEP_DEG + (360 - ARC_SWEEP_DEG) / 2
          ? 0
          : ARC_SWEEP_DEG;
      }

      const pct = Math.round((offset / ARC_SWEEP_DEG) * 100);
      const mode = DIAL_MODES[this.#mode];

      if (mode === "brightness") {
        this.#brightness = Math.round((pct / 100) * 255);
      } else if (mode === "temp") {
        this.#colorTempK = Math.round(this.#minCt + (pct / 100) * (this.#maxCt - this.#minCt));
      } else {
        this.#hue = Math.round((pct / 100) * 360);
      }

      if (this.#dialFill) this.#dialFill.style.transition = "none";
      if (this.#dialThumb) this.#dialThumb.style.transition = "none";
      this.#updateDial(pct);
    }

    #doSendValue() {
      if (this.#dialFill) this.#dialFill.style.transition = "";
      if (this.#dialThumb) this.#dialThumb.style.transition = "";
      const mode = DIAL_MODES[this.#mode];
      if (mode === "brightness") {
        if (this.#brightness === 0) {
          this.config.card?.sendCommand("turn_off", {});
        } else {
          this.config.card?.sendCommand("turn_on", { brightness: this.#brightness });
        }
      } else if (mode === "temp") {
        this.config.card?.sendCommand("turn_on", { color_temp_kelvin: this.#colorTempK });
      } else {
        this.config.card?.sendCommand("turn_on", { hs_color: [this.#hue, 100] });
      }
    }

    updateCompanionState(entityId, state, attributes) {
      this.#companionStates.set(entityId, state);
      super.updateCompanionState(entityId, state, attributes);
    }
  }

  // ---------------------------------------------------------------------------
  // FanCard
  // ---------------------------------------------------------------------------

  const FAN_STYLES = DIAL_STYLES + /* css */`
    .hrv-fan-feat-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: var(--hrv-color-primary, #1976d2);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: box-shadow var(--hrv-transition-speed, 0.2s), opacity var(--hrv-transition-speed, 0.2s);
    }
    .hrv-fan-feat-btn[data-on=true]  { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); opacity: 1; }
    .hrv-fan-feat-btn[data-on=false] { opacity: 0.45; box-shadow: none; }
    .hrv-fan-feat-btn:hover { opacity: 0.88; }
    .hrv-dial-controls [part=toggle-button] { margin-top: 8px; }
    .hrv-fan-horiz .hrv-dial-controls [part=toggle-button] { margin-top: 0; }
    .hrv-dial-controls { padding-bottom: var(--hrv-card-padding, 16px); }
    .hrv-dial-wrap { max-width: 200px; margin: 0 auto; }
    .hrv-fan-stepped-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--hrv-card-padding, 16px) 0;
    }
    .hrv-fan-speed-circle {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: none;
      background: var(--hrv-color-primary, #1976d2);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      box-shadow: none;
      user-select: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s), opacity var(--hrv-transition-speed, 0.2s);
    }
    .hrv-fan-speed-svg {
      width: 56px;
      height: 56px;
      display: block;
      pointer-events: none;
      fill: currentColor;
    }
    .hrv-fan-speed-circle[aria-pressed=false] { opacity: 0.45; }
    .hrv-fan-speed-circle[aria-pressed=true]  { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    .hrv-fan-speed-circle:active { transition: none; opacity: 0.75; }
    .hrv-fan-hspeed-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: var(--hrv-card-padding, 16px);
    }
    .hrv-fan-hspeed-switch {
      position: relative;
      display: inline-flex;
      flex-direction: row;
      height: 32px;
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.15));
      border-radius: 16px;
      cursor: pointer;
      user-select: none;
    }
    .hrv-fan-hspeed-thumb {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      top: 2px;
      left: 2px;
      transition: left var(--hrv-transition-speed, 0.15s) ease, opacity var(--hrv-transition-speed, 0.2s);
      pointer-events: none;
      opacity: 0;
    }
    .hrv-fan-hspeed-switch[data-on=true] .hrv-fan-hspeed-thumb { opacity: 1; }
    .hrv-fan-hspeed-dot {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .hrv-fan-hspeed-dot::after {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--hrv-color-text, rgba(255,255,255,0.6));
      opacity: 0.4;
      pointer-events: none;
      display: block;
    }
    .hrv-fan-hspeed-dot[data-active=true]::after { opacity: 0; }

    .hrv-fan-ro-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--hrv-spacing-m, 16px) 0;
    }
    .hrv-fan-ro-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      box-shadow: 0 0 0 0 transparent;
      transition: box-shadow 200ms ease, opacity 200ms ease;
    }
    .hrv-fan-ro-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }
    .hrv-fan-ro-circle [part=ro-state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    .hrv-fan-ro-circle [part=ro-state-icon] svg { width: 40px; height: 40px; }
    .hrv-fan-ro-circle[data-on=true] [part=ro-state-icon] svg {
      animation: hrv-fan-spin 2s linear infinite;
      transform-origin: center;
    }
    @keyframes hrv-fan-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    [part=card-body].hrv-no-dial [part=toggle-button] {
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [part=card-body].hrv-no-dial [part=toggle-button][aria-pressed=false] { opacity: 0.45; }
    [part=fan-onoff-icon] { color: var(--hrv-color-on-primary, #fff); }
    [part=fan-onoff-icon] svg { width: 56px; height: 56px; display: block; pointer-events: none; }
    [part=toggle-button][aria-pressed=true][data-animate=true] [part=fan-onoff-icon] svg {
      animation: hrv-fan-spin 2s linear infinite;
      transform-origin: center;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-fan-hspeed-thumb { transition: none; }
      .hrv-fan-ro-circle[data-on=true] [part=ro-state-icon] svg { animation: none; }
      [part=toggle-button][aria-pressed=true][data-animate=true] [part=fan-onoff-icon] svg { animation: none; }
    }
  `;

  class FanCard extends BaseCard {
    /** @type {HTMLButtonElement|null}  */ #toggleBtn   = null;
    /** @type {SVGPathElement|null}     */ #dialFill    = null;
    /** @type {SVGPathElement|null}     */ #dialTrack   = null;
    /** @type {SVGCircleElement|null}   */ #dialThumb   = null;
    /** @type {HTMLElement|null}        */ #dialPct     = null;
    /** @type {HTMLElement|null}        */ #dialSvg     = null;
    /** @type {HTMLButtonElement|null}  */ #oscBtn      = null;
    /** @type {HTMLButtonElement|null}  */ #dirBtn      = null;
    /** @type {HTMLButtonElement|null}  */ #presetBtn   = null;
    /** @type {boolean}                 */ #isOn        = false;
    /** @type {number}                  */ #percentage  = 0;
    /** @type {boolean}                 */ #oscillating = false;
    /** @type {string}                  */ #direction   = "forward";
    /** @type {string|null}             */ #presetMode  = null;
    /** @type {string[]}                */ #presets     = [];
    /** @type {boolean}                 */ #dragging    = false;
    /** @type {SVGCircleElement|null}   */ #dialThumbHit = null;
    /** @type {Function}                */ #sendValue;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendValue = _debounce(this.#doSendSpeed.bind(this), 300);
      this.#presets = def.feature_config?.preset_modes ?? [];
    }

    get #percentageStep() {
      const fc = this.def?.feature_config;
      if (fc?.percentage_step > 1) return fc.percentage_step;
      if (fc?.speed_count > 1)     return 100 / fc.speed_count;
      return 1;
    }
    get #isStepped()      { return this.#percentageStep > 1; }
    get #isCycleFan()     { return this.#isStepped && this.#presets.length > 0; }
    get #speedSteps() {
      const step = this.#percentageStep;
      const steps = [];
      for (let i = 1; i * step <= 100.001; i++) {
        steps.push(Math.floor(i * step * 10) / 10);
      }
      return steps;
    }

    render() {
      const isWritable   = this.def.capabilities === "read-write";
      const features     = this.def.supported_features ?? [];
      const hasSpeed     = features.includes("set_speed");
      const hasOscillate = features.includes("oscillate");
      const hasDirection = features.includes("direction");
      const hasPreset    = features.includes("preset_mode");
      const showDial     = isWritable && hasSpeed;
      const isStepped    = showDial && this.#isStepped;
      const useHoriz     = isStepped && !this.#presets.length;
      const useCycle     = isStepped && !!this.#presets.length;
      const startPt      = _arcPoint(ARC_START_DEG);

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${FAN_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${showDial ? (useHoriz ? "hrv-fan-horiz" : "") : "hrv-no-dial"}">
            ${showDial ? /* html */`
              <div class="hrv-dial-column">
                ${useHoriz ? /* html */`
                  <div class="hrv-fan-hspeed-wrap">
                    <div class="hrv-fan-hspeed-switch" role="group"
                      aria-label="${_esc(this.def.friendly_name)} speed"
                      data-on="false">
                      <div class="hrv-fan-hspeed-thumb"></div>
                      ${this.#speedSteps.map((pct, i) => /* html */`
                        <div class="hrv-fan-hspeed-dot" data-pct="${pct}" data-idx="${i}"
                          data-active="false"
                          role="button" tabindex="0"
                          aria-label="Speed ${i + 1} (${pct}%)"
                          title="Speed ${i + 1} (${pct}%)"></div>
                      `).join("")}
                    </div>
                  </div>
                ` : useCycle ? /* html */`
                  <div class="hrv-fan-stepped-wrap">
                    <button class="hrv-fan-speed-circle" part="speed-circle" type="button"
                      aria-pressed="false"
                      title="Click to increase fan speed"
                      aria-label="Click to increase fan speed"><svg class="hrv-fan-speed-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19,20.67 13,19.86 13,19M20,15V18H23V20H20V23H18V20H15V18H18V15H20Z"/></svg></button>
                  </div>
                ` : /* html */`
                  <div class="hrv-dial-wrap" role="slider"
                    aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                    aria-label="${_esc(this.def.friendly_name)} speed"
                    title="Drag to adjust fan speed">
                    <svg viewBox="0 0 120 120">
                      <path class="hrv-dial-track" d="${TRACK_D}" />
                      <path class="hrv-dial-fill" d="${TRACK_D}"
                        stroke-dasharray="${ARC_LENGTH}"
                        stroke-dashoffset="${ARC_LENGTH}" />
                      <circle class="hrv-dial-thumb" r="7"
                        cx="${startPt.x}" cy="${startPt.y}" />
                      <circle class="hrv-dial-thumb-hit" r="16"
                        cx="${startPt.x}" cy="${startPt.y}" />
                    </svg>
                    <span class="hrv-dial-pct">0%</span>
                  </div>
                `}
                <div part="companion-zone" role="group" aria-label="Companions"></div>
              </div>
            ` : !isWritable ? /* html */`
              <div class="hrv-fan-ro-center">
                <div class="hrv-fan-ro-circle" data-on="false"
                  role="img" aria-label="${_esc(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
              </div>
            ` : ""}
            ${isWritable ? /* html */`
              <div class="hrv-dial-controls">
                ${hasOscillate ? /* html */`
                  <button class="hrv-fan-feat-btn" data-feat="oscillate" type="button"
                    aria-label="Oscillate: off" title="Oscillate: off"></button>
                ` : ""}
                ${hasDirection ? /* html */`
                  <button class="hrv-fan-feat-btn" data-feat="direction" type="button"
                    aria-label="Direction: forward" title="Direction: forward"></button>
                ` : ""}
                ${hasPreset ? /* html */`
                  <button class="hrv-fan-feat-btn" data-feat="preset" type="button"
                    aria-label="Preset: none" title="Preset: none"></button>
                ` : ""}
                <button part="toggle-button" type="button"
                  aria-label="${_esc(this.def.friendly_name)} - toggle"
                  title="Turn ${_esc(this.def.friendly_name)} on / off">${!showDial ? '<span part="fan-onoff-icon" aria-hidden="true"></span>' : ""}</button>
              </div>
            ` : ""}
          </div>
          ${!showDial ? this.renderCompanionZoneHTML() : ""}
        </div>
      `;

      this.#toggleBtn = this.root.querySelector("[part=toggle-button]");
      this.#dialFill  = this.root.querySelector(".hrv-dial-fill");
      this.#dialTrack = this.root.querySelector(".hrv-dial-track");
      this.#dialThumb = this.root.querySelector(".hrv-dial-thumb");
      this.#dialPct   = this.root.querySelector(".hrv-dial-pct");
      this.#dialSvg     = this.root.querySelector(".hrv-dial-wrap");
      this.#dialThumbHit = this.root.querySelector(".hrv-dial-thumb-hit");
      this.#oscBtn      = this.root.querySelector('[data-feat="oscillate"]');
      this.#dirBtn      = this.root.querySelector('[data-feat="direction"]');
      this.#presetBtn   = this.root.querySelector('[data-feat="preset"]');

      if (this.#toggleBtn && !showDial) {
        this.renderIcon(this.def.icon ?? "mdi:fan", "fan-onoff-icon");
        this.#toggleBtn.setAttribute("data-animate", String(!!this.config.animate));
      }
      this._attachGestureHandlers(this.#toggleBtn, {
        onTap: () => {
          const tap = this.config.gestureConfig?.tap;
          if (tap) { this._runAction(tap); return; }
          this.config.card?.sendCommand("toggle", {});
        },
      });
      if (this.#dialSvg) {
        this.#dialSvg.addEventListener("pointerdown",   this.#onPointerDown.bind(this));
        this.#dialSvg.addEventListener("pointermove",   this.#onPointerMove.bind(this));
        this.#dialSvg.addEventListener("pointerup",     this.#onPointerUp.bind(this));
        this.#dialSvg.addEventListener("pointercancel", this.#onPointerUp.bind(this));
      }
      const speedCircle = this.root.querySelector(".hrv-fan-speed-circle");
      speedCircle?.addEventListener("click", () => {
        const steps = this.#speedSteps;
        if (!steps.length) return;
        let nextPct;
        if (!this.#isOn || this.#percentage === 0) {
          nextPct = steps[0];
          this.#isOn = true;
          this.#toggleBtn?.setAttribute("aria-pressed", "true");
        } else {
          const nextIdx = steps.findIndex(s => s > this.#percentage);
          nextPct = nextIdx === -1 ? steps[0] : steps[nextIdx];
        }
        this.#percentage = nextPct;
        this.#applySteppedState();
        this.config.card?.sendCommand("set_percentage", { percentage: nextPct });
      });
      this.root.querySelectorAll(".hrv-fan-hspeed-dot").forEach((dot) => {
        const handler = () => {
          const pct = Number(dot.getAttribute("data-pct"));
          if (!this.#isOn) {
            this.#isOn = true;
            this.#toggleBtn?.setAttribute("aria-pressed", "true");
          }
          this.#percentage = pct;
          this.#applyHorizontalState();
          this.config.card?.sendCommand("set_percentage", { percentage: pct });
        };
        dot.addEventListener("click", handler);
        dot.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); }
        });
      });
      this.#oscBtn?.addEventListener("click", () => {
        this.config.card?.sendCommand("oscillate", { oscillating: !this.#oscillating });
      });
      this.#dirBtn?.addEventListener("click", () => {
        const next = this.#direction === "forward" ? "reverse" : "forward";
        this.#direction = next;
        this.#applyFeatureState();
        this.config.card?.sendCommand("set_direction", { direction: next });
      });
      this.#presetBtn?.addEventListener("click", () => {
        if (!this.#presets.length) return;
        if (this.#isCycleFan) {
          const mode = this.#presetMode ?? this.#presets[0];
          this.config.card?.sendCommand("set_preset_mode", { preset_mode: mode });
          return;
        }
        if (!this.#presetMode) {
          const mode = this.#presets[0];
          this.#presetMode = mode;
          this.#applyFeatureState();
          this.config.card?.sendCommand("set_preset_mode", { preset_mode: mode });
        } else {
          const idx = this.#presets.indexOf(this.#presetMode);
          if (idx === -1 || idx === this.#presets.length - 1) {
            this.#presetMode = null;
            this.#applyFeatureState();
            const step = this.#percentageStep;
            const pct = Math.floor(this.#percentage / step) * step || step;
            this.config.card?.sendCommand("set_percentage", { percentage: pct });
          } else {
            const mode = this.#presets[idx + 1];
            this.#presetMode = mode;
            this.#applyFeatureState();
            this.config.card?.sendCommand("set_preset_mode", { preset_mode: mode });
          }
        }
      });

      if (this.root.querySelector(".hrv-fan-ro-circle")) {
        this.renderIcon(this.def.icon ?? "mdi:fan", "ro-state-icon");
      }

      this.renderCompanions();
      this.root.querySelectorAll("[part=companion]").forEach((el) => {
        el.title = el.getAttribute("aria-label") ?? "Companion";
      });
    }

    applyState(state, attributes) {
      this.#isOn        = state === "on";
      this.#percentage  = attributes?.percentage ?? 0;
      this.#oscillating = attributes?.oscillating ?? false;
      this.#direction   = attributes?.direction ?? "forward";
      this.#presetMode  = attributes?.preset_mode ?? null;
      if (attributes?.preset_modes?.length) this.#presets = attributes.preset_modes;

      if (this.#toggleBtn) {
        this.#toggleBtn.setAttribute("aria-pressed", String(this.#isOn));
      }

      const roCircle = this.root.querySelector(".hrv-fan-ro-circle");
      if (roCircle) {
        roCircle.setAttribute("data-on", String(this.#isOn));
      }

      if (this.#isStepped && !this.#presets.length) {
        this.#applyHorizontalState();
      } else if (this.#isStepped) {
        this.#applySteppedState();
      } else {
        this.#syncDialImmediate();
      }
      this.#applyFeatureState();
      this.announceState(
        `${this.def.friendly_name}, ${state}` +
        (this.#percentage > 0 ? `, ${this.#percentage}%` : ""),
      );
    }

    predictState(action, data) {
      if (action === "toggle") {
        return { state: this.#isOn ? "off" : "on", attributes: { percentage: this.#percentage } };
      }
      if (action === "set_percentage") {
        return { state: "on", attributes: {
          percentage: data.percentage,
          oscillating: this.#oscillating,
          direction: this.#direction,
          preset_mode: this.#presetMode,
          preset_modes: this.#presets,
        }};
      }
      return null;
    }

    #applySteppedState() {
      const circle = this.root.querySelector(".hrv-fan-speed-circle");
      if (!circle) return;
      circle.setAttribute("aria-pressed", String(this.#isOn));
      const lbl = this.#isOn
        ? "Click to increase fan speed"
        : "Fan off - click to turn on";
      circle.setAttribute("aria-label", lbl);
      circle.title = lbl;
    }

    #applyHorizontalState() {
      const sw = this.root.querySelector(".hrv-fan-hspeed-switch");
      if (!sw) return;
      const thumb = sw.querySelector(".hrv-fan-hspeed-thumb");
      const steps = this.#speedSteps;
      let activeIdx = -1;
      if (this.#isOn && this.#percentage > 0) {
        let minDiff = Infinity;
        steps.forEach((s, i) => {
          const d = Math.abs(s - this.#percentage);
          if (d < minDiff) { minDiff = d; activeIdx = i; }
        });
      }
      sw.setAttribute("data-on", String(activeIdx >= 0));
      if (thumb && activeIdx >= 0) thumb.style.left = `${2 + activeIdx * 32}px`;
      sw.querySelectorAll(".hrv-fan-hspeed-dot").forEach((dot, i) => {
        dot.setAttribute("data-active", String(i === activeIdx));
      });
    }

    #applyFeatureState() {
      const cycleFan = this.#isCycleFan;
      if (this.#oscBtn) {
        const on = cycleFan || this.#oscillating;
        const lbl = cycleFan ? "Oscillate" : `Oscillate: ${this.#oscillating ? "on" : "off"}`;
        this.#oscBtn.setAttribute("data-on", String(on));
        this.#oscBtn.setAttribute("aria-pressed", String(on));
        this.#oscBtn.setAttribute("aria-label", lbl);
        this.#oscBtn.title = lbl;
      }
      if (this.#dirBtn) {
        const isFwd = this.#direction !== "reverse";
        const lbl = `Direction: ${this.#direction}`;
        this.#dirBtn.setAttribute("data-on", String(isFwd));
        this.#dirBtn.setAttribute("aria-pressed", String(isFwd));
        this.#dirBtn.setAttribute("aria-label", lbl);
        this.#dirBtn.title = lbl;
      }
      if (this.#presetBtn) {
        const active = cycleFan || !!this.#presetMode;
        const lbl = cycleFan
          ? (this.#presetMode ?? this.#presets[0] ?? "Preset")
          : (this.#presetMode ? `Preset: ${this.#presetMode}` : "Preset: none");
        this.#presetBtn.setAttribute("data-on", String(active));
        this.#presetBtn.setAttribute("aria-pressed", String(active));
        this.#presetBtn.setAttribute("aria-label", lbl);
        this.#presetBtn.title = lbl;
      }
    }

    #onPointerDown(e) {
      this.#dragging = true;
      this.#dialSvg?.setPointerCapture(e.pointerId);
      this.#updateFromPointer(e);
    }

    #onPointerMove(e) {
      if (!this.#dragging) return;
      this.#updateFromPointer(e);
    }

    #onPointerUp(e) {
      if (!this.#dragging) return;
      this.#dragging = false;
      try { this.#dialSvg?.releasePointerCapture(e.pointerId); } catch (_) {}
      this.#sendValue();
    }

    #updateFromPointer(e) {
      if (!this.#dialSvg) return;
      const rect = this.#dialSvg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = -(e.clientY - cy);
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      let offset = ARC_START_DEG - angleDeg;
      if (offset < 0) offset += 360;
      if (offset > ARC_SWEEP_DEG) {
        offset = offset > ARC_SWEEP_DEG + (360 - ARC_SWEEP_DEG) / 2 ? 0 : ARC_SWEEP_DEG;
      }
      this.#percentage = Math.round((offset / ARC_SWEEP_DEG) * 100);
      if (this.#dialFill) this.#dialFill.style.transition = "none";
      if (this.#dialThumb) this.#dialThumb.style.transition = "none";
      this.#updateDial(this.#percentage);
    }

    #doSendSpeed() {
      if (this.#dialFill) this.#dialFill.style.transition = "";
      if (this.#dialThumb) this.#dialThumb.style.transition = "";
      if (this.#percentage === 0) {
        this.config.card?.sendCommand("turn_off", {});
      } else {
        this.config.card?.sendCommand("set_percentage", { percentage: this.#percentage });
      }
    }

    #updateDial(pct) {
      const offset   = ARC_LENGTH * (1 - pct / 100);
      const thumbPos = _arcPoint(ARC_START_DEG - (pct / 100) * ARC_SWEEP_DEG);
      this.#dialFill?.setAttribute("stroke-dashoffset", String(offset));
      this.#dialThumb?.setAttribute("cx", String(thumbPos.x));
      this.#dialThumb?.setAttribute("cy", String(thumbPos.y));
      this.#dialThumbHit?.setAttribute("cx", String(thumbPos.x));
      this.#dialThumbHit?.setAttribute("cy", String(thumbPos.y));
      if (this.#dialPct) this.#dialPct.textContent = `${pct}%`;
      this.#dialSvg?.setAttribute("aria-valuenow", String(pct));
    }

    #syncDialImmediate() {
      if (this.#dialThumb) this.#dialThumb.style.transition = "none";
      if (this.#dialFill)  this.#dialFill.style.transition  = "none";
      this.#updateDial(this.#isOn ? this.#percentage : 0);
      this.#dialThumb?.getBoundingClientRect();
      this.#dialFill?.getBoundingClientRect();
      if (this.#dialThumb) this.#dialThumb.style.transition = "";
      if (this.#dialFill)  this.#dialFill.style.transition  = "";
    }
  }

  function _rgbToHue(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return Math.round(((h * 60) + 360) % 360);
  }

  // ---------------------------------------------------------------------------
  // ClimateCard
  // ---------------------------------------------------------------------------

  const CLIMATE_STYLES = DIAL_STYLES + /* css */`
    [part=card-body] {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: 0 var(--hrv-card-padding, 16px) 0;
    }

    .hrv-dial-wrap {
      flex: none;
      width: 100%;
      max-width: 260px;
      margin: 0 auto;
    }

    .hrv-climate-current {
      text-align: center;
      padding: 6px 0 0;
    }
    .hrv-climate-current-label {
      display: block;
      font-size: 12px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.6));
    }
    .hrv-climate-current-val {
      display: block;
      font-size: 26px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1.2;
    }

    .hrv-climate-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      user-select: none;
      width: 65%;
    }
    .hrv-climate-state-text {
      display: block;
      font-size: 13px;
      color: var(--hrv-color-text, #fff);
      margin-bottom: 2px;
    }
    .hrv-climate-temp-row {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      line-height: 1;
    }
    .hrv-climate-temp-int {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
    }
    .hrv-climate-temp-frac {
      font-size: 20px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      align-self: flex-end;
      padding-bottom: 6px;
    }
    .hrv-climate-temp-unit {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      align-self: flex-start;
      padding-top: 5px;
      padding-left: 2px;
    }

    .hrv-climate-stepper {
      display: flex;
      justify-content: center;
      gap: 36px;
      padding: 6px 0 14px;
    }
    .hrv-climate-step {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.35));
      background: transparent;
      color: var(--hrv-color-text, #fff);
      font-size: 1.6rem;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
    }
    .hrv-climate-step:active,
    .hrv-climate-step[data-pressing=true] {
      border-color: var(--hrv-ex-ring, #fff);
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.1));
      transition: none;
    }

    .hrv-climate-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-bottom: 16px;
      position: relative;
    }
    .hrv-cf-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 11px 13px;
      border: none;
      border-radius: var(--hrv-radius-m, 12px);
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.1));
      color: var(--hrv-color-text, #fff);
      cursor: pointer;
      text-align: left;
      gap: 3px;
      font-family: inherit;
      min-width: 0;
      transition: opacity 0.15s;
    }
    .hrv-cf-btn:active,
    .hrv-cf-btn[data-pressing=true] { opacity: 0.65; transition: none; }
    .hrv-cf-label {
      font-size: 11px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.55));
    }
    .hrv-cf-value {
      font-size: var(--hrv-font-size-s, 14px);
      font-weight: var(--hrv-font-weight-medium, 500);
      color: var(--hrv-color-text, #fff);
    }

    .hrv-climate-dropdown {
      position: absolute;
      bottom: calc(100% - 8px);
      left: 0;
      right: 0;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--hrv-radius-s, 8px);
      box-shadow: 0 -4px 16px rgba(0,0,0,0.25), 0 0 0 1px var(--hrv-ex-glass-border, rgba(255,255,255,0.12));
      overflow: hidden;
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: none;
      z-index: 10;
    }
    .hrv-cf-option {
      display: block;
      width: 100%;
      padding: 12px 14px;
      border: none;
      background: transparent;
      color: var(--hrv-color-text, #fff);
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: background 0.1s;
    }
    .hrv-cf-option + .hrv-cf-option {
      border-top: 1px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.06));
    }
    .hrv-cf-option:hover { background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.08)); }
    .hrv-cf-option[data-active=true] { color: var(--hrv-color-primary, #1976d2); }

    .hrv-cf-btn[data-readonly=true] {
      cursor: not-allowed;
    }
    .hrv-climate-ro-temp {
      text-align: center;
      padding: 24px 0 16px;
    }
    .hrv-climate-ro-temp-row {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      line-height: 1;
    }
    .hrv-climate-ro-temp-int {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
    }
    .hrv-climate-ro-temp-frac {
      font-size: 20px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      align-self: flex-end;
      padding-bottom: 6px;
    }
    .hrv-climate-ro-temp-unit {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      align-self: flex-start;
      padding-top: 5px;
      padding-left: 2px;
    }
  `;

  class ClimateCard extends BaseCard {
    /** @type {HTMLElement|null}       */ #dialSvg        = null;
    /** @type {SVGPathElement|null}    */ #dialFill       = null;
    /** @type {SVGCircleElement|null}  */ #dialThumb      = null;
    /** @type {SVGCircleElement|null}  */ #dialThumbHit   = null;
    /** @type {boolean}               */ #dragging        = false;
    /** @type {HTMLElement|null}       */ #stateEl         = null;
    /** @type {HTMLElement|null}       */ #tempIntEl       = null;
    /** @type {HTMLElement|null}       */ #tempFracEl      = null;
    /** @type {HTMLButtonElement|null} */ #minusBtn        = null;
    /** @type {HTMLButtonElement|null} */ #plusBtn         = null;
    /** @type {HTMLButtonElement|null} */ #modeBtn         = null;
    /** @type {HTMLButtonElement|null} */ #fanBtn          = null;
    /** @type {HTMLButtonElement|null} */ #presetBtn       = null;
    /** @type {HTMLButtonElement|null} */ #swingBtn        = null;
    /** @type {HTMLElement|null}       */ #dropdown        = null;
    /** @type {string|null}            */ #activeFeat      = null;
    /** @type {Function|null}          */ #outsideListener = null;
    /** @type {number}                 */ #targetTemp      = 20;
    /** @type {string}                 */ #hvacMode        = "off";
    /** @type {string|null}            */ #fanMode         = null;
    /** @type {string|null}            */ #presetMode      = null;
    /** @type {string|null}            */ #swingMode       = null;
    /** @type {number}                 */ #minTemp         = 16;
    /** @type {number}                 */ #maxTemp         = 32;
    /** @type {number}                 */ #tempStep        = 0.5;
    /** @type {string}                 */ #unit            = "°C";
    /** @type {string[]}               */ #hvacModes       = [];
    /** @type {string[]}               */ #fanModes        = [];
    /** @type {string[]}               */ #presetModes     = [];
    /** @type {string[]}               */ #swingModes      = [];
    /** @type {object}                 */ #lastAttrs       = {};
    /** @type {Function}               */ #sendDebounce;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendDebounce = _debounce(this.#doSendTemp.bind(this), 500);
    }

    #tempToPct(t) {
      return Math.max(0, Math.min(100, ((t - this.#minTemp) / (this.#maxTemp - this.#minTemp)) * 100));
    }

    #pctToTemp(pct) {
      const raw = this.#minTemp + (pct / 100) * (this.#maxTemp - this.#minTemp);
      const stepped = Math.round(raw / this.#tempStep) * this.#tempStep;
      return Math.max(this.#minTemp, Math.min(this.#maxTemp, +stepped.toFixed(10)));
    }

    render() {
      const isWritable  = this.def.capabilities === "read-write";
      const hasDial     = this.def.supported_features?.includes("target_temperature");
      const hasFan      = this.def.supported_features?.includes("fan_mode")
                       || (this.def.feature_config?.fan_modes?.length > 0);
      const hasPreset   = this.def.supported_features?.includes("preset_mode")
                       || (this.def.feature_config?.preset_modes?.length > 0);
      const hasSwing    = this.def.supported_features?.includes("swing_mode")
                       || (this.def.feature_config?.swing_modes?.length > 0);

      this.#minTemp     = this.def.feature_config?.min_temp ?? 16;
      this.#maxTemp     = this.def.feature_config?.max_temp ?? 32;
      this.#tempStep    = this.def.feature_config?.temp_step ?? 0.5;
      this.#unit        = this.def.unit_of_measurement ?? "°C";
      this.#hvacModes   = this.def.feature_config?.hvac_modes ?? ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"];
      this.#fanModes    = this.def.feature_config?.fan_modes ?? [];
      this.#presetModes = this.def.feature_config?.preset_modes ?? [];
      this.#swingModes  = this.def.feature_config?.swing_modes ?? [];

      const pct      = this.#tempToPct(this.#targetTemp);
      const startPt  = _arcPoint(ARC_START_DEG);
      const thumbPt  = _arcPoint(ARC_START_DEG - (pct / 100) * ARC_SWEEP_DEG);
      const fillOff  = ARC_LENGTH * (1 - pct / 100);
      const [tInt, tFrac] = this.#targetTemp.toFixed(1).split(".");

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${CLIMATE_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${isWritable && hasDial ? /* html */`
              <div class="hrv-dial-wrap">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <path class="hrv-dial-track" d="${TRACK_D}"/>
                  <path class="hrv-dial-fill" d="${TRACK_D}"
                    stroke-dasharray="${ARC_LENGTH}" stroke-dashoffset="${fillOff}"/>
                  <circle class="hrv-dial-thumb" r="7" cx="${thumbPt.x}" cy="${thumbPt.y}"><title>Drag to set temperature</title></circle>
                  <circle class="hrv-dial-thumb-hit" r="16" cx="${thumbPt.x}" cy="${thumbPt.y}"><title>Drag to set temperature</title></circle>
                </svg>
                <div class="hrv-climate-center">
                  <span class="hrv-climate-state-text"></span>
                  <div class="hrv-climate-temp-row">
                    <span class="hrv-climate-temp-int">${_esc(tInt)}</span><span class="hrv-climate-temp-frac">.${_esc(tFrac)}</span><span class="hrv-climate-temp-unit">${_esc(this.#unit)}</span>
                  </div>
                </div>
              </div>
              <div class="hrv-climate-stepper">
                <button class="hrv-climate-step" type="button" aria-label="Decrease temperature" title="Decrease temperature" data-dir="-">&#8722;</button>
                <button class="hrv-climate-step" type="button" aria-label="Increase temperature" title="Increase temperature" data-dir="+">+</button>
              </div>
            ` : !isWritable && hasDial ? /* html */`
              <div class="hrv-climate-ro-temp">
                <div class="hrv-climate-ro-temp-row">
                  <span class="hrv-climate-ro-temp-int">${_esc(tInt)}</span><span class="hrv-climate-ro-temp-frac">.${_esc(tFrac)}</span><span class="hrv-climate-ro-temp-unit">${_esc(this.#unit)}</span>
                </div>
              </div>
            ` : ""}
            <div class="hrv-climate-grid">
              ${this.#hvacModes.length ? /* html */`
                <button class="hrv-cf-btn" data-feat="mode" type="button"
                  ${!isWritable ? 'data-readonly="true" title="Read-only"' : 'title="Change HVAC mode"'}>
                  <span class="hrv-cf-label">Mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              ` : ""}
              ${hasPreset && this.#presetModes.length ? /* html */`
                <button class="hrv-cf-btn" data-feat="preset" type="button"
                  ${!isWritable ? 'data-readonly="true" title="Read-only"' : 'title="Change preset mode"'}>
                  <span class="hrv-cf-label">Preset</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              ` : ""}
              ${hasFan && this.#fanModes.length ? /* html */`
                <button class="hrv-cf-btn" data-feat="fan" type="button"
                  ${!isWritable ? 'data-readonly="true" title="Read-only"' : 'title="Change fan mode"'}>
                  <span class="hrv-cf-label">Fan mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              ` : ""}
              ${hasSwing && this.#swingModes.length ? /* html */`
                <button class="hrv-cf-btn" data-feat="swing" type="button"
                  ${!isWritable ? 'data-readonly="true" title="Read-only"' : 'title="Change swing mode"'}>
                  <span class="hrv-cf-label">Swing mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              ` : ""}
              ${isWritable ? '<div class="hrv-climate-dropdown" hidden></div>' : ""}
            </div>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#dialSvg      = this.root.querySelector(".hrv-dial-wrap");
      this.#dialFill     = this.root.querySelector(".hrv-dial-fill");
      this.#dialThumb    = this.root.querySelector(".hrv-dial-thumb");
      this.#dialThumbHit = this.root.querySelector(".hrv-dial-thumb-hit");
      this.#stateEl       = this.root.querySelector(".hrv-climate-state-text");
      this.#tempIntEl     = this.root.querySelector(".hrv-climate-temp-int");
      this.#tempFracEl    = this.root.querySelector(".hrv-climate-temp-frac");
      this.#minusBtn      = this.root.querySelector("[data-dir='-']");
      this.#plusBtn       = this.root.querySelector("[data-dir='+']");
      this.#modeBtn       = this.root.querySelector("[data-feat=mode]");
      this.#fanBtn        = this.root.querySelector("[data-feat=fan]");
      this.#presetBtn     = this.root.querySelector("[data-feat=preset]");
      this.#swingBtn      = this.root.querySelector("[data-feat=swing]");
      this.#dropdown      = this.root.querySelector(".hrv-climate-dropdown");

      if (this.#dialSvg) {
        this.#dialSvg.addEventListener("pointerdown",   this.#onPointerDown.bind(this));
        this.#dialSvg.addEventListener("pointermove",   this.#onPointerMove.bind(this));
        this.#dialSvg.addEventListener("pointerup",     this.#onPointerUp.bind(this));
        this.#dialSvg.addEventListener("pointercancel", this.#onPointerUp.bind(this));
      }

      if (this.#minusBtn) {
        this.#minusBtn.addEventListener("click", () => this.#adjustTemp(-1));
        this.#minusBtn.addEventListener("pointerdown",  () => this.#minusBtn.setAttribute("data-pressing", "true"));
        this.#minusBtn.addEventListener("pointerup",    () => this.#minusBtn.removeAttribute("data-pressing"));
        this.#minusBtn.addEventListener("pointerleave", () => this.#minusBtn.removeAttribute("data-pressing"));
        this.#minusBtn.addEventListener("pointercancel",() => this.#minusBtn.removeAttribute("data-pressing"));
      }
      if (this.#plusBtn) {
        this.#plusBtn.addEventListener("click", () => this.#adjustTemp(1));
        this.#plusBtn.addEventListener("pointerdown",  () => this.#plusBtn.setAttribute("data-pressing", "true"));
        this.#plusBtn.addEventListener("pointerup",    () => this.#plusBtn.removeAttribute("data-pressing"));
        this.#plusBtn.addEventListener("pointerleave", () => this.#plusBtn.removeAttribute("data-pressing"));
        this.#plusBtn.addEventListener("pointercancel",() => this.#plusBtn.removeAttribute("data-pressing"));
      }

      if (isWritable) {
        [this.#modeBtn, this.#fanBtn, this.#presetBtn, this.#swingBtn].forEach(btn => {
          if (!btn) return;
          const feat = btn.getAttribute("data-feat");
          btn.addEventListener("click", () => this.#toggleDropdown(feat));
          btn.addEventListener("pointerdown",  () => btn.setAttribute("data-pressing", "true"));
          btn.addEventListener("pointerup",    () => btn.removeAttribute("data-pressing"));
          btn.addEventListener("pointerleave", () => btn.removeAttribute("data-pressing"));
          btn.addEventListener("pointercancel",() => btn.removeAttribute("data-pressing"));
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    #toggleDropdown(feat) {
      if (this.#activeFeat === feat) { this.#closeDropdown(); return; }
      this.#activeFeat = feat;

      let options = [], current = null, command = "", dataKey = "";
      switch (feat) {
        case "mode":   options = this.#hvacModes;   current = this.#hvacMode;   command = "set_hvac_mode";   dataKey = "hvac_mode";   break;
        case "fan":    options = this.#fanModes;    current = this.#fanMode;    command = "set_fan_mode";    dataKey = "fan_mode";    break;
        case "preset": options = this.#presetModes; current = this.#presetMode; command = "set_preset_mode"; dataKey = "preset_mode"; break;
        case "swing":  options = this.#swingModes;  current = this.#swingMode;  command = "set_swing_mode";  dataKey = "swing_mode";  break;
      }
      if (!options.length || !this.#dropdown) return;

      this.#dropdown.innerHTML = options.map(opt => /* html */`
        <button class="hrv-cf-option" data-active="${opt === current}" type="button">
          ${_esc(_capitalize(opt))}
        </button>
      `).join("");

      this.#dropdown.querySelectorAll(".hrv-cf-option").forEach((btn, i) => {
        btn.addEventListener("click", () => {
          this.config.card?.sendCommand(command, { [dataKey]: options[i] });
          this.#closeDropdown();
        });
      });

      this.#dropdown.removeAttribute("hidden");

      const onOutside = (e) => {
        const path = e.composedPath();
        if (!path.some(el => el === this.root || el === this.root.host)) {
          this.#closeDropdown();
        }
      };
      this.#outsideListener = onOutside;
      document.addEventListener("pointerdown", onOutside, true);
    }

    #closeDropdown() {
      this.#activeFeat = null;
      this.#dropdown?.setAttribute("hidden", "");
      if (this.#outsideListener) {
        document.removeEventListener("pointerdown", this.#outsideListener, true);
        this.#outsideListener = null;
      }
    }

    #adjustTemp(dir) {
      const next = Math.round((this.#targetTemp + dir * this.#tempStep) * 100) / 100;
      this.#targetTemp = Math.max(this.#minTemp, Math.min(this.#maxTemp, next));
      this.#updateDial();
      this.#sendDebounce();
    }

    #updateDial() {
      const pct      = this.#tempToPct(this.#targetTemp);
      const offset   = ARC_LENGTH * (1 - pct / 100);
      const thumbPt  = _arcPoint(ARC_START_DEG - (pct / 100) * ARC_SWEEP_DEG);
      this.#dialFill?.setAttribute("stroke-dashoffset", String(offset));
      this.#dialThumb?.setAttribute("cx", String(thumbPt.x));
      this.#dialThumb?.setAttribute("cy", String(thumbPt.y));
      this.#dialThumbHit?.setAttribute("cx", String(thumbPt.x));
      this.#dialThumbHit?.setAttribute("cy", String(thumbPt.y));
      const [int, frac] = this.#targetTemp.toFixed(1).split(".");
      if (this.#tempIntEl)  this.#tempIntEl.textContent  = int;
      if (this.#tempFracEl) this.#tempFracEl.textContent = `.${frac}`;
    }

    #onPointerDown(e) {
      this.#dragging = true;
      this.#dialSvg?.setPointerCapture(e.pointerId);
      this.#updateFromPointer(e);
    }

    #onPointerMove(e) {
      if (!this.#dragging) return;
      this.#updateFromPointer(e);
    }

    #onPointerUp(e) {
      if (!this.#dragging) return;
      this.#dragging = false;
      try { this.#dialSvg?.releasePointerCapture(e.pointerId); } catch (_) {}
      if (this.#dialFill)  this.#dialFill.style.transition  = "";
      if (this.#dialThumb) this.#dialThumb.style.transition = "";
    }

    #updateFromPointer(e) {
      if (!this.#dialSvg) return;
      const rect = this.#dialSvg.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = -(e.clientY - cy);
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;
      let offset = ARC_START_DEG - angleDeg;
      if (offset < 0) offset += 360;
      if (offset > ARC_SWEEP_DEG) {
        offset = offset > ARC_SWEEP_DEG + (360 - ARC_SWEEP_DEG) / 2 ? 0 : ARC_SWEEP_DEG;
      }
      this.#targetTemp = this.#pctToTemp((offset / ARC_SWEEP_DEG) * 100);
      if (this.#dialFill)  this.#dialFill.style.transition  = "none";
      if (this.#dialThumb) this.#dialThumb.style.transition = "none";
      this.#updateDial();
      this.#sendDebounce();
    }

    #doSendTemp() {
      this.config.card?.sendCommand("set_temperature", { temperature: this.#targetTemp });
    }

    #updateFeatureButtons() {
      const set = (btn, val) => {
        if (!btn) return;
        const el = btn.querySelector(".hrv-cf-value");
        if (el) el.textContent = _capitalize(val ?? "None");
      };
      set(this.#modeBtn,   this.#hvacMode);
      set(this.#fanBtn,    this.#fanMode);
      set(this.#presetBtn, this.#presetMode);
      set(this.#swingBtn,  this.#swingMode);
    }

    applyState(state, attributes) {
      this.#lastAttrs  = { ...attributes };
      this.#hvacMode   = state;
      this.#fanMode    = attributes.fan_mode    ?? null;
      this.#presetMode = attributes.preset_mode ?? null;
      this.#swingMode  = attributes.swing_mode  ?? null;

      if (!this.#dragging && attributes.temperature !== undefined) {
        this.#targetTemp = attributes.temperature;
        this.#updateDial();
      }

      if (this.#stateEl) {
        this.#stateEl.textContent = _capitalize(attributes.hvac_action ?? state);
      }

      const roTempInt = this.root.querySelector(".hrv-climate-ro-temp-int");
      const roTempFrac = this.root.querySelector(".hrv-climate-ro-temp-frac");
      if (roTempInt && attributes.temperature !== undefined) {
        this.#targetTemp = attributes.temperature;
        const [ri, rf] = this.#targetTemp.toFixed(1).split(".");
        roTempInt.textContent = ri;
        roTempFrac.textContent = `.${rf}`;
      }

      this.#updateFeatureButtons();

      const action   = attributes.hvac_action ?? state;
      const stateStr = _capitalize(action);
      this.announceState(`${this.def.friendly_name}, ${stateStr}`);
    }

    predictState(action, data) {
      const attrs = { ...this.#lastAttrs };
      if (action === "set_hvac_mode" && data.hvac_mode) {
        return { state: data.hvac_mode, attributes: attrs };
      }
      if (action === "set_temperature" && data.temperature !== undefined) {
        return { state: this.#hvacMode, attributes: { ...attrs, temperature: data.temperature } };
      }
      if (action === "set_fan_mode" && data.fan_mode) {
        return { state: this.#hvacMode, attributes: { ...attrs, fan_mode: data.fan_mode } };
      }
      if (action === "set_preset_mode" && data.preset_mode) {
        return { state: this.#hvacMode, attributes: { ...attrs, preset_mode: data.preset_mode } };
      }
      if (action === "set_swing_mode" && data.swing_mode) {
        return { state: this.#hvacMode, attributes: { ...attrs, swing_mode: data.swing_mode } };
      }
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // HarvestActionCard
  // ---------------------------------------------------------------------------

  const HARVEST_ACTION_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--hrv-spacing-s);
      padding: var(--hrv-spacing-s) 0 var(--hrv-spacing-m);
    }

    [part=btn-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    [part=btn-icon] svg { width: 40px; height: 40px; }

    [part=trigger-button] {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: none;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--hrv-color-primary);
      cursor: pointer;
      box-shadow: 0 0 0 0 transparent;
      transition:
        box-shadow 200ms ease,
        background var(--hrv-transition-speed),
        opacity 80ms;
    }

    [part=trigger-button]:hover { opacity: 0.88; }

    [part=trigger-button][data-pressing=true] {
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
      transition: box-shadow 0ms, background var(--hrv-transition-speed), opacity 80ms;
    }

    [part=trigger-button][data-state=triggered] {
      background: var(--hrv-color-primary, #1976d2);
      opacity: 0.5;
    }

    [part=trigger-button]:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `;

  class HarvestActionCard extends BaseCard {
    /** @type {HTMLButtonElement|null} */ #triggerBtn = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const label      = this.def.friendly_name;

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${HARVEST_ACTION_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(label)}</span>
          </div>
          <div part="card-body">
            <button part="trigger-button" type="button"
              aria-label="${_esc(label)}"
              title="${!isWritable ? "Read-only" : _esc(label)}"
              ${!isWritable ? "disabled" : ""}>
              <span part="btn-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#triggerBtn = this.root.querySelector("[part=trigger-button]");

      this.renderIcon(
        this.def.icon_state_map?.["idle"] ?? this.def.icon ?? "mdi:play",
        "btn-icon",
      );

      if (this.#triggerBtn && isWritable) {
        this._attachGestureHandlers(this.#triggerBtn, {
          onTap: () => {
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.#triggerBtn.disabled = true;
            this.config.card?.sendCommand("trigger", {});
          },
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, _attributes) {
      const isTriggered = state === "triggered";

      if (this.#triggerBtn) {
        this.#triggerBtn.setAttribute("data-state", state);
        if (this.def.capabilities === "read-write") {
          this.#triggerBtn.disabled = isTriggered;
        }
      }

      const iconName = this.def.icon_state_map?.[state]
        ?? this.def.icon
        ?? "mdi:play";
      this.renderIcon(iconName, "btn-icon");

      if (isTriggered) {
        this.announceState(`${this.def.friendly_name}, ${this.i18n.t("state.triggered")}`);
      }
    }

    predictState(action, _data) {
      if (action !== "trigger") return null;
      return { state: "triggered", attributes: {} };
    }
  }

  // ---------------------------------------------------------------------------
  // BinarySensorCard
  // ---------------------------------------------------------------------------

  const BINARY_SENSOR_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--hrv-spacing-s) 0 var(--hrv-spacing-m);
    }

    .hrv-bs-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      box-shadow: 0 0 0 0 transparent;
      transition:
        box-shadow 200ms ease,
        opacity 200ms ease;
    }

    .hrv-bs-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }

    [part=state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    [part=state-icon] svg { width: 40px; height: 40px; }
  `;

  class BinarySensorCard extends BaseCard {
    /** @type {HTMLElement|null} */ #circle = null;

    render() {
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${BINARY_SENSOR_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-bs-circle" data-on="false"
              role="img" aria-label="${_esc(this.def.friendly_name)}">
              <span part="state-icon" aria-hidden="true"></span>
            </div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#circle = this.root.querySelector(".hrv-bs-circle");

      this.renderIcon(
        this.def.icon_state_map?.["off"] ?? this.def.icon ?? "mdi:radiobox-blank",
        "state-icon",
      );

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, _attributes) {
      const isOn = state === "on";
      const label = this.i18n.t(`state.${state}`) !== `state.${state}`
        ? this.i18n.t(`state.${state}`)
        : state;

      if (this.#circle) {
        this.#circle.setAttribute("data-on", String(isOn));
        this.#circle.setAttribute("aria-label", `${this.def.friendly_name}: ${label}`);
      }

      const iconName = this.def.icon_state_map?.[state]
        ?? this.def.icon
        ?? (isOn ? "mdi:radiobox-marked" : "mdi:radiobox-blank");
      this.renderIcon(iconName, "state-icon");

      this.announceState(`${this.def.friendly_name}, ${label}`);
    }
  }

  // ---------------------------------------------------------------------------
  // CoverCard
  // ---------------------------------------------------------------------------

  const COVER_ICON_OPEN = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 14h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V10z" opacity="0.3"/><path d="M3 4h18v2H3V4zm0 16h18v2H3v-2z"/></svg>`;
  const COVER_ICON_STOP = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
  const COVER_ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>`;

  const COVER_STYLES = /* css */`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: 0 var(--hrv-card-padding, 16px) 0;
    }

    [part=companion-zone] {
      margin-top: 6px;
      border-top: none;
      padding-top: 0;
      padding-bottom: var(--hrv-card-padding, 16px);
      justify-content: center;
      gap: 12px;
    }
    [part=companion-zone]:empty { display: none; }

    .hrv-cover-slider-wrap {
      padding: 16px 8px 20px;
    }
    .hrv-cover-slider-track {
      position: relative;
      height: 6px;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      border-radius: 3px;
      cursor: pointer;
    }
    .hrv-cover-slider-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--hrv-color-primary, #1976d2);
      border-radius: 3px;
      transition: width 0.15s;
      pointer-events: none;
    }
    .hrv-cover-slider-thumb {
      position: absolute;
      top: 50%;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: transparent;
      border: 3px solid var(--hrv-ex-thumb, #fff);
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.15s;
      box-sizing: border-box;
    }
    .hrv-cover-slider-thumb:active { cursor: grabbing; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-cover-slider-fill,
      .hrv-cover-slider-thumb { transition: none; }
    }

    .hrv-cover-btns {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding: 0 0 16px;
    }
    .hrv-cover-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.35));
      background: transparent;
      color: var(--hrv-color-text, #fff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: border-color 0.15s, background 0.15s;
    }
    .hrv-cover-btn svg { width: 22px; height: 22px; }
    .hrv-cover-btn:active,
    .hrv-cover-btn[data-pressing=true] {
      border-color: var(--hrv-ex-ring, #fff);
      transition: none;
    }
    .hrv-cover-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .hrv-cover-btn:disabled:active { background: transparent; border-color: var(--hrv-ex-outline, rgba(255,255,255,0.35)); }
  `;

  class CoverCard extends BaseCard {
    /** @type {HTMLElement|null}       */ #sliderTrack  = null;
    /** @type {HTMLElement|null}       */ #sliderFill   = null;
    /** @type {HTMLElement|null}       */ #sliderThumb  = null;
    /** @type {HTMLButtonElement|null} */ #openBtn      = null;
    /** @type {HTMLButtonElement|null} */ #stopBtn      = null;
    /** @type {HTMLButtonElement|null} */ #closeBtn     = null;
    /** @type {boolean}               */ #dragging     = false;
    /** @type {number}                */ #position     = 0;
    /** @type {string}                */ #lastState    = "closed";
    /** @type {object}                */ #lastAttrs    = {};
    /** @type {Function}              */ #sendDebounce;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendDebounce = _debounce(this.#doSendPosition.bind(this), 300);
    }

    render() {
      const isWritable  = this.def.capabilities === "read-write";
      const hasPosition = this.def.supported_features?.includes("set_position");
      const hasButtons  = !this.def.supported_features || this.def.supported_features.includes("buttons");

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${COVER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${hasPosition ? /* html */`
              <div class="hrv-cover-slider-wrap" title="${isWritable ? "Drag to set position" : "Read-only"}">
                <div class="hrv-cover-slider-track" ${!isWritable ? 'style="cursor:not-allowed"' : ""}>
                  <div class="hrv-cover-slider-fill" style="width:0%"></div>
                  <div class="hrv-cover-slider-thumb" style="left:0%;${!isWritable ? "cursor:not-allowed;pointer-events:none" : ""}"></div>
                </div>
              </div>
            ` : ""}
            ${isWritable && hasButtons ? /* html */`
              <div class="hrv-cover-btns">
                <button class="hrv-cover-btn" data-action="open" type="button"
                  title="Open cover" aria-label="Open cover">${COVER_ICON_OPEN}</button>
                <button class="hrv-cover-btn" data-action="stop" type="button"
                  title="Stop cover" aria-label="Stop cover">${COVER_ICON_STOP}</button>
                <button class="hrv-cover-btn" data-action="close" type="button"
                  title="Close cover" aria-label="Close cover">${COVER_ICON_CLOSE}</button>
              </div>
            ` : ""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#sliderTrack = this.root.querySelector(".hrv-cover-slider-track");
      this.#sliderFill  = this.root.querySelector(".hrv-cover-slider-fill");
      this.#sliderThumb = this.root.querySelector(".hrv-cover-slider-thumb");
      this.#openBtn     = this.root.querySelector("[data-action=open]");
      this.#stopBtn     = this.root.querySelector("[data-action=stop]");
      this.#closeBtn    = this.root.querySelector("[data-action=close]");

      if (this.#sliderTrack && this.#sliderThumb && isWritable) {
        const onDown = (e) => {
          this.#dragging = true;
          this.#sliderThumb.style.transition = "none";
          this.#sliderFill.style.transition = "none";
          this.#updateSliderFromPointer(e);
          this.#sliderThumb.setPointerCapture(e.pointerId);
        };
        this.#sliderThumb.addEventListener("pointerdown", onDown);
        this.#sliderTrack.addEventListener("pointerdown", (e) => {
          if (e.target === this.#sliderThumb) return;
          this.#dragging = true;
          this.#sliderThumb.style.transition = "none";
          this.#sliderFill.style.transition = "none";
          this.#updateSliderFromPointer(e);
          this.#sliderThumb.setPointerCapture(e.pointerId);
        });
        this.#sliderThumb.addEventListener("pointermove", (e) => {
          if (!this.#dragging) return;
          this.#updateSliderFromPointer(e);
        });
        const onUp = () => {
          if (!this.#dragging) return;
          this.#dragging = false;
          this.#sliderThumb.style.transition = "";
          this.#sliderFill.style.transition = "";
          this.#sendDebounce();
        };
        this.#sliderThumb.addEventListener("pointerup", onUp);
        this.#sliderThumb.addEventListener("pointercancel", onUp);
      }

      [this.#openBtn, this.#stopBtn, this.#closeBtn].forEach(btn => {
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        btn.addEventListener("click", () => {
          this.config.card?.sendCommand(`${action}_cover`, {});
        });
        btn.addEventListener("pointerdown",   () => btn.setAttribute("data-pressing", "true"));
        btn.addEventListener("pointerup",     () => btn.removeAttribute("data-pressing"));
        btn.addEventListener("pointerleave",  () => btn.removeAttribute("data-pressing"));
        btn.addEventListener("pointercancel", () => btn.removeAttribute("data-pressing"));
      });

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    #updateSliderFromPointer(e) {
      const rect = this.#sliderTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      this.#position = Math.round(pct);
      this.#sliderFill.style.width = `${this.#position}%`;
      this.#sliderThumb.style.left = `${this.#position}%`;
    }

    #doSendPosition() {
      this.config.card?.sendCommand("set_cover_position", { position: this.#position });
    }

    applyState(state, attributes) {
      this.#lastState = state;
      this.#lastAttrs = { ...attributes };

      const isMoving = state === "opening" || state === "closing";
      const pos = attributes.current_position;
      if (this.#openBtn)  this.#openBtn.disabled  = !isMoving && pos === 100;
      if (this.#stopBtn)  this.#stopBtn.disabled   = !isMoving;
      if (this.#closeBtn) this.#closeBtn.disabled  = !isMoving && state === "closed";

      if (attributes.current_position !== undefined && !this.#dragging) {
        this.#position = attributes.current_position;
        if (this.#sliderFill) this.#sliderFill.style.width = `${this.#position}%`;
        if (this.#sliderThumb) this.#sliderThumb.style.left = `${this.#position}%`;
      }

      this.announceState(`${this.def.friendly_name}, ${state}`);
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
  }

  // ---------------------------------------------------------------------------
  // InputNumberCard
  // ---------------------------------------------------------------------------

  const INPUT_NUMBER_STYLES = /* css */`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: var(--hrv-card-padding, 16px) var(--hrv-card-padding, 16px) 0;
    }

    .hrv-num-slider-wrap {
      padding: 20px 8px 20px;
    }
    .hrv-num-slider-track {
      position: relative;
      height: 6px;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      border-radius: 3px;
      cursor: pointer;
    }
    .hrv-num-slider-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--hrv-color-primary, #1976d2);
      border-radius: 3px;
      transition: width 0.15s;
      pointer-events: none;
    }
    .hrv-num-slider-thumb {
      position: absolute;
      top: 50%;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: transparent;
      border: 3px solid var(--hrv-ex-thumb, #fff);
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.15s;
    }
    .hrv-num-slider-thumb:active { cursor: grabbing; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-num-slider-fill,
      .hrv-num-slider-thumb { transition: none; }
    }

    .hrv-num-input-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      padding: 0 0 16px;
    }
    .hrv-num-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-on-primary, #fff);
      cursor: pointer;
      padding: 0;
      font-size: 22px;
      font-weight: 300;
      line-height: 1;
      transition: opacity 150ms ease, box-shadow 150ms ease;
    }
    .hrv-num-btn:hover { opacity: 0.85; }
    .hrv-num-btn:focus-visible { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    .hrv-num-btn:active { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    .hrv-num-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-num-btn:disabled:hover { opacity: 0.35; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-num-btn { transition: none; }
    }

    .hrv-num-input {
      width: 58px;
      padding: 4px 6px;
      border: 1.5px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.18));
      border-radius: var(--hrv-radius-s, 8px);
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.10));
      color: var(--hrv-color-text, #fff);
      font-size: 18px;
      font-weight: 500;
      font-family: inherit;
      text-align: center;
      outline: none;
      -webkit-appearance: textfield;
      -moz-appearance: textfield;
      appearance: textfield;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .hrv-num-input::-webkit-outer-spin-button,
    .hrv-num-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .hrv-num-input:focus {
      border-color: var(--hrv-color-primary, #1976d2);
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.35);
    }
    .hrv-num-unit {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.6));
    }

    .hrv-num-readonly {
      display: flex;
      align-items: baseline;
      justify-content: center;
      padding: 28px 0 32px;
      gap: 4px;
    }
    .hrv-num-readonly-val {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1;
    }
    .hrv-num-readonly-unit {
      font-size: 18px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    [part=history-graph] {
      margin-top: 0;
      padding: 0;
      border-radius: 0 0 var(--hrv-radius-l, 16px) var(--hrv-radius-l, 16px);
      overflow: hidden;
    }
    [part=history-svg] {
      height: 56px;
      display: block;
    }
    [part=history-empty] { display: none; }
  `;

  class InputNumberCard extends BaseCard {
    /** @type {HTMLElement|null}      */ #sliderTrack  = null;
    /** @type {HTMLElement|null}      */ #sliderFill   = null;
    /** @type {HTMLElement|null}      */ #sliderThumb  = null;
    /** @type {HTMLInputElement|null} */ #numInput     = null;
    /** @type {HTMLElement|null}      */ #readonlyVal  = null;
    /** @type {HTMLButtonElement|null} */ #decBtn      = null;
    /** @type {HTMLButtonElement|null} */ #incBtn      = null;
    /** @type {boolean}              */ #dragging     = false;
    /** @type {number}               */ #value        = 0;
    /** @type {number}               */ #min          = 0;
    /** @type {number}               */ #max          = 100;
    /** @type {number}               */ #step         = 1;
    /** @type {Function}             */ #sendDebounce;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendDebounce = _debounce(this.#doSend.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.#min  = this.def.feature_config?.min  ?? 0;
      this.#max  = this.def.feature_config?.max  ?? 100;
      this.#step = this.def.feature_config?.step ?? 1;
      const unit = this.def.unit_of_measurement ?? "";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${INPUT_NUMBER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${isWritable ? /* html */`
              <div class="hrv-num-slider-wrap" title="Drag to set value">
                <div class="hrv-num-slider-track">
                  <div class="hrv-num-slider-fill" style="width:0%"></div>
                  <div class="hrv-num-slider-thumb" style="left:0%"></div>
                </div>
              </div>
              <div class="hrv-num-input-row">
                <button class="hrv-num-btn" type="button" part="dec-btn"
                  aria-label="Decrease ${_esc(this.def.friendly_name)}">-</button>
                <input class="hrv-num-input" type="number"
                  min="${this.#min}" max="${this.#max}" step="${this.#step}"
                  title="Enter value" aria-label="${_esc(this.def.friendly_name)} value">
                <button class="hrv-num-btn" type="button" part="inc-btn"
                  aria-label="Increase ${_esc(this.def.friendly_name)}">+</button>
                ${unit ? `<span class="hrv-num-unit">${_esc(unit)}</span>` : ""}
              </div>
            ` : /* html */`
              <div class="hrv-num-readonly">
                <span class="hrv-num-readonly-val">-</span>
                ${unit ? `<span class="hrv-num-readonly-unit">${_esc(unit)}</span>` : ""}
              </div>
            `}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#sliderTrack = this.root.querySelector(".hrv-num-slider-track");
      this.#sliderFill  = this.root.querySelector(".hrv-num-slider-fill");
      this.#sliderThumb = this.root.querySelector(".hrv-num-slider-thumb");
      this.#numInput    = this.root.querySelector(".hrv-num-input");
      this.#readonlyVal = this.root.querySelector(".hrv-num-readonly-val");
      this.#decBtn      = this.root.querySelector("[part=dec-btn]");
      this.#incBtn      = this.root.querySelector("[part=inc-btn]");

      if (this.#sliderTrack && this.#sliderThumb) {
        const onDown = (e) => {
          this.#dragging = true;
          this.#sliderThumb.style.transition = "none";
          this.#sliderFill.style.transition = "none";
          this.#updateSliderFromPointer(e);
          this.#sliderThumb.setPointerCapture(e.pointerId);
        };
        this.#sliderThumb.addEventListener("pointerdown", onDown);
        this.#sliderTrack.addEventListener("pointerdown", (e) => {
          if (e.target === this.#sliderThumb) return;
          this.#dragging = true;
          this.#sliderThumb.style.transition = "none";
          this.#sliderFill.style.transition = "none";
          this.#updateSliderFromPointer(e);
          this.#sliderThumb.setPointerCapture(e.pointerId);
        });
        this.#sliderThumb.addEventListener("pointermove", (e) => {
          if (!this.#dragging) return;
          this.#updateSliderFromPointer(e);
        });
        const onUp = () => {
          if (!this.#dragging) return;
          this.#dragging = false;
          this.#sliderThumb.style.transition = "";
          this.#sliderFill.style.transition = "";
          this.#sendDebounce();
        };
        this.#sliderThumb.addEventListener("pointerup", onUp);
        this.#sliderThumb.addEventListener("pointercancel", onUp);
      }

      if (this.#numInput) {
        this.#numInput.addEventListener("input", () => {
          const v = parseFloat(this.#numInput.value);
          if (isNaN(v)) return;
          this.#value = Math.max(this.#min, Math.min(this.#max, v));
          this.#syncSlider();
          this.#updateBtnStates();
          this.#sendDebounce();
        });
      }

      if (this.#decBtn) {
        this.#decBtn.addEventListener("click", () => {
          this.#value = +Math.max(this.#min, this.#value - this.#step).toFixed(10);
          this.#syncSlider();
          if (this.#numInput) this.#numInput.value = String(this.#value);
          this.#updateBtnStates();
          this.#sendDebounce();
        });
      }

      if (this.#incBtn) {
        this.#incBtn.addEventListener("click", () => {
          this.#value = +Math.min(this.#max, this.#value + this.#step).toFixed(10);
          this.#syncSlider();
          if (this.#numInput) this.#numInput.value = String(this.#value);
          this.#updateBtnStates();
          this.#sendDebounce();
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    #valToPct(v) {
      const range = this.#max - this.#min;
      if (range === 0) return 0;
      return Math.max(0, Math.min(100, ((v - this.#min) / range) * 100));
    }

    #pctToVal(pct) {
      const raw = this.#min + (pct / 100) * (this.#max - this.#min);
      const stepped = Math.round(raw / this.#step) * this.#step;
      return Math.max(this.#min, Math.min(this.#max, +stepped.toFixed(10)));
    }

    #syncSlider() {
      const pct = this.#valToPct(this.#value);
      if (this.#sliderFill)  this.#sliderFill.style.width = `${pct}%`;
      if (this.#sliderThumb) this.#sliderThumb.style.left = `${pct}%`;
    }

    #updateSliderFromPointer(e) {
      const rect = this.#sliderTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      this.#value = this.#pctToVal(pct);
      this.#syncSlider();
      if (this.#numInput) this.#numInput.value = String(this.#value);
      this.#updateBtnStates();
    }

    #doSend() {
      this.config.card?.sendCommand("set_value", { value: this.#value });
    }

    #updateBtnStates() {
      if (this.#decBtn) this.#decBtn.disabled = this.#value <= this.#min;
      if (this.#incBtn) this.#incBtn.disabled = this.#value >= this.#max;
    }

    applyState(state, _attributes) {
      const v = parseFloat(state);
      if (isNaN(v)) return;
      this.#value = v;

      if (!this.#dragging) {
        this.#syncSlider();
        if (this.#numInput && !this.isFocused(this.#numInput)) {
          this.#numInput.value = String(v);
        }
      }

      this.#updateBtnStates();

      if (this.#readonlyVal) {
        this.#readonlyVal.textContent = String(v);
      }

      const unit = this.def.unit_of_measurement ?? "";
      this.announceState(`${this.def.friendly_name}, ${v}${unit ? ` ${unit}` : ""}`);
    }

    predictState(action, data) {
      if (action === "set_value" && data.value !== undefined) {
        return { state: String(data.value), attributes: {} };
      }
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // InputSelectCard
  // ---------------------------------------------------------------------------

  const INPUT_SELECT_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--hrv-spacing-s, 8px) var(--hrv-spacing-m, 16px) var(--hrv-spacing-m, 16px);
      position: relative;
    }

    .hrv-is-selected {
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--hrv-radius-s, 8px);
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.10));
      color: var(--hrv-color-text, #fff);
      font-size: 14px;
      font-family: inherit;
      text-align: left;
      border: 1px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.12));
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.15s;
    }
    .hrv-is-selected:hover { background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15)); }
    .hrv-is-selected[data-readonly=true] {
      cursor: not-allowed;
      border-color: transparent;
      background: transparent;
      justify-content: center;
    }
    .hrv-is-selected[data-readonly=true]:hover { background: transparent; }
    .hrv-is-arrow { font-size: 10px; opacity: 0.5; }

    .hrv-is-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--hrv-radius-s, 8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px var(--hrv-ex-glass-border, rgba(255,255,255,0.12));
      overflow: hidden;
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: none;
      z-index: 10;
    }
    .hrv-is-option {
      display: block;
      width: 100%;
      padding: 8px 14px;
      border: none;
      background: transparent;
      color: var(--hrv-color-text, #fff);
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: background 0.1s;
    }
    .hrv-is-option + .hrv-is-option {
      border-top: 1px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.06));
    }
    .hrv-is-option:hover { background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.08)); }
    .hrv-is-option[data-active=true] { color: var(--hrv-color-primary, #1976d2); }
  `;

  class InputSelectCard extends BaseCard {
    /** @type {HTMLElement|null}  */ #selectedBtn = null;
    /** @type {HTMLElement|null}  */ #dropdown    = null;
    /** @type {string}           */ #current     = "";
    /** @type {string[]}         */ #options     = [];
    /** @type {boolean}          */ #isOpen      = false;

    render() {
      const isWritable = this.def.capabilities === "read-write";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${INPUT_SELECT_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-is-selected" type="button"
              ${!isWritable ? 'data-readonly="true" title="Read-only" disabled' : 'title="Select an option"'}
              aria-label="${_esc(this.def.friendly_name)}">
              <span class="hrv-is-label">-</span>
              ${isWritable ? '<span class="hrv-is-arrow" aria-hidden="true">&#9660;</span>' : ""}
            </button>
            ${isWritable ? '<div class="hrv-is-dropdown" hidden></div>' : ""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#selectedBtn = this.root.querySelector(".hrv-is-selected");
      this.#dropdown    = this.root.querySelector(".hrv-is-dropdown");

      if (this.#selectedBtn && isWritable) {
        this.#selectedBtn.addEventListener("click", () => {
          if (this.#isOpen) { this.#closeDropdown(); }
          else { this.#openDropdown(); }
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    #openDropdown() {
      if (!this.#dropdown || !this.#options.length) return;

      this.#dropdown.innerHTML = this.#options.map(opt => /* html */`
        <button class="hrv-is-option" type="button"
          data-active="${opt === this.#current}"
          title="${_esc(opt)}">
          ${_esc(opt)}
        </button>
      `).join("");

      this.#dropdown.querySelectorAll(".hrv-is-option").forEach((btn, i) => {
        btn.addEventListener("click", () => {
          this.config.card?.sendCommand("select_option", { option: this.#options[i] });
          this.#closeDropdown();
        });
      });

      const card = this.root.querySelector("[part=card]");
      if (card) card.style.overflow = "visible";
      this.#dropdown.removeAttribute("hidden");
      this.#isOpen = true;
    }

    #closeDropdown() {
      this.#dropdown?.setAttribute("hidden", "");
      const card = this.root.querySelector("[part=card]");
      if (card) card.style.overflow = "";
      this.#isOpen = false;
    }

    applyState(state, attributes) {
      this.#current = state;
      this.#options = attributes?.options ?? this.#options;

      const label = this.root.querySelector(".hrv-is-label");
      if (label) label.textContent = state;

      if (this.#isOpen) {
        this.#dropdown?.querySelectorAll(".hrv-is-option").forEach((btn, i) => {
          btn.setAttribute("data-active", String(this.#options[i] === state));
        });
      }

      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    predictState(action, data) {
      if (action === "select_option" && data.option !== undefined) {
        return { state: String(data.option), attributes: {} };
      }
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // MediaPlayerCard
  // ---------------------------------------------------------------------------

  const MEDIA_PLAYER_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: var(--hrv-spacing-s, 8px) var(--hrv-spacing-m, 16px) var(--hrv-spacing-m, 16px);
    }

    .hrv-mp-info {
      text-align: center;
      min-height: 32px;
    }
    .hrv-mp-artist {
      font-size: 11px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.6));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hrv-mp-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--hrv-color-text, #fff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hrv-mp-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }
    .hrv-mp-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-on-primary, #fff);
      cursor: pointer;
      padding: 0;
      box-shadow: none;
      transition: box-shadow 150ms ease, opacity 150ms ease;
    }
    .hrv-mp-btn:hover { opacity: 0.85; }
    .hrv-mp-btn:active,
    .hrv-mp-btn[data-pressing=true] {
      box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff);
    }
    .hrv-mp-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-mp-btn svg { width: 20px; height: 20px; display: block; }
    .hrv-mp-btn[data-role=play] { width: 48px; height: 48px; }
    .hrv-mp-btn[data-role=play] svg { width: 24px; height: 24px; display: block; }

    .hrv-mp-volume {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hrv-mp-mute {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--hrv-color-text, #fff);
      cursor: pointer;
      padding: 0;
      transition: opacity 150ms;
    }
    .hrv-mp-mute:hover { opacity: 0.7; }
    .hrv-mp-mute:disabled { opacity: 0.35; cursor: not-allowed; }
    .hrv-mp-mute svg { width: 20px; height: 20px; display: block; }

    .hrv-mp-slider-wrap { flex: 1; padding: 4px 0; }
    .hrv-mp-slider-track {
      position: relative;
      height: 6px;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      border-radius: 3px;
      cursor: pointer;
    }
    .hrv-mp-slider-fill {
      position: absolute;
      left: 0; top: 0;
      height: 100%;
      background: var(--hrv-color-primary, #1976d2);
      border-radius: 3px;
      transition: width 0.15s;
      pointer-events: none;
    }
    .hrv-mp-slider-thumb {
      position: absolute;
      top: 50%;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.15s;
      box-sizing: border-box;
    }
    .hrv-mp-slider-thumb:active { cursor: grabbing; }
    .hrv-mp-slider-track[data-readonly=true] { cursor: not-allowed; }
    .hrv-mp-slider-track[data-readonly=true] .hrv-mp-slider-thumb {
      cursor: not-allowed;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .hrv-mp-slider-fill,
      .hrv-mp-slider-thumb { transition: none; }
      .hrv-mp-btn { transition: none; }
    }
  `;

  class MediaPlayerCard extends BaseCard {
    /** @type {HTMLButtonElement|null}  */ #playBtn      = null;
    /** @type {HTMLButtonElement|null}  */ #prevBtn      = null;
    /** @type {HTMLButtonElement|null}  */ #nextBtn      = null;
    /** @type {HTMLButtonElement|null}  */ #muteBtn      = null;
    /** @type {HTMLElement|null}        */ #sliderTrack  = null;
    /** @type {HTMLElement|null}        */ #sliderFill   = null;
    /** @type {HTMLElement|null}        */ #sliderThumb  = null;
    /** @type {HTMLElement|null}        */ #artistEl     = null;
    /** @type {HTMLElement|null}        */ #titleEl      = null;
    /** @type {boolean}                 */ #isMuted      = false;
    /** @type {number}                  */ #volume       = 0;
    /** @type {boolean}                 */ #dragging     = false;
    /** @type {Function}                */ #sendDebounce;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendDebounce = this.debounce(this.#doSendVolume.bind(this), 200);
    }

    render() {
      const isWritable  = this.def.capabilities === "read-write";
      const features    = this.def.supported_features ?? [];
      const hasVolume   = features.includes("volume_set");
      const hasPrevNext = features.includes("previous_track");

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${MEDIA_PLAYER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-mp-info">
              <div class="hrv-mp-artist" title="Artist"></div>
              <div class="hrv-mp-title" title="Title"></div>
            </div>
            ${isWritable ? /* html */`
              <div class="hrv-mp-controls">
                ${hasPrevNext ? /* html */`
                  <button class="hrv-mp-btn" data-role="prev" type="button"
                    title="Previous track">
                    <span part="prev-icon" aria-hidden="true"></span>
                  </button>
                ` : ""}
                <button class="hrv-mp-btn" data-role="play" type="button"
                  title="Play">
                  <span part="play-icon" aria-hidden="true"></span>
                </button>
                ${hasPrevNext ? /* html */`
                  <button class="hrv-mp-btn" data-role="next" type="button"
                    title="Next track">
                    <span part="next-icon" aria-hidden="true"></span>
                  </button>
                ` : ""}
              </div>
            ` : ""}
            ${hasVolume ? /* html */`
              <div class="hrv-mp-volume" title="${isWritable ? "Volume" : "Read-only"}">
                <button class="hrv-mp-mute" type="button"
                  title="${isWritable ? "Mute" : "Read-only"}"
                  ${!isWritable ? "disabled" : ""}>
                  <span part="mute-icon" aria-hidden="true"></span>
                </button>
                <div class="hrv-mp-slider-wrap">
                  <div class="hrv-mp-slider-track" ${!isWritable ? 'data-readonly="true"' : ""}>
                    <div class="hrv-mp-slider-fill" style="width:0%"></div>
                    <div class="hrv-mp-slider-thumb" style="left:0%"></div>
                  </div>
                </div>
              </div>
            ` : ""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#playBtn     = this.root.querySelector("[data-role=play]");
      this.#prevBtn     = this.root.querySelector("[data-role=prev]");
      this.#nextBtn     = this.root.querySelector("[data-role=next]");
      this.#muteBtn     = this.root.querySelector(".hrv-mp-mute");
      this.#sliderTrack = this.root.querySelector(".hrv-mp-slider-track");
      this.#sliderFill  = this.root.querySelector(".hrv-mp-slider-fill");
      this.#sliderThumb = this.root.querySelector(".hrv-mp-slider-thumb");
      this.#artistEl    = this.root.querySelector(".hrv-mp-artist");
      this.#titleEl     = this.root.querySelector(".hrv-mp-title");

      this.renderIcon("mdi:play", "play-icon");
      this.renderIcon("mdi:skip-previous", "prev-icon");
      this.renderIcon("mdi:skip-next", "next-icon");
      this.renderIcon("mdi:volume-high", "mute-icon");

      if (isWritable) {
        this.#playBtn?.addEventListener("click", () => {
          this.config.card?.sendCommand("media_play_pause", {});
        });
        this.#prevBtn?.addEventListener("click", () =>
          this.config.card?.sendCommand("media_previous_track", {}));
        this.#nextBtn?.addEventListener("click", () =>
          this.config.card?.sendCommand("media_next_track", {}));

        [this.#playBtn, this.#prevBtn, this.#nextBtn].forEach(btn => {
          if (!btn) return;
          btn.addEventListener("pointerdown",   () => btn.setAttribute("data-pressing", "true"));
          btn.addEventListener("pointerup",     () => btn.removeAttribute("data-pressing"));
          btn.addEventListener("pointerleave",  () => btn.removeAttribute("data-pressing"));
          btn.addEventListener("pointercancel", () => btn.removeAttribute("data-pressing"));
        });

        this.#muteBtn?.addEventListener("click", () =>
          this.config.card?.sendCommand("volume_mute", { is_volume_muted: !this.#isMuted }));

        if (this.#sliderTrack && this.#sliderThumb) {
          const onDown = (e) => {
            this.#dragging = true;
            this.#sliderThumb.style.transition = "none";
            this.#sliderFill.style.transition = "none";
            this.#updateSliderFromPointer(e);
            this.#sliderThumb.setPointerCapture(e.pointerId);
          };
          this.#sliderThumb.addEventListener("pointerdown", onDown);
          this.#sliderTrack.addEventListener("pointerdown", (e) => {
            if (e.target === this.#sliderThumb) return;
            this.#dragging = true;
            this.#sliderThumb.style.transition = "none";
            this.#sliderFill.style.transition = "none";
            this.#updateSliderFromPointer(e);
            this.#sliderThumb.setPointerCapture(e.pointerId);
          });
          this.#sliderThumb.addEventListener("pointermove", (e) => {
            if (!this.#dragging) return;
            this.#updateSliderFromPointer(e);
          });
          const onUp = () => {
            if (!this.#dragging) return;
            this.#dragging = false;
            this.#sliderThumb.style.transition = "";
            this.#sliderFill.style.transition = "";
            this.#sendDebounce();
          };
          this.#sliderThumb.addEventListener("pointerup", onUp);
          this.#sliderThumb.addEventListener("pointercancel", onUp);
        }
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    #updateSliderFromPointer(e) {
      const rect = this.#sliderTrack.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      this.#volume = Math.round(pct);
      this.#sliderFill.style.width = `${this.#volume}%`;
      this.#sliderThumb.style.left = `${this.#volume}%`;
    }

    #doSendVolume() {
      this.config.card?.sendCommand("volume_set", { volume_level: this.#volume / 100 });
    }

    applyState(state, attributes) {
      const isPlaying = state === "playing";
      const isPaused  = state === "paused";

      if (this.#artistEl) {
        const artist = attributes.media_artist ?? "";
        this.#artistEl.textContent = artist;
        this.#artistEl.title = artist || "Artist";
      }
      if (this.#titleEl) {
        const title = attributes.media_title ?? "";
        this.#titleEl.textContent = title;
        this.#titleEl.title = title || "Title";
      }

      if (this.#playBtn) {
        this.#playBtn.setAttribute("data-playing", String(isPlaying));
        const iconName = isPlaying ? "mdi:pause" : "mdi:play";
        this.renderIcon(iconName, "play-icon");
        if (this.def.capabilities === "read-write") {
          this.#playBtn.title = isPlaying ? "Pause" : "Play";
        }
      }

      this.#isMuted = !!attributes.is_volume_muted;
      if (this.#muteBtn) {
        const iconName = this.#isMuted ? "mdi:volume-off" : "mdi:volume-high";
        this.renderIcon(iconName, "mute-icon");
        if (this.def.capabilities === "read-write") {
          this.#muteBtn.title = this.#isMuted ? "Unmute" : "Mute";
        }
      }

      if (attributes.volume_level !== undefined && !this.#dragging) {
        this.#volume = Math.round(attributes.volume_level * 100);
        if (this.#sliderFill) this.#sliderFill.style.width = `${this.#volume}%`;
        if (this.#sliderThumb) this.#sliderThumb.style.left = `${this.#volume}%`;
      }

      const title = attributes.media_title ?? "";
      this.announceState(
        `${this.def.friendly_name}, ${state}${title ? ` - ${title}` : ""}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // RemoteCard
  // ---------------------------------------------------------------------------

  const REMOTE_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-remote-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      padding: 0;
      color: var(--hrv-color-on-primary, #fff);
      box-shadow: none;
      transition: box-shadow 150ms ease, opacity 150ms ease;
    }
    .hrv-remote-circle:hover { opacity: 0.85; }
    .hrv-remote-circle:active,
    .hrv-remote-circle[data-pressing=true] {
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }
    .hrv-remote-circle:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-remote-circle:disabled:hover { opacity: 0.35; }
    [part=remote-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    [part=remote-icon] svg { width: 40px; height: 40px; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-remote-circle { transition: none; }
    }
  `;

  class RemoteCard extends BaseCard {
    /** @type {HTMLButtonElement|null} */ #btn = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const commandLabel = this.config.tapAction?.data?.command ?? "power";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${REMOTE_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-remote-circle" type="button"
              title="${isWritable ? _esc(commandLabel) : "Read-only"}"
              aria-label="${_esc(this.def.friendly_name)} - ${_esc(commandLabel)}"
              ${!isWritable ? "disabled" : ""}>
              <span part="remote-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#btn = this.root.querySelector(".hrv-remote-circle");

      const icon = this.resolveIcon(this.def.icon, "mdi:remote");
      this.renderIcon(icon, "remote-icon");

      if (this.#btn && isWritable) {
        this._attachGestureHandlers(this.#btn, {
          onTap: () => {
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            const cmd    = this.config.tapAction?.data?.command ?? "power";
            const device = this.config.tapAction?.data?.device ?? undefined;
            const data   = device ? { command: cmd, device } : { command: cmd };
            this.config.card?.sendCommand("send_command", data);
          },
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, _attributes) {
      const iconName = this.def.icon_state_map?.[state] ?? this.def.icon ?? "mdi:remote";
      this.renderIcon(this.resolveIcon(iconName, "mdi:remote"), "remote-icon");

      this.announceState(`${this.def.friendly_name}, ${state}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SensorCard
  // ---------------------------------------------------------------------------

  const SENSOR_STYLES = /* css */`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
      padding: 28px 0 32px;
    }

    .hrv-sensor-val {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1;
    }
    .hrv-sensor-unit {
      font-size: 18px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    [part=history-graph] {
      margin-top: 0;
      padding: 0;
      border-radius: 0 0 var(--hrv-radius-l, 16px) var(--hrv-radius-l, 16px);
      overflow: hidden;
    }
    [part=history-svg] {
      height: 56px;
      display: block;
    }
  `;

  class SensorCard extends BaseCard {
    /** @type {HTMLElement|null} */ #valueEl = null;
    /** @type {HTMLElement|null} */ #unitEl  = null;

    render() {
      const unit = this.def.unit_of_measurement ?? "";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${SENSOR_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" title="${_esc(this.def.friendly_name)}">
            <span class="hrv-sensor-val" aria-live="polite">-</span>
            ${unit ? `<span class="hrv-sensor-unit" title="${_esc(unit)}">${_esc(unit)}</span>` : ""}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#valueEl = this.root.querySelector(".hrv-sensor-val");
      this.#unitEl  = this.root.querySelector(".hrv-sensor-unit");

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, attributes) {
      if (this.#valueEl) this.#valueEl.textContent = state;
      if (this.#unitEl && attributes.unit_of_measurement !== undefined) {
        this.#unitEl.textContent = attributes.unit_of_measurement;
      }

      const unit = attributes.unit_of_measurement ?? this.def.unit_of_measurement ?? "";
      const body = this.root.querySelector("[part=card-body]");
      if (body) body.title = `${state}${unit ? ` ${unit}` : ""}`;

      this.announceState(`${this.def.friendly_name}, ${state}${unit ? ` ${unit}` : ""}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SwitchCard
  // ---------------------------------------------------------------------------

  const SWITCH_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 0 24px;
    }

    button.hrv-switch-track {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      position: relative;
      width: 48px;
      height: 96px;
      border-radius: 24px;
      background: var(--hrv-ex-toggle-idle, rgba(255,255,255,0.25));
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.3));
      cursor: pointer;
      padding: 0;
      margin: 0;
      outline: none;
      font: inherit;
      color: inherit;
      line-height: 1;
      text-align: center;
      text-decoration: none;
      transition: background 250ms ease, border-color 250ms ease;
      user-select: none;
      box-sizing: border-box;
    }
    .hrv-switch-track:focus-visible {
      box-shadow: 0 0 0 3px var(--hrv-color-primary, #1976d2);
    }
    .hrv-switch-track[data-on=true] {
      background: var(--hrv-color-primary, #1976d2);
      border-color: var(--hrv-color-primary, #1976d2);
    }
    .hrv-switch-track:hover { opacity: 0.85; }
    .hrv-switch-track:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hrv-switch-track:disabled:hover { opacity: 0.4; }

    .hrv-switch-knob {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: top 200ms ease;
      pointer-events: none;
      top: 52px;
    }
    .hrv-switch-track[data-on=true] .hrv-switch-knob {
      top: 4px;
    }

    .hrv-switch-ro {
      font-size: 28px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      text-align: center;
      padding: 28px 0 32px;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-switch-knob,
      .hrv-switch-track { transition: none; }
    }
  `;

  class SwitchCard extends BaseCard {
    /** @type {HTMLButtonElement|null} */ #track = null;
    /** @type {HTMLElement|null}       */ #roLabel = null;
    /** @type {boolean}               */ #isOn = false;

    render() {
      const isWritable = this.def.capabilities === "read-write";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${SWITCH_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${isWritable ? /* html */`
              <button class="hrv-switch-track" type="button" data-on="false"
                title="Toggle" aria-label="${_esc(this.def.friendly_name)} - Toggle">
                <div class="hrv-switch-knob"></div>
              </button>
            ` : /* html */`
              <div class="hrv-switch-ro" title="Read-only">-</div>
            `}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#track   = this.root.querySelector(".hrv-switch-track");
      this.#roLabel = this.root.querySelector(".hrv-switch-ro");

      if (this.#track && isWritable) {
        this._attachGestureHandlers(this.#track, {
          onTap: () => {
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("toggle", {});
          },
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, _attributes) {
      this.#isOn = state === "on";
      const isUnavailable = state === "unavailable" || state === "unknown";

      if (this.#track) {
        this.#track.setAttribute("data-on", String(this.#isOn));
        this.#track.title = this.#isOn ? "On - click to turn off" : "Off - click to turn on";
        this.#track.disabled = isUnavailable;
      }

      if (this.#roLabel) {
        this.#roLabel.textContent = _capitalize(state);
      }

      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    predictState(action, _data) {
      if (action !== "toggle") return null;
      return { state: this.#isOn ? "off" : "on", attributes: {} };
    }
  }

  // ---------------------------------------------------------------------------
  // TimerCard
  // ---------------------------------------------------------------------------

  const TIMER_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-timer-display {
      font-size: 48px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .hrv-timer-display[data-paused=true] {
      opacity: 0.6;
    }

    .hrv-timer-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }
    .hrv-timer-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-on-primary, #fff);
      cursor: pointer;
      padding: 0;
      box-shadow: none;
      transition: box-shadow 150ms ease, opacity 150ms ease;
    }
    .hrv-timer-btn:hover { opacity: 0.85; }
    .hrv-timer-btn:active,
    .hrv-timer-btn[data-pressing=true] {
      box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff);
    }
    .hrv-timer-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-timer-btn:disabled:hover { opacity: 0.35; }
    .hrv-timer-btn svg { width: 20px; height: 20px; }
    .hrv-timer-btn [part] {
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-timer-btn { transition: none; }
    }
  `;

  function _formatTimerTime(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function _parseDuration(dur) {
    if (typeof dur === "number") return dur;
    if (typeof dur !== "string") return 0;
    const parts = dur.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }

  class TimerCard extends BaseCard {
    /** @type {HTMLElement|null}       */ #displayEl   = null;
    /** @type {HTMLButtonElement|null} */ #playPauseBtn = null;
    /** @type {HTMLButtonElement|null} */ #cancelBtn    = null;
    /** @type {HTMLButtonElement|null} */ #finishBtn    = null;
    /** @type {ReturnType<typeof setInterval>|null} */ #tickInterval = null;
    /** @type {string}     */ #lastState   = "idle";
    /** @type {object}     */ #lastAttrs   = {};
    /** @type {string|null} */ #finishesAt = null;
    /** @type {number|null} */ #remaining  = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${TIMER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-timer-display" title="Time remaining">00:00</span>
            ${isWritable ? /* html */`
              <div class="hrv-timer-controls">
                <button class="hrv-timer-btn" data-action="playpause" type="button"
                  title="Start" aria-label="${_esc(this.def.friendly_name)} - Start">
                  <span part="playpause-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="cancel" type="button"
                  title="Cancel" aria-label="${_esc(this.def.friendly_name)} - Cancel">
                  <span part="cancel-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="finish" type="button"
                  title="Finish" aria-label="${_esc(this.def.friendly_name)} - Finish">
                  <span part="finish-icon" aria-hidden="true"></span>
                </button>
              </div>
            ` : ""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#displayEl    = this.root.querySelector(".hrv-timer-display");
      this.#playPauseBtn = this.root.querySelector("[data-action=playpause]");
      this.#cancelBtn    = this.root.querySelector("[data-action=cancel]");
      this.#finishBtn    = this.root.querySelector("[data-action=finish]");

      this.renderIcon("mdi:play", "playpause-icon");
      this.renderIcon("mdi:stop", "cancel-icon");
      this.renderIcon("mdi:check-circle", "finish-icon");

      if (isWritable) {
        this.#playPauseBtn?.addEventListener("click", () => {
          const cmd = this.#lastState === "active" ? "pause" : "start";
          this.config.card?.sendCommand(cmd, {});
        });
        this.#cancelBtn?.addEventListener("click", () => {
          this.config.card?.sendCommand("cancel", {});
        });
        this.#finishBtn?.addEventListener("click", () => {
          this.config.card?.sendCommand("finish", {});
        });

        [this.#playPauseBtn, this.#cancelBtn, this.#finishBtn].forEach(btn => {
          if (!btn) return;
          btn.addEventListener("pointerdown",   () => btn.setAttribute("data-pressing", "true"));
          btn.addEventListener("pointerup",     () => btn.removeAttribute("data-pressing"));
          btn.addEventListener("pointerleave",  () => btn.removeAttribute("data-pressing"));
          btn.addEventListener("pointercancel", () => btn.removeAttribute("data-pressing"));
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, attributes) {
      this.#lastState = state;
      this.#lastAttrs = { ...attributes };

      this.#finishesAt = attributes.finishes_at ?? null;
      this.#remaining  = attributes.remaining != null ? _parseDuration(attributes.remaining) : null;

      this.#updateButtons(state);
      this.#updateDisplay(state);

      if (state === "active" && this.#finishesAt) {
        this.#startTick();
      } else {
        this.#stopTick();
      }

      if (this.#displayEl) {
        this.#displayEl.setAttribute("data-paused", String(state === "paused"));
      }
    }

    predictState(action, _data) {
      const attrs = { ...this.#lastAttrs };
      if (action === "start") return { state: "active", attributes: attrs };
      if (action === "pause") {
        if (this.#finishesAt) {
          attrs.remaining = Math.max(0, (new Date(this.#finishesAt).getTime() - Date.now()) / 1000);
        }
        return { state: "paused", attributes: attrs };
      }
      if (action === "cancel" || action === "finish") return { state: "idle", attributes: attrs };
      return null;
    }

    #updateButtons(state) {
      const isIdle   = state === "idle";
      const isActive = state === "active";

      if (this.#playPauseBtn) {
        const icon  = isActive ? "mdi:pause" : "mdi:play";
        const label = isActive ? "Pause" : (state === "paused" ? "Resume" : "Start");
        this.renderIcon(icon, "playpause-icon");
        this.#playPauseBtn.title = label;
        this.#playPauseBtn.setAttribute("aria-label", `${this.def.friendly_name} - ${label}`);
      }
      if (this.#cancelBtn) this.#cancelBtn.disabled = isIdle;
      if (this.#finishBtn) this.#finishBtn.disabled = isIdle;

      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    #updateDisplay(state) {
      if (!this.#displayEl) return;

      if (state === "idle") {
        const dur = this.#lastAttrs.duration;
        this.#displayEl.textContent = dur ? _formatTimerTime(_parseDuration(dur)) : "00:00";
        return;
      }

      if (state === "paused" && this.#remaining != null) {
        this.#displayEl.textContent = _formatTimerTime(this.#remaining);
        return;
      }

      if (state === "active" && this.#finishesAt) {
        const secs = Math.max(0, (new Date(this.#finishesAt).getTime() - Date.now()) / 1000);
        this.#displayEl.textContent = _formatTimerTime(secs);
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
        if (this.#displayEl) this.#displayEl.textContent = _formatTimerTime(secs);
        if (secs <= 0) this.#stopTick();
      }, 1000);
    }

    #stopTick() {
      if (this.#tickInterval) {
        clearInterval(this.#tickInterval);
        this.#tickInterval = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // GenericCard (Tier 2 fallback)
  // ---------------------------------------------------------------------------

  const GENERIC_STYLES = /* css */`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-generic-state {
      font-size: 28px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      text-align: center;
    }

    button.hrv-generic-toggle {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      position: relative;
      width: 44px;
      height: 88px;
      border-radius: 22px;
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.15));
      cursor: pointer;
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.3));
      padding: 0;
      margin: 0;
      outline: none;
      font: inherit;
      color: inherit;
      transition: background 250ms ease, border-color 250ms ease;
      user-select: none;
      box-sizing: border-box;
    }
    .hrv-generic-toggle:focus-visible {
      box-shadow: 0 0 0 3px var(--hrv-color-primary, #1976d2);
    }
    .hrv-generic-toggle[data-on=true] {
      background: var(--hrv-color-primary, #1976d2);
      border-color: var(--hrv-color-primary, #1976d2);
    }
    .hrv-generic-toggle:hover { opacity: 0.85; }
    .hrv-generic-toggle:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hrv-generic-toggle:disabled:hover { opacity: 0.4; }

    .hrv-generic-knob {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: top 200ms ease;
      pointer-events: none;
      top: 48px;
    }
    .hrv-generic-toggle[data-on=true] .hrv-generic-knob {
      top: 4px;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-generic-knob,
      .hrv-generic-toggle { transition: none; }
    }
  `;

  class GenericCard extends BaseCard {
    /** @type {HTMLElement|null}       */ #stateEl  = null;
    /** @type {HTMLButtonElement|null} */ #toggle   = null;
    /** @type {boolean}               */ #isOn     = false;
    /** @type {boolean}               */ #hasToggle = false;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.#hasToggle = false;

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${GENERIC_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-generic-state" title="${_esc(this.def.friendly_name)}">-</span>
            ${isWritable ? /* html */`
              <button class="hrv-generic-toggle" type="button" data-on="false"
                title="Toggle" aria-label="${_esc(this.def.friendly_name)} - Toggle"
                hidden>
                <div class="hrv-generic-knob"></div>
              </button>
            ` : ""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#stateEl = this.root.querySelector(".hrv-generic-state");
      this.#toggle  = this.root.querySelector(".hrv-generic-toggle");

      if (this.#toggle && isWritable) {
        this._attachGestureHandlers(this.#toggle, {
          onTap: () => {
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("toggle", {});
          },
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, _attributes) {
      const isOnOff = state === "on" || state === "off";
      this.#isOn = state === "on";

      if (this.#stateEl) {
        this.#stateEl.textContent = _capitalize(state);
      }

      if (this.#toggle) {
        if (isOnOff && !this.#hasToggle) {
          this.#toggle.removeAttribute("hidden");
          this.#hasToggle = true;
        }
        if (this.#hasToggle) {
          this.#toggle.setAttribute("data-on", String(this.#isOn));
          this.#toggle.title = this.#isOn ? "On - click to turn off" : "Off - click to turn on";
        }
      }

      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    predictState(action, _data) {
      if (action !== "toggle") return null;
      return { state: this.#isOn ? "off" : "on", attributes: {} };
    }
  }

  // ---------------------------------------------------------------------------
  // Register all example renderers into the pack-scoped registry
  // ---------------------------------------------------------------------------

  HArvest._packs = HArvest._packs || {};
  const _packKey = window.__HARVEST_PACK_ID__ || "minimus";
  HArvest._packs[_packKey] = {
    "light":          DialLightCard,
    "fan":            FanCard,
    "climate":        ClimateCard,
    "harvest_action": HarvestActionCard,
    "binary_sensor":  BinarySensorCard,
    "cover":          CoverCard,
    "input_boolean":  SwitchCard,
    "input_number":   InputNumberCard,
    "input_select":   InputSelectCard,
    "media_player":   MediaPlayerCard,
    "remote":         RemoteCard,
    "sensor":         SensorCard,
    "switch":         SwitchCard,
    "timer":          TimerCard,
    "generic":        GenericCard,
  };
})();
