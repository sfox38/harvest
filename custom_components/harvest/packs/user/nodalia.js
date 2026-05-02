/**
 * nodalia-pack.js - HArvest Nodalia renderer pack.
 *
 * Inspired by the Nodalia Cards project by Daniel Miguel Tejedor.
 * Bold saturated color gradients, concentric circle depth, and
 * entity-driven color palettes.
 *
 * Loaded at runtime via script injection; references window.HArvest globals.
 */
(function () {
  "use strict";

  const HArvest = window.HArvest;
  if (!HArvest || !HArvest.renderers || !HArvest.renderers.BaseCard) {
    console.warn("[HArvest Nodalia] HArvest not found - pack not loaded.");
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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function _clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function _triggerBounce(el) {
    if (!el) return;
    el.classList.remove("is-pressing");
    void el.getBoundingClientRect();
    el.classList.add("is-pressing");
    el.addEventListener("animationend", () => {
      el.classList.remove("is-pressing");
    }, { once: true });
  }

  function _setControlsCollapsed(root, collapsed) {
    const shell = root.querySelector(".ndl-controls-shell");
    if (shell) shell.setAttribute("data-collapsed", String(collapsed));
  }

  // ---------------------------------------------------------------------------
  // Domain color palettes - each domain gets its own color world
  // ---------------------------------------------------------------------------

  const _DOMAIN_COLORS = {
    light:         { from: "#ffd166", to: "#f4b55f", accent: "#e6a040" },
    switch:        { from: "#71c0ff", to: "#4dabf7", accent: "#3b9ae8" },
    input_boolean: { from: "#71c0ff", to: "#4dabf7", accent: "#3b9ae8" },
    fan:           { from: "#7dd3c0", to: "#38d9a9", accent: "#20c997" },
    climate:       { from: "#f5c77e", to: "#f59f42", accent: "#e8872e" },
    sensor:        { from: "#a5d8ff", to: "#71c0ff", accent: "#4dabf7" },
    binary_sensor: { from: "#b2f2bb", to: "#69db7c", accent: "#51cf66" },
    cover:         { from: "#d0bfff", to: "#b197fc", accent: "#9775fa" },
    media_player:  { from: "#ffd8a8", to: "#ffc078", accent: "#ffa94d" },
    input_number:  { from: "#c5f6fa", to: "#99e9f2", accent: "#66d9e8" },
    input_select:  { from: "#d3f9d8", to: "#b2f2bb", accent: "#8ce99a" },
    timer:         { from: "#e5dbff", to: "#d0bfff", accent: "#b197fc" },
    remote:        { from: "#dee2e6", to: "#ced4da", accent: "#adb5bd" },
    harvest_action:{ from: "#d0bfff", to: "#b197fc", accent: "#9775fa" },
  };

  const _DEFAULT_COLORS = { from: "#d0ebff", to: "#a5d8ff", accent: "#74c0fc" };

  function _colorsFor(domain) {
    return _DOMAIN_COLORS[domain] ?? _DEFAULT_COLORS;
  }

  // Accent color derived from light entity state (rgb_color, hs_color, color_temp).
  function _lightAccent(state, attrs) {
    if (state !== "on") return null;
    if (attrs.rgb_color) {
      const [r, g, b] = attrs.rgb_color;
      return `rgb(${r}, ${g}, ${b})`;
    }
    if (attrs.hs_color) {
      return `hsl(${attrs.hs_color[0]}, ${Math.max(attrs.hs_color[1], 50)}%, 55%)`;
    }
    const kelvin = attrs.color_temp_kelvin ?? (attrs.color_temp ? Math.round(1000000 / attrs.color_temp) : null);
    if (kelvin) {
      if (kelvin >= 5200) return "#8fd3ff";
      if (kelvin <= 3000) return "#f4b55f";
      return "#ffd166";
    }
    return "#ffd166";
  }

  // HVAC-specific palettes for climate card.
  const _HVAC_PALETTE = {
    heat:      { from: "#f5c77e", to: "#f59f42", accent: "#e8872e" },
    cool:      { from: "#a5d8ff", to: "#71c0ff", accent: "#4dabf7" },
    heat_cool: { from: "#e5dbff", to: "#d0bfff", accent: "#b197fc" },
    auto:      { from: "#e5dbff", to: "#d0bfff", accent: "#b197fc" },
    dry:       { from: "#ffd8a8", to: "#ffc078", accent: "#ffa94d" },
    fan_only:  { from: "#c5f6fa", to: "#99e9f2", accent: "#66d9e8" },
    off:       { from: "#e9ecef", to: "#dee2e6", accent: "#adb5bd" },
  };

  const _HVAC_ICONS = {
    heat: "mdi:fire", cool: "mdi:snowflake", heat_cool: "mdi:thermostat-auto",
    auto: "mdi:thermostat-auto", dry: "mdi:water-percent", fan_only: "mdi:fan",
    off: "mdi:power",
  };

  // ---------------------------------------------------------------------------
  // Shared Nodalia CSS
  // ---------------------------------------------------------------------------

  const NODALIA_BASE = /* css */`
    [part=card] {
      border-radius: 28px !important;
      position: relative;
      overflow: hidden;
      padding: 14px !important;
      transition: background 0.6s ease, box-shadow 0.6s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08),
                  inset 0 1px 0 rgba(255,255,255,0.5) !important;
    }

    [part=card]::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      z-index: 0;
      opacity: 0.6;
    }

    [part=card] > * { position: relative; z-index: 1; }

    [part=card-header] {
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      margin-bottom: 0;
    }

    [part=card-icon] {
      width: 58px;
      height: 58px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.35) 100%);
      border: 1px solid rgba(255,255,255,0.3);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.05),
                  inset 0 2px 4px rgba(255,255,255,0.5);
      cursor: pointer;
    }
    [part=card-icon] svg {
      width: 28px;
      height: 28px;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.8;
    }

    [part=card-name] {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--ndl-fg, #1a1a2e);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ndl-chip {
      display: inline-flex;
      align-items: center;
      height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.35);
      border: 1px solid rgba(255,255,255,0.4);
      backdrop-filter: blur(4px);
      font-size: 11px;
      font-weight: 700;
      color: var(--ndl-fg, #1a1a2e);
      white-space: nowrap;
    }

    /* Circular icon buttons used across cards */
    .ndl-circle-btn {
      width: 40px;
      height: 40px;
      padding: 0;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 50%;
      background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.35) 100%);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    }
    .ndl-circle-btn:hover {
      background: linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.5) 100%);
      box-shadow: 0 3px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06);
    }
    .ndl-circle-btn.is-pressing {
      animation: ndl-btn-bounce 0.35s cubic-bezier(0.2, 0.9, 0.24, 1) forwards;
    }
    .ndl-circle-btn > [part] {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ndl-circle-btn svg {
      width: 20px;
      height: 20px;
      color: var(--ndl-fg, #1a1a2e);
    }
    .ndl-circle-btn[data-active=true] {
      background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
      border-color: rgba(0,0,0,0.14);
      box-shadow: 0 3px 10px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
    }
    .ndl-circle-btn.ndl-large {
      width: 50px;
      height: 50px;
    }
    .ndl-circle-btn.ndl-large svg {
      width: 24px;
      height: 24px;
    }

    @keyframes ndl-fade-up {
      0%   { opacity: 0; transform: translate3d(0, 14px, 0); }
      100% { opacity: 1; transform: translate3d(0, 0, 0); }
    }

    @keyframes ndl-btn-bounce {
      0%   { transform: scale(1); }
      40%  { transform: scale(0.85); }
      70%  { transform: scale(1.06); }
      100% { transform: scale(1); }
    }

    @keyframes ndl-power-up {
      0%   { opacity: 0.6; transform: scale(0.97); }
      50%  { opacity: 1; transform: scale(1.02); }
      100% { opacity: 1; transform: scale(1); }
    }

    @keyframes ndl-power-down {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0.85; transform: scale(0.98); }
    }

    @keyframes ndl-glow-in {
      0%   { box-shadow: 0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 0 transparent; }
      100% { box-shadow: 0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5), 0 0 20px 4px var(--ndl-glow, rgba(255,209,102,0.3)); }
    }

    .ndl-controls-shell {
      overflow: hidden;
      transition: max-height 0.45s cubic-bezier(0.22, 0.84, 0.26, 1),
                  margin-top 0.45s cubic-bezier(0.22, 0.84, 0.26, 1),
                  opacity 0.35s ease;
    }
    .ndl-controls-shell[data-collapsed="true"] {
      max-height: 0 !important;
      margin-top: 0 !important;
      opacity: 0;
      pointer-events: none;
    }
    .ndl-controls-shell[data-collapsed="false"] {
      max-height: 400px;
      margin-top: 12px;
      opacity: 1;
    }

    [part=card].ndl-powering-up {
      animation: ndl-power-up 0.4s cubic-bezier(0.22, 0.84, 0.26, 1) forwards;
    }
    [part=card].ndl-powering-down {
      animation: ndl-power-down 0.3s ease forwards;
    }

    /* Shared thick slider */
    .ndl-slider-wrap {
      width: 100%;
      height: 56px;
      border-radius: 28px;
      background: rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }
    .ndl-slider-track {
      position: absolute;
      top: 50%;
      left: 14px;
      right: 14px;
      height: 16px;
      transform: translateY(-50%);
      border-radius: 8px;
      overflow: hidden;
      pointer-events: none;
    }
    .ndl-slider-track-fill {
      height: 100%;
      border-radius: 8px;
      transition: width 0.15s ease;
    }
    .ndl-slider-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      margin: 0;
    }
    .ndl-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }
    .ndl-slider-input::-webkit-slider-thumb:active {
      cursor: grabbing;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3), 0 0 0 3px rgba(255,255,255,0.9);
    }
    .ndl-slider-input::-moz-range-thumb {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }

    /* History graph Nodalia overrides */
    [part=history-zone] {
      background: rgba(255,255,255,0.15);
      border-radius: 14px;
      padding: 8px;
      margin-top: 8px;
    }
    [part=history-zone] svg line[stroke] {
      stroke: rgba(0,0,0,0.06);
      stroke-dasharray: 4 3;
    }
    [part=history-zone] svg text {
      font-size: 10px;
      opacity: 0.5;
    }
    [part=history-zone] svg polyline,
    [part=history-zone] svg path.hrv-graph-line {
      stroke-width: 2.5;
    }
    [part=history-zone] svg .hrv-graph-fill {
      opacity: 0.35;
    }
    [part=history-zone] svg circle.hrv-graph-dot {
      r: 3;
      fill: white;
      stroke-width: 2;
    }
  `;

  // Companion dots
  const COMPANION_DOT_STYLES = /* css */`
    [part=companion-zone] {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      padding: 10px 0 0;
      border-top: none;
      margin-top: 8px;
    }
    [part=companion-zone]:empty { display: none; }
    [part=companion] {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255,255,255,0.5);
      backdrop-filter: blur(6px);
      border: none;
      padding: 0;
      cursor: default;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      transition: box-shadow 0.2s ease, background 0.2s ease;
    }
    [part=companion][data-on=true] {
      background: rgba(255,255,255,0.8);
      box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.1);
    }
    [part=companion][data-interactive=true] { cursor: pointer; }
    [part=companion][data-interactive=true]:hover { background: rgba(255,255,255,0.7); }
    [part=companion-icon]  { display: none; }
    [part=companion-state] { display: none; }
  `;

  function _applyCompanionTooltips(root) {
    root.querySelectorAll("[part=companion]").forEach((el) => {
      el.title = el.getAttribute("aria-label") ?? "";
    });
  }

  // ---------------------------------------------------------------------------
  // Card background - the bold saturated gradient that defines Nodalia
  // ---------------------------------------------------------------------------

  function _applyCardGradient(card, colors, isActive) {
    if (!card) return;
    if (!isActive) {
      card.style.background = `linear-gradient(145deg, var(--ndl-inactive-from, #f0f1f3) 0%, var(--ndl-inactive-to, #e4e5e9) 100%)`;
      card.style.removeProperty("--ndl-fg");
      return;
    }
    card.style.background = `linear-gradient(145deg, ${colors.from} 0%, ${colors.to} 60%, `
      + `color-mix(in srgb, ${colors.to} 85%, white) 100%)`;
    card.style.removeProperty("--ndl-fg");
  }

  function _applyCardGradientCustom(card, fromColor, toColor) {
    if (!card) return;
    card.style.background = `linear-gradient(145deg, ${fromColor} 0%, ${toColor} 60%, `
      + `color-mix(in srgb, ${toColor} 85%, white) 100%)`;
    card.style.removeProperty("--ndl-fg");
  }

  // Radial glow overlay via ::before
  function _glowOverlayCSS() {
    return /* css */`
      [part=card]::before {
        background:
          radial-gradient(ellipse at 15% 20%,
            rgba(255,255,255,0.45) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 80%,
            rgba(255,255,255,0.15) 0%, transparent 50%);
      }
    `;
  }

  // ---------------------------------------------------------------------------
  // Concentric circle gauge (sensor, climate)
  // ---------------------------------------------------------------------------

  function _concentricGaugeSVG(opts) {
    const cx = 100, cy = 105;
    const outerR = 88, midR = 72, innerR = 56;
    const arcR = 72;
    const startAngle = 225, sweepAngle = 270;

    const toRad = (d) => d * Math.PI / 180;
    const ptAt = (a, r) => ({
      x: cx + r * Math.cos(toRad(a)),
      y: cy - r * Math.sin(toRad(a)),
    });

    const arcStart = ptAt(startAngle, arcR);
    const arcEnd = ptAt(startAngle - sweepAngle, arcR);
    const arcD = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;
    const arcLen = 2 * Math.PI * arcR * (sweepAngle / 360);

    return {
      arcD, arcLen, arcR, cx, cy, startAngle, sweepAngle,
      svg: /* html */`
        <svg viewBox="0 0 200 200" class="ndl-gauge-svg">
          <!-- Track arc -->
          <path class="ndl-gauge-track" d="${arcD}" fill="none"
            stroke="rgba(0,0,0,0.08)" stroke-width="14" stroke-linecap="round" />
          <!-- Fill arc -->
          <path class="ndl-gauge-fill" d="${arcD}" fill="none"
            stroke="${opts.fillColor ?? "rgba(0,0,0,0.25)"}"
            stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${arcLen}" stroke-dashoffset="${arcLen}" />
          <!-- Thumb -->
          <circle class="ndl-gauge-thumb" r="8"
            cx="${arcStart.x}" cy="${arcStart.y}"
            fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="1"
            filter="drop-shadow(0 1px 3px rgba(0,0,0,0.2))" />
        </svg>
      `,
    };
  }

  // Update gauge fill + thumb position from a 0-1 fraction.
  function _updateGauge(root, frac, color) {
    const arcR = 72, cx = 100, cy = 110;
    const startAngle = 225, sweepAngle = 270;
    const arcLen = 2 * Math.PI * arcR * (sweepAngle / 360);
    const toRad = (d) => d * Math.PI / 180;

    frac = _clamp(frac, 0, 1);
    const offset = arcLen * (1 - frac);
    const angle = startAngle - frac * sweepAngle;
    const px = cx + arcR * Math.cos(toRad(angle));
    const py = cy - arcR * Math.sin(toRad(angle));

    const fill = root.querySelector(".ndl-gauge-fill");
    const thumb = root.querySelector(".ndl-gauge-thumb");
    if (fill) {
      fill.setAttribute("stroke-dashoffset", String(offset));
      if (color) fill.setAttribute("stroke", color);
    }
    if (thumb) {
      thumb.setAttribute("cx", String(px));
      thumb.setAttribute("cy", String(py));
    }
  }

  // Pointer-to-fraction for dial drag.
  function _pointerToFrac(e, dialEl) {
    const rect = dialEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = -(e.clientY - cy);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    let swept = 225 - angle;
    if (swept < 0) swept += 360;
    if (swept > 290) return null;
    return _clamp(swept / 270, 0, 1);
  }

  // ---------------------------------------------------------------------------
  // LightCard
  // ---------------------------------------------------------------------------

  const LIGHT_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    [part=card-body] {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ndl-light-slider-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ndl-light-slider-wrap {
      flex: 1;
      height: 48px;
      border-radius: 24px;
      background: rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }
    .ndl-light-slider-fill {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      border-radius: 24px;
      background: linear-gradient(90deg, rgba(255,209,102,0.4) 0%, rgba(255,209,102,0.8) 100%);
      pointer-events: none;
      transition: width 0.15s ease;
    }
    .ndl-light-slider-inner-track {
      position: absolute;
      top: 50%;
      left: 12px;
      right: 12px;
      height: 6px;
      transform: translateY(-50%);
      border-radius: 3px;
      pointer-events: none;
      transition: background 0.2s ease;
    }
    .ndl-light-slider-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      margin: 0;
    }
    .ndl-light-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }
    .ndl-light-slider-input::-webkit-slider-thumb:active { cursor: grabbing; }
    .ndl-light-slider-input::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }

    /* Mode switch animation */
    @keyframes ndl-mode-out {
      0%   { opacity: 1; transform: scaleX(1); }
      100% { opacity: 0; transform: scaleX(0.18); }
    }
    @keyframes ndl-mode-in {
      0%   { opacity: 0; transform: scaleX(0.18); }
      100% { opacity: 1; transform: scaleX(1); }
    }
    .ndl-light-slider-wrap.ndl-mode-out {
      animation: ndl-mode-out 0.18s cubic-bezier(0.38, 0, 0.24, 1) both;
      transform-origin: right center;
      pointer-events: none;
    }
    .ndl-light-slider-wrap.ndl-mode-in {
      animation: ndl-mode-in 0.22s cubic-bezier(0.22, 0.84, 0.26, 1) both;
      transform-origin: right center;
    }

    /* Two mode-switch buttons stacked on the right */
    .ndl-light-mode-btns {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    .ndl-light-mode-btn {
      width: 36px;
      height: 36px;
    }
    .ndl-light-mode-btn svg {
      width: 18px;
      height: 18px;
    }
    .ndl-light-mode-btn[hidden] { display: none; }

    .ndl-effect-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.25) 100%);
      font-size: 10px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease;
      backdrop-filter: blur(6px);
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .ndl-effect-pill:hover {
      background: linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.4) 100%);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .ndl-effect-pill svg { opacity: 0.6; }

    .ndl-light-ro-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.6;
      text-align: center;
      padding: 4px 0;
    }
  `;

  const LIGHT_MODES = ["brightness", "temp", "color"];
  const _LIGHT_MODE_ICONS = { brightness: "mdi:brightness-5", temp: "mdi:thermometer", color: "mdi:palette" };

  class LightCard extends BaseCard {
    #card = null;
    #slider = null;
    #sliderWrap = null;
    #fill = null;
    #innerTrack = null;
    #chipEl = null;
    #roLabel = null;
    #modeButtons = [];

    #brightness = 0;
    #colorTempK = 4000;
    #hue = 0;
    #isOn = false;
    #mode = 0;
    #minCt = 2000;
    #maxCt = 6500;
    #lastAttrs = {};
    #effectPill = null;
    #effectList = [];
    #currentEffect = null;
    #wasOn = null;
    #hideBodyTimer = null;
    #sendValue;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendValue = _debounce(this.#doSendValue.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const features = this.def.supported_features ?? [];
      const hints = this.config.displayHints ?? {};
      const hasBrightness = hints.show_brightness !== false && features.includes("brightness");
      const hasColorTemp = hints.show_color_temp !== false && features.includes("color_temp");
      const hasColor = hints.show_rgb !== false && features.includes("rgb_color");
      const hasEffect = features.includes("effect");
      const showSlider = isWritable && (hasBrightness || hasColorTemp || hasColor);
      const modeCount = [hasBrightness, hasColorTemp, hasColor].filter(Boolean).length;
      this.#minCt = this.def.feature_config?.min_color_temp_kelvin ?? 2000;
      this.#maxCt = this.def.feature_config?.max_color_temp_kelvin ?? 6500;

      // Ensure current mode is supported.
      const modeAvail = [hasBrightness, hasColorTemp, hasColor];
      if (!modeAvail[this.#mode]) {
        this.#mode = modeAvail.findIndex(Boolean);
        if (this.#mode === -1) this.#mode = 0;
      }

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${LIGHT_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-light-chip">-</span>
          </div>
          <div part="card-body">
            ${showSlider ? /* html */`
              <div class="ndl-controls-shell" data-collapsed="true">
                <div class="ndl-light-slider-row">
                  <div class="ndl-light-slider-wrap">
                    <div class="ndl-light-slider-fill" style="width:0%"></div>
                    <div class="ndl-light-slider-inner-track"></div>
                    <input type="range" class="ndl-light-slider-input" min="0" max="100"
                      step="1" value="0"
                      aria-label="${_esc(this.def.friendly_name)} level">
                  </div>
                  ${modeCount > 1 ? /* html */`
                    <div class="ndl-light-mode-btns">
                      ${hasBrightness ? /* html */`<button class="ndl-circle-btn ndl-light-mode-btn" data-mode="brightness" type="button" aria-label="Brightness"><span part="light-mode-brightness"></span></button>` : ""}
                      ${hasColorTemp ? /* html */`<button class="ndl-circle-btn ndl-light-mode-btn" data-mode="temp" type="button" aria-label="Color temperature"><span part="light-mode-temp"></span></button>` : ""}
                      ${hasColor ? /* html */`<button class="ndl-circle-btn ndl-light-mode-btn" data-mode="color" type="button" aria-label="Color"><span part="light-mode-color"></span></button>` : ""}
                    </div>
                  ` : ""}
                </div>
                ${hasEffect && isWritable ? /* html */`
                  <button class="ndl-effect-pill" type="button" title="Cycle effect">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7.5 5.6L5 7V4l2.5 1.6zM19 4v3l-2.5-1.4L19 4zm-7 1a8 8 0 108 8h-2a6 6 0 11-6-6V5z"/></svg>
                    <span class="ndl-effect-label">-</span>
                  </button>
                ` : ""}
              </div>
            ` : !isWritable ? /* html */`
              <div class="ndl-light-ro-label">-</div>
            ` : ""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#card = this.root.querySelector("[part=card]");
      this.#slider = this.root.querySelector(".ndl-light-slider-input");
      this.#sliderWrap = this.root.querySelector(".ndl-light-slider-wrap");
      this.#fill = this.root.querySelector(".ndl-light-slider-fill");
      this.#innerTrack = this.root.querySelector(".ndl-light-slider-inner-track");
      this.#chipEl = this.root.querySelector(".ndl-light-chip");
      this.#roLabel = this.root.querySelector(".ndl-light-ro-label");
      this.#modeButtons = [...this.root.querySelectorAll(".ndl-light-mode-btn")];

      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:lightbulb"), "card-icon");

      // Render icons on mode buttons.
      for (const btn of this.#modeButtons) {
        this.renderIcon(_LIGHT_MODE_ICONS[btn.dataset.mode] ?? "mdi:help-circle", `light-mode-${btn.dataset.mode}`);
      }

      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl && isWritable) {
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("toggle", {});
          },
        });
      }

      for (const btn of this.#modeButtons) {
        btn.addEventListener("click", () => {
          _triggerBounce(btn);
          const newModeName = btn.dataset.mode;
          const newModeIdx = LIGHT_MODES.indexOf(newModeName);
          if (newModeIdx === this.#mode) return;

          const wrap = this.#sliderWrap;
          if (wrap) {
            wrap.classList.add("ndl-mode-out");
            setTimeout(() => {
              wrap.classList.remove("ndl-mode-out");
              this.#mode = newModeIdx;
              this.#updateSliderDisplay();
              this.#updateChipLabel();
              wrap.classList.add("ndl-mode-in");
              setTimeout(() => wrap.classList.remove("ndl-mode-in"), 250);
            }, 190);
          } else {
            this.#mode = newModeIdx;
            this.#updateSliderDisplay();
            this.#updateChipLabel();
          }
        });
      }

      this.#effectPill = this.root.querySelector(".ndl-effect-pill");
      if (this.#effectPill) {
        this.#effectPill.addEventListener("click", () => {
          _triggerBounce(this.#effectPill);
          if (!this.#effectList.length) return;
          const idx = this.#currentEffect ? this.#effectList.indexOf(this.#currentEffect) : -1;
          const next = this.#effectList[(idx + 1) % this.#effectList.length];
          this.config.card?.sendCommand("turn_on", { effect: next });
        });
      }

      if (this.#slider) {
        this.#slider.addEventListener("input", () => {
          const val = parseInt(this.#slider.value, 10);
          const mode = LIGHT_MODES[this.#mode] ?? "brightness";
          if (mode === "brightness") {
            this.#brightness = val;
            if (this.#fill) this.#fill.style.width = `${val}%`;
          } else if (mode === "temp") {
            this.#colorTempK = Math.round(this.#minCt + (val / 100) * (this.#maxCt - this.#minCt));
          } else {
            this.#hue = Math.round(val * 3.6);
          }
          this.#updateChipLabel();
          this.#sendValue(mode);
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, attributes) {
      this.#isOn = state === "on";
      this.#lastAttrs = attributes;

      this.#effectList = attributes.effect_list ?? [];
      this.#currentEffect = attributes.effect ?? null;
      if (this.#effectPill) {
        const label = this.#effectPill.querySelector(".ndl-effect-label");
        if (label) label.textContent = this.#currentEffect ?? "-";
        this.#effectPill.style.display = this.#effectList.length ? "" : "none";
      }

      if (this.#wasOn !== null && this.#wasOn !== this.#isOn && this.#card) {
        this.#card.classList.remove("ndl-powering-up", "ndl-powering-down");
        void this.#card.getBoundingClientRect();
        this.#card.classList.add(this.#isOn ? "ndl-powering-up" : "ndl-powering-down");
      }
      this.#wasOn = this.#isOn;

      _setControlsCollapsed(this.root, !this.#isOn);

      // Hide card-body after collapse animation so no residual space appears below icon when off.
      clearTimeout(this.#hideBodyTimer);
      const bodyEl = this.root.querySelector("[part=card-body]");
      if (this.#isOn) {
        if (bodyEl) bodyEl.style.display = "";
      } else {
        this.#hideBodyTimer = setTimeout(() => {
          const b = this.root.querySelector("[part=card-body]");
          if (b && !this.#isOn) b.style.display = "none";
        }, 480);
      }

      const accent = _lightAccent(state, attributes);
      const colors = _colorsFor("light");

      if (this.#isOn && accent) {
        _applyCardGradientCustom(this.#card,
          `color-mix(in srgb, ${accent} 45%, #fff8e1)`,
          `color-mix(in srgb, ${accent} 60%, #fff3e0)`,
        );
        this.#card?.style.setProperty("--ndl-glow", `color-mix(in srgb, ${accent} 30%, transparent)`);
      } else if (this.#isOn) {
        _applyCardGradient(this.#card, colors, true);
      } else {
        _applyCardGradient(this.#card, colors, false);
      }

      this.#brightness = attributes.brightness != null
        ? Math.round((attributes.brightness / 255) * 100) : 0;
      this.#colorTempK = attributes.color_temp_kelvin
        ?? (attributes.color_temp ? Math.round(1000000 / attributes.color_temp) : 4000);
      this.#hue = attributes.hs_color?.[0] ?? 42;
      this.#updateSliderDisplay();
      this.#updateChipLabel();

      const iconName = this.#isOn
        ? this.resolveIcon(this.def.icon, "mdi:lightbulb")
        : this.resolveIcon(this.def.icon, "mdi:lightbulb-off");
      this.renderIcon(iconName, "card-icon");

      if (this.#roLabel) {
        if (this.#isOn && attributes.brightness != null) {
          this.#roLabel.textContent = `${this.#brightness}%`;
        } else {
          this.#roLabel.textContent = _capitalize(state);
        }
      }

      this.announceState(`${this.def.friendly_name}, ${state}${this.#isOn ? `, ${this.#brightness}%` : ""}`);
    }

    predictState(action, _data) {
      if (action !== "toggle") return null;
      return { state: this.#isOn ? "off" : "on", attributes: this.#lastAttrs };
    }

    #updateChipLabel() {
      if (!this.#chipEl) return;
      const mode = LIGHT_MODES[this.#mode] ?? "brightness";
      if (!this.#isOn) { this.#chipEl.textContent = "Off"; return; }
      if (mode === "brightness") this.#chipEl.textContent = `${this.#brightness}%`;
      else if (mode === "temp") this.#chipEl.textContent = `${this.#colorTempK}K`;
      else this.#chipEl.textContent = `${this.#hue}°`;
    }

    #updateSliderDisplay() {
      const mode = LIGHT_MODES[this.#mode] ?? "brightness";
      const wrapEl = this.#sliderWrap;
      const fillEl = this.#fill;
      const trackEl = this.#innerTrack;
      let sliderVal = 0;

      if (mode === "brightness") {
        sliderVal = this.#brightness;
        if (wrapEl) wrapEl.style.background = "rgba(0,0,0,0.08)";
        if (fillEl) fillEl.style.display = "none";
        if (trackEl) trackEl.style.background = "linear-gradient(90deg, rgba(0,0,0,0.15) 0%, rgba(255,209,102,0.6) 50%, rgba(255,209,102,1) 100%)";
      } else if (mode === "temp") {
        sliderVal = Math.round(((this.#colorTempK - this.#minCt) / (this.#maxCt - this.#minCt)) * 100);
        if (wrapEl) wrapEl.style.background = "rgba(0,0,0,0.08)";
        if (fillEl) fillEl.style.display = "none";
        if (trackEl) trackEl.style.background = "linear-gradient(90deg, #f4b55f 0%, #ffd166 32%, #fff1c1 56%, #8fd3ff 100%)";
      } else {
        sliderVal = Math.round(this.#hue / 3.6);
        if (wrapEl) wrapEl.style.background = "rgba(0,0,0,0.08)";
        if (fillEl) fillEl.style.display = "none";
        if (trackEl) trackEl.style.background = "linear-gradient(90deg, #ff4d6d 0%, #ff9f1c 17%, #ffe66d 33%, #4cd964 50%, #4dabf7 67%, #845ef7 83%, #ff4d6d 100%)";
      }

      if (this.#slider && !this.isFocused(this.#slider)) {
        this.#slider.value = String(sliderVal);
      }

      // Show buttons for the two non-active modes only.
      const activeName = LIGHT_MODES[this.#mode];
      for (const btn of this.#modeButtons) {
        btn.hidden = btn.dataset.mode === activeName;
      }
    }

    #doSendValue(mode) {
      if (mode === "brightness") {
        if (this.#brightness <= 0) this.config.card?.sendCommand("turn_off", {});
        else this.config.card?.sendCommand("turn_on", { brightness: Math.round(this.#brightness * 2.55) });
      } else if (mode === "temp") {
        this.config.card?.sendCommand("turn_on", { color_temp_kelvin: this.#colorTempK });
      } else {
        this.config.card?.sendCommand("turn_on", { hs_color: [this.#hue, 100] });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SwitchCard
  // ---------------------------------------------------------------------------

  const SWITCH_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}
  `;

  class SwitchCard extends BaseCard {
    #chipEl = null;
    #card = null;
    #isOn = false;
    #wasOn = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${SWITCH_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-switch-chip">-</span>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-switch-chip");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:toggle-switch-off-outline"), "card-icon");
      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl && isWritable) {
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
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
      if (this.#wasOn !== null && this.#wasOn !== this.#isOn && this.#card) {
        this.#card.classList.remove("ndl-powering-up", "ndl-powering-down");
        void this.#card.getBoundingClientRect();
        this.#card.classList.add(this.#isOn ? "ndl-powering-up" : "ndl-powering-down");
      }
      this.#wasOn = this.#isOn;
      const colors = _colorsFor(this.def.domain ?? "switch");
      _applyCardGradient(this.#card, colors, this.#isOn);
      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);
      const iconName = this.#isOn
        ? this.resolveIcon(this.def.icon, "mdi:toggle-switch")
        : this.resolveIcon(this.def.icon, "mdi:toggle-switch-off-outline");
      this.renderIcon(iconName, "card-icon");
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    predictState(action, _data) {
      if (action !== "toggle") return null;
      return { state: this.#isOn ? "off" : "on", attributes: {} };
    }
  }

  // ---------------------------------------------------------------------------
  // BinarySensorCard
  // ---------------------------------------------------------------------------

  const BSENSOR_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}
  `;

  const _BS_ICON_MAP = {
    door:     { on: "mdi:door-open",  off: "mdi:door-closed" },
    window:   { on: "mdi:window-open", off: "mdi:window-closed" },
    motion:   { on: "mdi:motion-sensor", off: "mdi:motion-sensor-off" },
    moisture: { on: "mdi:water",       off: "mdi:water-off" },
    smoke:    { on: "mdi:smoke-detector-variant-alert", off: "mdi:smoke-detector-variant" },
    connectivity: { on: "mdi:wifi", off: "mdi:wifi-off" },
    plug:     { on: "mdi:flash",       off: "mdi:flash" },
    battery:  { on: "mdi:battery-alert", off: "mdi:battery" },
  };

  class BinarySensorCard extends BaseCard {
    #card = null;
    #chipEl = null;
    #isOn = false;

    render() {
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${BSENSOR_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip">-</span>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-chip");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:radiobox-blank"), "card-icon");
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, attributes) {
      this.#isOn = state === "on";
      const colors = _colorsFor("binary_sensor");
      _applyCardGradient(this.#card, colors, this.#isOn);
      const dc = attributes.device_class ?? "";
      const iconMap = _BS_ICON_MAP[dc];
      const iconName = iconMap
        ? (this.#isOn ? iconMap.on : iconMap.off)
        : (this.#isOn ? this.resolveIcon(this.def.icon, "mdi:radiobox-marked") : this.resolveIcon(this.def.icon, "mdi:radiobox-blank"));
      this.renderIcon(this.resolveIcon(iconName, "mdi:radiobox-blank"), "card-icon");
      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SensorCard (concentric circle gauge)
  // ---------------------------------------------------------------------------

  const SENSOR_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    .ndl-sensor-bar {
      height: 6px;
      border-radius: 3px;
      background: rgba(0,0,0,0.08);
      overflow: hidden;
      margin-top: 8px;
    }
    .ndl-sensor-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s ease, background 0.5s ease;
    }
  `;

  function _sensorColor(value, unit) {
    if (unit === "°C" || unit === "°F") {
      const c = unit === "°F" ? (value - 32) * 5 / 9 : value;
      if (c < 10) return { from: "#a5d8ff", to: "#71c0ff", fill: "#4dabf7" };
      if (c < 20) return { from: "#c5f6fa", to: "#99e9f2", fill: "#66d9e8" };
      if (c < 30) return { from: "#ffd8a8", to: "#ffc078", fill: "#ffa94d" };
      return { from: "#ffc9c9", to: "#ff8787", fill: "#ff6b6b" };
    }
    if (unit === "%" || unit === "lx") {
      if (value < 20) return { from: "#ffc9c9", to: "#ff8787", fill: "#ff6b6b" };
      if (value < 50) return { from: "#ffd8a8", to: "#ffc078", fill: "#ffa94d" };
      return { from: "#b2f2bb", to: "#69db7c", fill: "#51cf66" };
    }
    if (unit === "W" || unit === "kWh") {
      return { from: "#d3f9d8", to: "#8ce99a", fill: "#51cf66" };
    }
    return { from: "#a5d8ff", to: "#71c0ff", fill: "#4dabf7" };
  }

  class SensorCard extends BaseCard {
    #card = null;
    #chipEl = null;
    #barFill = null;
    #min = 0;
    #max = 100;

    render() {
      const unit = this.def.unit_of_measurement ?? "";
      if (unit === "°C" || unit === "°F") {
        this.#min = unit === "°F" ? 32 : 0;
        this.#max = unit === "°F" ? 120 : 50;
      } else if (unit === "W") {
        this.#min = 0; this.#max = 3000;
      } else if (unit === "kWh") {
        this.#min = 0; this.#max = 500;
      } else {
        this.#min = 0; this.#max = 100;
      }

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${SENSOR_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-sensor-chip">-</span>
          </div>
          <div class="ndl-sensor-bar">
            <div class="ndl-sensor-bar-fill" style="width:0%"></div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-sensor-chip");
      this.#barFill = this.root.querySelector(".ndl-sensor-bar-fill");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:gauge"), "card-icon");
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, attributes) {
      const numVal = parseFloat(state);
      const unit = this.def.unit_of_measurement ?? "";
      const isNumeric = !isNaN(numVal);

      if (this.#chipEl) {
        if (isNumeric) {
          const precision = attributes.suggested_display_precision;
          const display = precision != null
            ? numVal.toFixed(precision)
            : String(Math.round(numVal * 10) / 10);
          this.#chipEl.textContent = unit ? `${display} ${unit}` : display;
        } else {
          this.#chipEl.textContent = state;
        }
      }

      if (isNumeric) {
        const sc = _sensorColor(numVal, unit);
        _applyCardGradientCustom(this.#card, sc.from, sc.to);
        const frac = _clamp((numVal - this.#min) / (this.#max - this.#min), 0, 1);
        if (this.#barFill) {
          this.#barFill.style.width = `${frac * 100}%`;
          this.#barFill.style.background = sc.fill;
        }
      } else {
        _applyCardGradient(this.#card, _colorsFor("sensor"), true);
      }

      this.announceState(`${this.def.friendly_name}, ${isNumeric ? numVal : state} ${unit}`);
    }
  }

  // ---------------------------------------------------------------------------
  // ClimateCard
  // ---------------------------------------------------------------------------

  const CLIMATE_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .ndl-gauge-wrap {
      position: relative;
      width: 100%;
      max-width: 160px;
      aspect-ratio: 1 / 1;
      touch-action: none;
      cursor: grab;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(0,0,0,0.05);
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04), 0 1px 0 rgba(255,255,255,0.4);
    }
    .ndl-gauge-wrap:active { cursor: grabbing; }
    .ndl-gauge-svg { width: 100%; height: 100%; }
    .ndl-gauge-fill { transition: stroke-dashoffset 0.15s ease, stroke 0.3s ease; }
    .ndl-gauge-thumb { transition: cx 0.15s ease, cy 0.15s ease; }

    .ndl-gauge-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      user-select: none;
    }
    .ndl-climate-target {
      font-size: 28px;
      font-weight: 700;
      color: var(--ndl-fg, #1a1a2e);
    }
    .ndl-climate-target sup {
      font-size: 14px;
      font-weight: 500;
      vertical-align: super;
    }
    .ndl-climate-current {
      font-size: 11px;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.6;
      margin-top: 2px;
    }

    .ndl-climate-gauge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
    }

    .ndl-climate-modes {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .ndl-climate-mode-pill {
      padding: 4px 12px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 100%);
      backdrop-filter: blur(6px);
      font-size: 11px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .ndl-climate-mode-pill:hover {
      background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.45) 100%);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .ndl-climate-mode-pill[data-active=true] {
      background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
      border-color: rgba(0,0,0,0.14);
      box-shadow: 0 3px 10px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
    }

    .ndl-climate-secondary-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .ndl-climate-secondary-pill {
      padding: 4px 10px;
      border: 1px solid rgba(0,0,0,0.07);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 100%);
      backdrop-filter: blur(6px);
      font-size: 11px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .ndl-climate-secondary-pill:hover {
      background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.35) 100%);
      box-shadow: 0 2px 5px rgba(0,0,0,0.07);
    }
    .ndl-climate-secondary-pill[data-active=true] {
      background: linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 100%);
      border-color: rgba(0,0,0,0.12);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
    }

    .ndl-climate-ro-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.6;
    }
  `;

  class ClimateCard extends BaseCard {
    #card = null;
    #gaugeWrap = null;
    #targetEl = null;
    #currentEl = null;
    #chipEl = null;
    #modeButtons = [];
    #fanModePills = [];
    #presetModePills = [];

    #targetTemp = 20;
    #currentTemp = null;
    #hvacMode = "off";
    #minTemp = 7;
    #maxTemp = 35;
    #tempStep = 0.5;
    #dragging = false;
    #lastAttrs = {};
    #wasOn = null;
    #sendTemp;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendTemp = _debounce(this.#doSendTemp.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const features = this.def.supported_features ?? [];
      const hints = this.config.displayHints ?? {};
      const hasTargetTemp = features.includes("target_temperature");
      const showDial = isWritable && hasTargetTemp;
      const allHvacModes = this.def.feature_config?.hvac_modes ?? ["off", "heat", "cool", "auto"];
      const hvacModes = hints.show_hvac_modes !== false ? allHvacModes : [];
      const fanModes = hints.show_fan_mode !== false ? (this.def.feature_config?.fan_modes ?? []) : [];
      const presetModes = hints.show_presets !== false ? (this.def.feature_config?.preset_modes ?? []) : [];
      this.#minTemp = this.def.feature_config?.min_temp ?? 7;
      this.#maxTemp = this.def.feature_config?.max_temp ?? 35;
      this.#tempStep = this.def.feature_config?.target_temp_step ?? 0.5;

      const gauge = _concentricGaugeSVG({ fillColor: "#f59f42" });

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${CLIMATE_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-climate-chip">-</span>
          </div>
          <div part="card-body">
            ${showDial ? /* html */`
              <div class="ndl-controls-shell" data-collapsed="true">
                <div class="ndl-climate-gauge-row">
                  <button class="ndl-circle-btn ndl-temp-down" type="button"
                    aria-label="Decrease temperature" title="Decrease">
                    <span part="temp-down-icon"></span>
                  </button>
                  <div class="ndl-gauge-wrap" role="slider"
                    aria-valuemin="${this.#minTemp}" aria-valuemax="${this.#maxTemp}"
                    aria-valuenow="${this.#targetTemp}"
                    aria-label="${_esc(this.def.friendly_name)} temperature"
                    title="Drag to adjust temperature">
                    ${gauge.svg}
                    <div class="ndl-gauge-center">
                      <div class="ndl-climate-target">--<sup>°</sup></div>
                      <div class="ndl-climate-current"></div>
                    </div>
                  </div>
                  <button class="ndl-circle-btn ndl-temp-up" type="button"
                    aria-label="Increase temperature" title="Increase">
                    <span part="temp-up-icon"></span>
                  </button>
                </div>
                ${hvacModes.length > 1 ? /* html */`
                  <div class="ndl-climate-modes">
                    ${hvacModes.map((m) => /* html */`
                      <button class="ndl-climate-mode-pill" data-mode="${_esc(m)}"
                        data-active="false" type="button"
                        aria-label="${_capitalize(m)}">
                        ${_capitalize(m)}
                      </button>
                    `).join("")}
                  </div>
                ` : ""}
                ${fanModes.length ? /* html */`
                  <div class="ndl-climate-secondary-pills">
                    ${fanModes.map((m) => /* html */`
                      <button class="ndl-climate-secondary-pill ndl-climate-fan-pill"
                        data-fan="${_esc(m)}" data-active="false"
                        type="button">${_capitalize(m)}</button>
                    `).join("")}
                  </div>
                ` : ""}
                ${presetModes.length ? /* html */`
                  <div class="ndl-climate-secondary-pills">
                    ${presetModes.map((m) => /* html */`
                      <button class="ndl-climate-secondary-pill ndl-climate-preset-pill"
                        data-preset="${_esc(m)}" data-active="false"
                        type="button">${_capitalize(m)}</button>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            ` : /* html */`
              <div class="ndl-climate-ro-label">-</div>
            `}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#card = this.root.querySelector("[part=card]");
      this.#gaugeWrap = this.root.querySelector(".ndl-gauge-wrap");
      this.#targetEl = this.root.querySelector(".ndl-climate-target");
      this.#currentEl = this.root.querySelector(".ndl-climate-current");
      this.#chipEl = this.root.querySelector(".ndl-climate-chip");

      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:thermostat"), "card-icon");
      this.renderIcon("mdi:minus", "temp-down-icon");
      this.renderIcon("mdi:plus", "temp-up-icon");

      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl && isWritable) {
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
            const nextMode = this.#hvacMode === "off" ? "heat" : "off";
            this.config.card?.sendCommand("set_hvac_mode", { hvac_mode: nextMode });
          },
        });
      }

      const downBtn = this.root.querySelector(".ndl-temp-down");
      const upBtn = this.root.querySelector(".ndl-temp-up");
      if (downBtn) {
        downBtn.addEventListener("click", () => {
          _triggerBounce(downBtn);
          this.#targetTemp = Math.max(this.#minTemp, this.#targetTemp - this.#tempStep);
          this.#updateClimateGauge();
          this.#sendTemp();
        });
      }
      if (upBtn) {
        upBtn.addEventListener("click", () => {
          _triggerBounce(upBtn);
          this.#targetTemp = Math.min(this.#maxTemp, this.#targetTemp + this.#tempStep);
          this.#updateClimateGauge();
          this.#sendTemp();
        });
      }

      this.#modeButtons = [...this.root.querySelectorAll(".ndl-climate-mode-pill")];
      for (const btn of this.#modeButtons) {
        btn.addEventListener("click", () => {
          _triggerBounce(btn);
          this.config.card?.sendCommand("set_hvac_mode", { hvac_mode: btn.dataset.mode });
        });
      }

      this.#fanModePills = [...this.root.querySelectorAll(".ndl-climate-fan-pill")];
      for (const pill of this.#fanModePills) {
        pill.addEventListener("click", () => {
          _triggerBounce(pill);
          this.config.card?.sendCommand("set_fan_mode", { fan_mode: pill.dataset.fan });
        });
      }

      this.#presetModePills = [...this.root.querySelectorAll(".ndl-climate-preset-pill")];
      for (const pill of this.#presetModePills) {
        pill.addEventListener("click", () => {
          _triggerBounce(pill);
          this.config.card?.sendCommand("set_preset_mode", { preset_mode: pill.dataset.preset });
        });
      }

      if (this.#gaugeWrap) this.#initDrag();

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, attributes) {
      this.#hvacMode = state;
      this.#lastAttrs = attributes;
      this.#currentTemp = attributes.current_temperature ?? null;

      const isOff = state === "off";
      if (this.#wasOn !== null && this.#wasOn !== !isOff && this.#card) {
        this.#card.classList.remove("ndl-powering-up", "ndl-powering-down");
        void this.#card.getBoundingClientRect();
        this.#card.classList.add(!isOff ? "ndl-powering-up" : "ndl-powering-down");
      }
      this.#wasOn = !isOff;
      _setControlsCollapsed(this.root, isOff);

      const palette = _HVAC_PALETTE[state] ?? _HVAC_PALETTE.off;
      _applyCardGradientCustom(this.#card, palette.from, palette.to);
      if (!isOff && this.#card) {
        this.#card.style.setProperty("--ndl-glow", `color-mix(in srgb, ${palette.accent} 30%, transparent)`);
      }

      if (!this.#dragging) {
        this.#targetTemp = attributes.temperature ?? 20;
        this.#updateClimateGauge();
      }

      if (this.#chipEl) {
        if (isOff) {
          this.#chipEl.textContent = "Off";
        } else {
          const t = Math.round(this.#targetTemp * 10) / 10;
          this.#chipEl.textContent = this.#currentTemp != null
            ? `${t}° / ${this.#currentTemp}°` : `${t}°`;
        }
      }

      for (const btn of this.#modeButtons) {
        btn.setAttribute("data-active", String(btn.dataset.mode === state));
      }

      if (this.#currentEl) {
        this.#currentEl.textContent = this.#currentTemp != null
          ? `${this.#currentTemp}° now` : "";
      }

      const activeFan = attributes.fan_mode ?? "";
      for (const pill of this.#fanModePills) {
        pill.setAttribute("data-active", String(pill.dataset.fan === activeFan));
      }

      const activePreset = attributes.preset_mode ?? "";
      for (const pill of this.#presetModePills) {
        pill.setAttribute("data-active", String(pill.dataset.preset === activePreset));
      }

      const fillColor = palette.fill ?? palette.accent;
      const gaugeFill = this.root.querySelector(".ndl-gauge-fill");
      if (gaugeFill) gaugeFill.setAttribute("stroke", fillColor);

      this.announceState(
        `${this.def.friendly_name}, ${_capitalize(state)}, target ${Math.round(this.#targetTemp)}°`
        + (this.#currentTemp != null ? `, currently ${this.#currentTemp}°` : ""),
      );
    }

    predictState(action, data) {
      if (action === "set_hvac_mode" && data.hvac_mode) {
        return { state: data.hvac_mode, attributes: this.#lastAttrs };
      }
      if (action === "set_fan_mode" && data.fan_mode) {
        return { state: this.#hvacMode, attributes: { ...this.#lastAttrs, fan_mode: data.fan_mode } };
      }
      if (action === "set_preset_mode" && data.preset_mode) {
        return { state: this.#hvacMode, attributes: { ...this.#lastAttrs, preset_mode: data.preset_mode } };
      }
      if (action === "set_temperature" && data.temperature != null) {
        return { state: this.#hvacMode, attributes: { ...this.#lastAttrs, temperature: data.temperature } };
      }
      return null;
    }

    #updateClimateGauge() {
      const range = this.#maxTemp - this.#minTemp;
      const frac = range > 0 ? _clamp((this.#targetTemp - this.#minTemp) / range, 0, 1) : 0;
      _updateGauge(this.root, frac, null);
      if (this.#targetEl) {
        this.#targetEl.innerHTML = `${Math.round(this.#targetTemp * 10) / 10}<sup>°</sup>`;
      }
      if (this.#gaugeWrap) {
        this.#gaugeWrap.setAttribute("aria-valuenow", String(Math.round(this.#targetTemp)));
      }
    }

    #initDrag() {
      const wrap = this.#gaugeWrap;
      const onStart = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        this.#dragging = true;
        wrap.setPointerCapture(e.pointerId);
        this.#onDragMove(e);
      };
      const onMove = (e) => { if (this.#dragging) this.#onDragMove(e); };
      const onEnd = () => {
        if (!this.#dragging) return;
        this.#dragging = false;
        this.#sendTemp();
      };
      wrap.addEventListener("pointerdown", onStart);
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerup", onEnd);
      wrap.addEventListener("pointercancel", onEnd);
    }

    #onDragMove(e) {
      const frac = _pointerToFrac(e, this.#gaugeWrap);
      if (frac == null) return;
      const raw = this.#minTemp + frac * (this.#maxTemp - this.#minTemp);
      this.#targetTemp = Math.round(raw / this.#tempStep) * this.#tempStep;
      this.#updateClimateGauge();
    }

    #doSendTemp() {
      this.config.card?.sendCommand("set_temperature", { temperature: this.#targetTemp });
    }
  }

  // ---------------------------------------------------------------------------
  // FanCard - horizontal slider bar
  // ---------------------------------------------------------------------------

  const FAN_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    [part=card-header] {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    [part=card-icon] { cursor: pointer; }
    .ndl-fan-pct-badge {
      margin-left: auto;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.35);
      border: 1px solid rgba(255,255,255,0.4);
      backdrop-filter: blur(4px);
      font-size: 12px;
      font-weight: 700;
      color: var(--ndl-fg, #1a1a2e);
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ndl-fan-control-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ndl-fan-slider-wrap {
      flex: 1;
      min-width: 0;
      height: 48px;
      border-radius: 24px;
      background: rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }
    .ndl-fan-slider-track {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      border-radius: 24px;
      overflow: hidden;
      pointer-events: none;
    }
    .ndl-fan-slider-fill {
      width: 100%;
      height: 100%;
      border-radius: 24px;
      background: linear-gradient(90deg, rgba(56,217,169,0.5) 0%, rgba(56,217,169,0.8) 100%);
      transition: width 0.15s ease;
    }

    @keyframes ndl-fan-spin {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    [part=card-icon][data-animate=true] svg {
      animation: ndl-fan-spin 1.5s linear infinite;
      transform-origin: center;
    }
    .ndl-fan-slider-input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
      margin: 0;
    }
    .ndl-fan-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }
    .ndl-fan-slider-input::-webkit-slider-thumb:active { cursor: grabbing; }
    .ndl-fan-slider-input::-moz-range-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: white;
      border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }

    .ndl-fan-row-btns {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .ndl-fan-osc-btn[data-active=true],
    .ndl-fan-dir-btn[data-active=true] {
      background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
      border-color: rgba(0,0,0,0.14);
      box-shadow: 0 3px 10px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
    }

    .ndl-fan-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }

    .ndl-fan-preset-pill {
      padding: 4px 10px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 100%);
      backdrop-filter: blur(6px);
      font-size: 11px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .ndl-fan-preset-pill:hover {
      background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.45) 100%);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .ndl-fan-preset-pill[data-active=true] {
      background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
      border-color: rgba(0,0,0,0.14);
      box-shadow: 0 3px 10px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
    }

    .ndl-fan-ro {
      font-size: 16px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      text-align: center;
      padding: 8px 0;
    }
  `;

  class FanCard extends BaseCard {
    #card = null;
    #fill = null;
    #slider = null;
    #pctLabel = null;
    #roLabel = null;
    #oscBtn = null;
    #dirBtn = null;
    #presetPills = [];

    #isOn = false;
    #percentage = 0;
    #oscillating = false;
    #direction = "forward";
    #lastAttrs = {};
    #wasOn = null;
    #sendPct;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendPct = _debounce(this.#doSendPct.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const features = this.def.supported_features ?? [];
      const displayMode = (this.config.displayHints ?? this.def.display_hints ?? {}).display_mode ?? null;
      const hasSpeed = displayMode === "on-off" ? false : features.includes("set_speed");
      const hasOsc = features.includes("oscillate");
      const hasDir = features.includes("direction");
      const presetModes = this.def.feature_config?.preset_modes ?? [];
      const pctStep = this.def.feature_config?.percentage_step ?? 1;

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${FAN_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            ${isWritable ? /* html */`<span class="ndl-fan-pct-badge">-</span>` : ""}
          </div>
          <div part="card-body">
            ${isWritable ? /* html */`
              <div class="ndl-controls-shell" data-collapsed="true">
                ${hasSpeed ? /* html */`
                  <div class="ndl-fan-control-row">
                    <div class="ndl-fan-slider-wrap">
                      <div class="ndl-fan-slider-track">
                        <div class="ndl-fan-slider-fill" style="width:0%"></div>
                      </div>
                      <input type="range" class="ndl-fan-slider-input" min="0" max="100"
                        step="${pctStep}" value="0"
                        aria-label="${_esc(this.def.friendly_name)} speed">
                    </div>
                    <div class="ndl-fan-row-btns">
                      ${hasOsc ? /* html */`
                        <button class="ndl-circle-btn ndl-fan-osc-btn" type="button"
                          data-active="false" aria-label="Oscillation" title="Oscillation">
                          <span part="fan-osc-icon"></span>
                        </button>
                      ` : ""}
                      ${hasDir ? /* html */`
                        <button class="ndl-circle-btn ndl-fan-dir-btn" type="button"
                          data-active="false" aria-label="Direction" title="Direction">
                          <span part="fan-dir-icon"></span>
                        </button>
                      ` : ""}
                    </div>
                  </div>
                ` : ""}
                ${presetModes.length ? /* html */`
                  <div class="ndl-fan-presets">
                    ${presetModes.map((m) => /* html */`
                      <button class="ndl-fan-preset-pill" data-preset="${_esc(m)}"
                        data-active="false" type="button">${_capitalize(m)}</button>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            ` : /* html */`
              <div class="ndl-fan-ro">-</div>
            `}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#card = this.root.querySelector("[part=card]");
      this.#fill = this.root.querySelector(".ndl-fan-slider-fill");
      this.#slider = this.root.querySelector(".ndl-fan-slider-input");
      this.#pctLabel = this.root.querySelector(".ndl-fan-pct-badge");
      this.#roLabel = this.root.querySelector(".ndl-fan-ro");
      this.#oscBtn = this.root.querySelector(".ndl-fan-osc-btn");
      this.#dirBtn = this.root.querySelector(".ndl-fan-dir-btn");
      this.#presetPills = [...this.root.querySelectorAll(".ndl-fan-preset-pill")];

      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:fan"), "card-icon");
      if (this.#oscBtn) this.renderIcon("mdi:sync", "fan-osc-icon");
      if (this.#dirBtn) this.renderIcon("mdi:rotate-right", "fan-dir-icon");

      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl && this.def.capabilities === "read-write") {
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("toggle", {});
          },
        });
      }
      if (this.#oscBtn) {
        this.#oscBtn.addEventListener("click", () => {
          _triggerBounce(this.#oscBtn);
          this.config.card?.sendCommand("oscillate", { oscillating: !this.#oscillating });
        });
      }
      if (this.#dirBtn) {
        this.#dirBtn.addEventListener("click", () => {
          _triggerBounce(this.#dirBtn);
          this.config.card?.sendCommand("set_direction", {
            direction: this.#direction === "forward" ? "reverse" : "forward",
          });
        });
      }
      for (const pill of this.#presetPills) {
        pill.addEventListener("click", () => {
          _triggerBounce(pill);
          this.config.card?.sendCommand("set_preset_mode", { preset_mode: pill.dataset.preset });
        });
      }
      if (this.#slider) {
        const trackEl = this.root.querySelector(".ndl-fan-slider-track");
        this.#slider.addEventListener("input", () => {
          this.#percentage = parseInt(this.#slider.value, 10);
          if (trackEl) trackEl.style.width = `${this.#percentage}%`;
          if (this.#pctLabel) this.#pctLabel.textContent = `${this.#percentage}%`;
          this.#sendPct();
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, attributes) {
      this.#isOn = state === "on";
      this.#lastAttrs = attributes;
      this.#percentage = attributes.percentage ?? 0;
      this.#oscillating = attributes.oscillating ?? false;
      this.#direction = attributes.direction ?? "forward";

      if (this.#wasOn !== null && this.#wasOn !== this.#isOn && this.#card) {
        this.#card.classList.remove("ndl-powering-up", "ndl-powering-down");
        void this.#card.getBoundingClientRect();
        this.#card.classList.add(this.#isOn ? "ndl-powering-up" : "ndl-powering-down");
      }
      this.#wasOn = this.#isOn;
      _setControlsCollapsed(this.root, !this.#isOn);

      const colors = _colorsFor("fan");
      _applyCardGradient(this.#card, colors, this.#isOn);

      const trackEl = this.root.querySelector(".ndl-fan-slider-track");
      if (trackEl) trackEl.style.width = `${this.#percentage}%`;
      if (this.#slider && !this.isFocused(this.#slider)) {
        this.#slider.value = String(this.#percentage);
      }
      if (this.#pctLabel) {
        this.#pctLabel.textContent = this.#isOn ? `${this.#percentage}%` : _capitalize(state);
      }

      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl) {
        iconEl.setAttribute("data-animate", String(this.#isOn && !!this.config.animate));
      }

      if (this.#oscBtn) {
        this.#oscBtn.setAttribute("data-active", String(this.#oscillating));
        this.#oscBtn.title = this.#oscillating ? "Oscillation on" : "Oscillation off";
      }
      if (this.#dirBtn) {
        this.#dirBtn.setAttribute("data-active", String(this.#direction === "reverse"));
        this.renderIcon(
          this.#direction === "reverse" ? "mdi:rotate-left" : "mdi:rotate-right",
          "fan-dir-icon",
        );
        this.#dirBtn.title = _capitalize(this.#direction);
      }

      const activePreset = attributes.preset_mode ?? "";
      for (const pill of this.#presetPills) {
        pill.setAttribute("data-active", String(pill.dataset.preset === activePreset));
      }

      if (this.#roLabel) {
        this.#roLabel.textContent = this.#isOn ? `${this.#percentage}%` : _capitalize(state);
      }

      this.announceState(`${this.def.friendly_name}, ${state}${this.#isOn ? `, ${this.#percentage}%` : ""}`);
    }

    predictState(action, data) {
      if (action === "toggle") {
        return { state: this.#isOn ? "off" : "on", attributes: this.#lastAttrs };
      }
      if (action === "oscillate" && data.oscillating != null) {
        return { state: this.#isOn ? "on" : "off", attributes: { ...this.#lastAttrs, oscillating: data.oscillating } };
      }
      if (action === "set_direction" && data.direction) {
        return { state: this.#isOn ? "on" : "off", attributes: { ...this.#lastAttrs, direction: data.direction } };
      }
      if (action === "set_preset_mode" && data.preset_mode) {
        return { state: this.#isOn ? "on" : "off", attributes: { ...this.#lastAttrs, preset_mode: data.preset_mode } };
      }
      return null;
    }

    #doSendPct() {
      if (this.#percentage <= 0) this.config.card?.sendCommand("turn_off", {});
      else this.config.card?.sendCommand("set_percentage", { percentage: this.#percentage });
    }
  }

  // ---------------------------------------------------------------------------
  // CoverCard
  // ---------------------------------------------------------------------------

  const COVER_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    .ndl-cover-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ndl-cover-tilt {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .ndl-cover-tilt-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.5;
      min-width: 24px;
      text-align: right;
    }
    .ndl-cover-tilt-slider {
      flex: 1;
      height: 40px;
      -webkit-appearance: none; appearance: none;
      background: rgba(0,0,0,0.08); border-radius: 20px;
      outline: none; cursor: pointer;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }
    .ndl-cover-tilt-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px; height: 20px; border-radius: 50%;
      background: white; border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }
    .ndl-cover-tilt-slider::-webkit-slider-thumb:active { cursor: grabbing; }
    .ndl-cover-tilt-slider::-moz-range-thumb {
      width: 20px; height: 20px; border-radius: 50%;
      background: white; border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
    }
  `;

  const _COVER_ICONS = {
    garage: { open: "mdi:garage-open", closed: "mdi:garage" },
    door: { open: "mdi:door-open", closed: "mdi:door-closed" },
    window: { open: "mdi:window-open", closed: "mdi:window-closed" },
    blind: { open: "mdi:blinds-open", closed: "mdi:blinds" },
    shutter: { open: "mdi:window-shutter-open", closed: "mdi:window-shutter" },
  };

  class CoverCard extends BaseCard {
    #card = null;
    #chipEl = null;
    #tiltSlider = null;
    #tiltLabel = null;
    #isOpen = false;
    #wasOpen = null;
    #sendTilt;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendTilt = _debounce(this.#doSendTilt.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const features = this.def.supported_features ?? [];
      const hints = this.config.displayHints ?? {};
      const hasTilt = hints.show_tilt !== false && features.includes("set_tilt_position");

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${COVER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-cover-chip">-</span>
          </div>
          ${isWritable ? /* html */`
            <div class="ndl-controls-shell" data-collapsed="true">
              <div class="ndl-cover-controls">
                <button class="ndl-circle-btn" data-action="open" type="button"
                  aria-label="Open" title="Open"><span part="c-open"></span></button>
                <button class="ndl-circle-btn" data-action="stop" type="button"
                  aria-label="Stop" title="Stop"><span part="c-stop"></span></button>
                <button class="ndl-circle-btn" data-action="close" type="button"
                  aria-label="Close" title="Close"><span part="c-close"></span></button>
              </div>
              ${hasTilt ? /* html */`
                <div class="ndl-cover-tilt">
                  <span class="ndl-cover-tilt-label">0%</span>
                  <input type="range" class="ndl-cover-tilt-slider" min="0" max="100"
                    value="0" aria-label="Tilt position">
                </div>
              ` : ""}
            </div>
          ` : ""}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-cover-chip");
      this.#tiltSlider = this.root.querySelector(".ndl-cover-tilt-slider");
      this.#tiltLabel = this.root.querySelector(".ndl-cover-tilt-label");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:window-shutter"), "card-icon");
      this.renderIcon("mdi:arrow-up", "c-open");
      this.renderIcon("mdi:stop", "c-stop");
      this.renderIcon("mdi:arrow-down", "c-close");

      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl && isWritable) {
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
            this.config.card?.sendCommand(this.#isOpen ? "close_cover" : "open_cover", {});
          },
        });
      }

      this.root.querySelectorAll(".ndl-cover-controls .ndl-circle-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          _triggerBounce(btn);
          this.config.card?.sendCommand(`${btn.dataset.action}_cover`, {});
        });
      });
      if (this.#tiltSlider) {
        this.#tiltSlider.addEventListener("input", () => {
          const val = parseInt(this.#tiltSlider.value, 10);
          if (this.#tiltLabel) this.#tiltLabel.textContent = `${val}%`;
          this.#sendTilt();
        });
      }
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, attributes) {
      this.#isOpen = state === "open";
      if (this.#wasOpen !== null && this.#wasOpen !== this.#isOpen && this.#card) {
        this.#card.classList.remove("ndl-powering-up", "ndl-powering-down");
        void this.#card.getBoundingClientRect();
        this.#card.classList.add(this.#isOpen ? "ndl-powering-up" : "ndl-powering-down");
      }
      this.#wasOpen = this.#isOpen;
      _setControlsCollapsed(this.root, !this.#isOpen);
      const colors = _colorsFor("cover");
      _applyCardGradient(this.#card, colors, this.#isOpen);
      const dc = attributes.device_class ?? "shutter";
      const iconSet = _COVER_ICONS[dc] ?? _COVER_ICONS.shutter;
      this.renderIcon(this.resolveIcon(this.#isOpen ? iconSet.open : iconSet.closed, "mdi:window-shutter"), "card-icon");
      if (this.#chipEl) {
        const pos = attributes.current_position;
        this.#chipEl.textContent = pos != null ? `${_capitalize(state)} ${pos}%` : _capitalize(state);
      }
      const tiltPos = attributes.current_tilt_position;
      if (this.#tiltSlider && tiltPos != null && !this.isFocused(this.#tiltSlider)) {
        this.#tiltSlider.value = String(tiltPos);
        if (this.#tiltLabel) this.#tiltLabel.textContent = `${tiltPos}%`;
      }
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    #doSendTilt() {
      const val = parseInt(this.#tiltSlider?.value ?? "0", 10);
      this.config.card?.sendCommand("set_cover_tilt_position", { tilt_position: val });
    }
  }

  // ---------------------------------------------------------------------------
  // MediaPlayerCard
  // ---------------------------------------------------------------------------

  const MEDIA_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    [part=card-body] {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ndl-media-top {
      display: flex; gap: 10px; align-items: center;
    }
    .ndl-media-art {
      width: 48px; height: 48px; border-radius: 10px;
      object-fit: cover; flex-shrink: 0;
      background: rgba(0,0,0,0.08);
    }
    .ndl-media-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    .ndl-media-title {
      font-size: 13px; font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ndl-media-artist {
      font-size: 11px; color: var(--ndl-fg, #1a1a2e); opacity: 0.6;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ndl-media-album {
      font-size: 10px; color: var(--ndl-fg, #1a1a2e); opacity: 0.4;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .ndl-media-controls {
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }

    .ndl-media-progress {
      display: flex; align-items: center; gap: 6px;
      font-size: 10px; color: var(--ndl-fg, #1a1a2e); opacity: 0.5;
    }
    .ndl-media-progress-bar {
      flex: 1; height: 3px; border-radius: 2px;
      background: rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .ndl-media-progress-fill {
      height: 100%; border-radius: 2px;
      background: rgba(0,0,0,0.25);
      transition: width 1s linear;
    }

    .ndl-media-volume {
      display: flex; align-items: center; gap: 8px;
    }
    .ndl-media-volume svg {
      width: 16px; height: 16px;
      color: var(--ndl-fg, #1a1a2e); opacity: 0.5;
      flex-shrink: 0; cursor: pointer;
    }
    .ndl-media-vol-slider {
      flex: 1; height: 40px;
      -webkit-appearance: none; appearance: none;
      background: rgba(0,0,0,0.08); border-radius: 20px;
      outline: none; cursor: pointer;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }
    .ndl-media-vol-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px; height: 24px; border-radius: 50%;
      background: white; border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }
    .ndl-media-vol-slider::-webkit-slider-thumb:active { cursor: grabbing; }
    .ndl-media-vol-slider::-moz-range-thumb {
      width: 24px; height: 24px; border-radius: 50%;
      background: white; border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
    }

    .ndl-media-source-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: var(--ndl-fg, #1a1a2e); opacity: 0.5;
    }
    .ndl-media-source-select {
      flex: 1; font-size: 11px;
      background: rgba(255,255,255,0.35); border: none;
      border-radius: 6px; padding: 4px 8px;
      color: inherit; cursor: pointer; outline: none;
    }
  `;

  class MediaPlayerCard extends BaseCard {
    #card = null;
    #artEl = null;
    #titleEl = null;
    #artistEl = null;
    #albumEl = null;
    #playBtn = null;
    #volumeSlider = null;
    #progressWrap = null;
    #progressFill = null;
    #progressPos = null;
    #progressDur = null;
    #sourceSelect = null;
    #chipEl = null;

    #isPlaying = false;
    #isMuted = false;
    #volume = 50;
    #lastAttrs = {};
    #sendVolume;
    #progressTimer = null;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendVolume = _debounce(this.#doSendVol.bind(this), 200);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const features = this.def.supported_features ?? [];
      const hints = this.config.displayHints ?? {};
      const showTransport = hints.show_transport !== false;
      const hasPlay = features.includes("play_pause") || features.includes("play");
      const hasPrevNext = features.includes("previous_track");
      const hasVolume = hints.show_volume !== false && (features.includes("volume_set") || features.includes("volume_step"));
      const showControls = isWritable && showTransport && (hasPlay || hasPrevNext);
      const showVolume = isWritable && hasVolume;

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${MEDIA_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-media-chip">-</span>
          </div>
          <div part="card-body">
            <div class="ndl-controls-shell" data-collapsed="true">
              <div class="ndl-media-top">
                <img class="ndl-media-art" alt="" style="display:none">
                <div class="ndl-media-info">
                  <div class="ndl-media-title">-</div>
                  <div class="ndl-media-artist"></div>
                  <div class="ndl-media-album"></div>
                </div>
              </div>
              ${isWritable ? /* html */`
                <div class="ndl-media-progress" style="display:none">
                  <span class="ndl-media-progress-pos">0:00</span>
                  <div class="ndl-media-progress-bar">
                    <div class="ndl-media-progress-fill" style="width:0%"></div>
                  </div>
                  <span class="ndl-media-progress-dur">0:00</span>
                </div>
              ` : ""}
              ${showControls ? /* html */`
                <div class="ndl-media-controls">
                  ${hasPrevNext ? /* html */`
                    <button class="ndl-circle-btn" data-action="prev" type="button"
                      aria-label="Previous" title="Previous">
                      <span part="m-prev"></span></button>
                  ` : ""}
                  ${hasPlay ? /* html */`
                    <button class="ndl-circle-btn ndl-large ndl-media-play" data-action="play"
                      type="button" aria-label="Play/Pause" title="Play/Pause">
                      <span part="m-play"></span></button>
                  ` : ""}
                  ${hasPrevNext ? /* html */`
                    <button class="ndl-circle-btn" data-action="next" type="button"
                      aria-label="Next" title="Next">
                      <span part="m-next"></span></button>
                  ` : ""}
                </div>
              ` : ""}
              ${showVolume ? /* html */`
                <div class="ndl-media-volume">
                  <span part="m-vol" style="cursor:pointer"></span>
                  <input type="range" class="ndl-media-vol-slider" min="0" max="100"
                    value="50" aria-label="Volume">
                </div>
              ` : ""}
              ${isWritable ? /* html */`
                <div class="ndl-media-source-row" style="display:none">
                  <select class="ndl-media-source-select" aria-label="Source"></select>
                </div>
              ` : ""}
            </div>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#card = this.root.querySelector("[part=card]");
      this.#artEl = this.root.querySelector(".ndl-media-art");
      this.#titleEl = this.root.querySelector(".ndl-media-title");
      this.#artistEl = this.root.querySelector(".ndl-media-artist");
      this.#albumEl = this.root.querySelector(".ndl-media-album");
      this.#chipEl = this.root.querySelector(".ndl-media-chip");
      this.#playBtn = this.root.querySelector(".ndl-media-play");
      this.#volumeSlider = this.root.querySelector(".ndl-media-vol-slider");
      this.#progressWrap = this.root.querySelector(".ndl-media-progress");
      this.#progressFill = this.root.querySelector(".ndl-media-progress-fill");
      this.#progressPos = this.root.querySelector(".ndl-media-progress-pos");
      this.#progressDur = this.root.querySelector(".ndl-media-progress-dur");
      this.#sourceSelect = this.root.querySelector(".ndl-media-source-select");

      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:cast"), "card-icon");
      if (hasPrevNext) this.renderIcon("mdi:skip-previous", "m-prev");
      if (hasPlay) this.renderIcon("mdi:play", "m-play");
      if (hasPrevNext) this.renderIcon("mdi:skip-next", "m-next");
      if (showVolume) this.renderIcon("mdi:volume-high", "m-vol");

      const iconEl = this.root.querySelector("[part=card-icon]");
      if (iconEl && isWritable && hasPlay) {
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
            this.config.card?.sendCommand("media_play_pause", {});
          },
        });
      }

      const prevBtn = this.root.querySelector("[data-action=prev]");
      const nextBtn = this.root.querySelector("[data-action=next]");
      if (this.#playBtn) this.#playBtn.addEventListener("click", () => { _triggerBounce(this.#playBtn); this.config.card?.sendCommand("media_play_pause", {}); });
      if (prevBtn) prevBtn.addEventListener("click", () => { _triggerBounce(prevBtn); this.config.card?.sendCommand("media_previous_track", {}); });
      if (nextBtn) nextBtn.addEventListener("click", () => { _triggerBounce(nextBtn); this.config.card?.sendCommand("media_next_track", {}); });

      const muteEl = this.root.querySelector("[part=m-vol]");
      if (muteEl) muteEl.addEventListener("click", () => {
        _triggerBounce(muteEl);
        this.config.card?.sendCommand("volume_mute", { is_volume_muted: !this.#isMuted });
      });

      if (this.#volumeSlider) {
        this.#volumeSlider.addEventListener("input", () => {
          this.#volume = parseInt(this.#volumeSlider.value, 10);
          this.#sendVolume();
        });
      }

      if (this.#sourceSelect) {
        this.#sourceSelect.addEventListener("change", () => {
          this.config.card?.sendCommand("select_source", { source: this.#sourceSelect.value });
        });
      }

      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, attributes) {
      this.#isPlaying = state === "playing";
      this.#lastAttrs = attributes;
      this.#isMuted = attributes.is_volume_muted ?? false;
      this.#volume = Math.round((attributes.volume_level ?? 0.5) * 100);

      const colors = _colorsFor("media_player");
      const active = state === "playing" || state === "paused";
      _applyCardGradient(this.#card, colors, active);
      _setControlsCollapsed(this.root, !active);

      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);

      const rawPic = attributes.entity_picture;
      const pic = rawPic
        ? (rawPic.startsWith("http") ? rawPic : (this.config.haUrl || "") + rawPic)
        : null;
      if (this.#artEl) {
        if (pic) {
          this.#artEl.src = pic;
          this.#artEl.style.display = "";
        } else {
          this.#artEl.style.display = "none";
        }
      }

      const title = attributes.media_title || attributes.app_name || _capitalize(state);
      if (this.#titleEl) this.#titleEl.textContent = title;
      if (this.#artistEl) this.#artistEl.textContent = attributes.media_artist || "";
      if (this.#albumEl) this.#albumEl.textContent = attributes.media_album_name || "";

      this.renderIcon(this.#isPlaying ? "mdi:pause" : "mdi:play", "m-play");
      this.renderIcon(this.#isMuted ? "mdi:volume-off" : "mdi:volume-high", "m-vol");

      if (this.#volumeSlider && !this.isFocused(this.#volumeSlider)) {
        this.#volumeSlider.value = String(this.#volume);
      }

      this.#updateProgress(attributes);

      const sourceList = attributes.source_list;
      const sourceRow = this.root.querySelector(".ndl-media-source-row");
      if (this.#sourceSelect && sourceList?.length) {
        if (sourceRow) sourceRow.style.display = "";
        const current = attributes.source ?? "";
        const opts = sourceList.map((s) =>
          `<option value="${_esc(s)}"${s === current ? " selected" : ""}>${_esc(s)}</option>`
        ).join("");
        this.#sourceSelect.innerHTML = opts;
      } else if (sourceRow) {
        sourceRow.style.display = "none";
      }

      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    #updateProgress(attrs) {
      if (this.#progressTimer) { clearInterval(this.#progressTimer); this.#progressTimer = null; }

      const duration = attrs.media_duration;
      const position = attrs.media_position;
      const updated = attrs.media_position_updated_at;

      if (duration == null || position == null || !this.#progressWrap) {
        if (this.#progressWrap) this.#progressWrap.style.display = "none";
        return;
      }

      this.#progressWrap.style.display = "";
      if (this.#progressDur) this.#progressDur.textContent = this.#fmtTime(duration);

      const elapsed = updated ? (Date.now() / 1000 - new Date(updated).getTime() / 1000) : 0;
      let pos = position + (this.#isPlaying ? elapsed : 0);

      const update = () => {
        pos = Math.min(pos, duration);
        const frac = duration > 0 ? (pos / duration) * 100 : 0;
        if (this.#progressFill) this.#progressFill.style.width = `${frac}%`;
        if (this.#progressPos) this.#progressPos.textContent = this.#fmtTime(Math.floor(pos));
      };
      update();

      if (this.#isPlaying) {
        this.#progressTimer = setInterval(() => { pos += 1; update(); }, 1000);
      }
    }

    #fmtTime(sec) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    #doSendVol() { this.config.card?.sendCommand("volume_set", { volume_level: this.#volume / 100 }); }

    predictState(action, data) {
      if (action === "media_play_pause") {
        return { state: this.#isPlaying ? "paused" : "playing", attributes: this.#lastAttrs };
      }
      if (action === "volume_mute") {
        return { state: this.#isPlaying ? "playing" : "paused", attributes: { ...this.#lastAttrs, is_volume_muted: !!data.is_volume_muted } };
      }
      if (action === "volume_set") {
        return { state: this.#isPlaying ? "playing" : "paused", attributes: { ...this.#lastAttrs, volume_level: data.volume_level } };
      }
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // InputNumberCard
  // ---------------------------------------------------------------------------

  const INPNUM_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    .ndl-inpnum-slider-wrap {
      width: 100%; height: 48px;
      border-radius: 24px; background: rgba(0,0,0,0.08);
      position: relative; overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
      margin-top: 8px;
    }
    .ndl-inpnum-slider-track {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      border-radius: 24px; overflow: hidden;
      pointer-events: none;
    }
    .ndl-inpnum-slider-fill {
      width: 100%; height: 100%; border-radius: 24px;
      background: linear-gradient(90deg, rgba(102,217,232,0.4) 0%, rgba(102,217,232,0.7) 100%);
      transition: width 0.15s ease;
    }
    .ndl-inpnum-slider-input {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      -webkit-appearance: none; appearance: none;
      background: transparent;
      cursor: pointer; margin: 0;
    }
    .ndl-inpnum-slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 24px; height: 24px; border-radius: 50%;
      background: white; border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
      cursor: grab;
    }
    .ndl-inpnum-slider-input::-webkit-slider-thumb:active { cursor: grabbing; }
    .ndl-inpnum-slider-input::-moz-range-thumb {
      width: 24px; height: 24px; border-radius: 50%;
      background: white; border: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.8);
    }
  `;

  class InputNumberCard extends BaseCard {
    #card = null;
    #chipEl = null;
    #fill = null;
    #slider = null;
    #value = 0;
    #min = 0;
    #max = 100;
    #step = 1;
    #unit = "";
    #sendValue;

    constructor(def, root, config, i18n) {
      super(def, root, config, i18n);
      this.#sendValue = _debounce(this.#doSendValue.bind(this), 300);
    }

    render() {
      const isWritable = this.def.capabilities === "read-write";
      const hasSlider = (this.config.displayHints?.display_mode ?? null) !== "buttons";
      this.#min = this.def.feature_config?.min ?? 0;
      this.#max = this.def.feature_config?.max ?? 100;
      this.#step = this.def.feature_config?.step ?? 1;
      this.#unit = this.def.unit_of_measurement ?? "";

      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${INPNUM_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-inpnum-chip">-</span>
          </div>
          ${isWritable && hasSlider ? /* html */`
            <div class="ndl-inpnum-slider-wrap">
              <div class="ndl-inpnum-slider-track">
                <div class="ndl-inpnum-slider-fill" style="width:0%"></div>
              </div>
              <input type="range" class="ndl-inpnum-slider-input"
                min="${this.#min}" max="${this.#max}" step="${this.#step}" value="${this.#min}"
                aria-label="${_esc(this.def.friendly_name)}">
            </div>
          ` : ""}
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-inpnum-chip");
      this.#fill = this.root.querySelector(".ndl-inpnum-slider-fill");
      this.#slider = this.root.querySelector(".ndl-inpnum-slider-input");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:numeric"), "card-icon");
      if (this.#slider) {
        const trackEl = this.root.querySelector(".ndl-inpnum-slider-track");
        this.#slider.addEventListener("input", () => {
          this.#value = parseFloat(this.#slider.value);
          const frac = (this.#value - this.#min) / (this.#max - this.#min);
          if (trackEl) trackEl.style.width = `${frac * 100}%`;
          this.#updateChip();
          this.#sendValue();
        });
      }
      _applyCardGradient(this.#card, _colorsFor("input_number"), true);
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, _attributes) {
      const numVal = parseFloat(state);
      this.#value = isNaN(numVal) ? this.#min : numVal;
      if (this.#slider && !this.isFocused(this.#slider)) this.#slider.value = String(this.#value);
      const frac = (this.#value - this.#min) / (this.#max - this.#min);
      const trackEl = this.root.querySelector(".ndl-inpnum-slider-track");
      if (trackEl) trackEl.style.width = `${_clamp(frac, 0, 1) * 100}%`;
      this.#updateChip();
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    #updateChip() {
      if (this.#chipEl) {
        this.#chipEl.textContent = this.#unit ? `${this.#value} ${this.#unit}` : String(this.#value);
      }
    }

    #doSendValue() { this.config.card?.sendCommand("set_value", { value: this.#value }); }
  }

  // ---------------------------------------------------------------------------
  // InputSelectCard
  // ---------------------------------------------------------------------------

  const INPSEL_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    .ndl-inpsel-grid {
      display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
    }
    .ndl-inpsel-option {
      padding: 4px 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 100%);
      backdrop-filter: blur(6px);
      font-size: 11px; font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      cursor: pointer; transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .ndl-inpsel-option:hover {
      background: linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.45) 100%);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .ndl-inpsel-option[data-selected=true] {
      background: linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%);
      border-color: rgba(0,0,0,0.14);
      box-shadow: 0 3px 10px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
    }
  `;

  class InputSelectCard extends BaseCard {
    #card = null;
    #chipEl = null;
    #grid = null;
    #optionButtons = [];
    #options = [];
    #lastOptionsList = [];

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.#options = this.def.feature_config?.options ?? [];
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${INPSEL_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-inpsel-chip">-</span>
          </div>
          ${isWritable ? /* html */`<div class="ndl-inpsel-grid"></div>` : ""}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-inpsel-chip");
      this.#grid = this.root.querySelector(".ndl-inpsel-grid");
      this.#optionButtons = [];
      this.#lastOptionsList = "";
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:format-list-bulleted"), "card-icon");
      _applyCardGradient(this.#card, _colorsFor("input_select"), true);
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, _attributes) {
      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);
      const options = _attributes?.options ?? this.#options;
      const optionsKey = options.join("|");
      if (this.#grid && optionsKey !== this.#lastOptionsList) {
        this.#lastOptionsList = optionsKey;
        this.#grid.innerHTML = "";
        this.#optionButtons = [];
        for (const opt of options) {
          const btn = document.createElement("div");
          btn.className = "ndl-inpsel-option";
          btn.dataset.option = opt;
          btn.textContent = _capitalize(opt);
          btn.addEventListener("click", () => {
            _triggerBounce(btn);
            this.config.card?.sendCommand("select_option", { option: opt });
          });
          this.#grid.appendChild(btn);
          this.#optionButtons.push(btn);
        }
      }
      for (const btn of this.#optionButtons) {
        btn.setAttribute("data-selected", String(btn.dataset.option === state));
      }
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TimerCard
  // ---------------------------------------------------------------------------

  const TIMER_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    .ndl-timer-display {
      font-size: 36px; font-weight: 300;
      color: var(--ndl-fg, #1a1a2e);
      font-variant-numeric: tabular-nums; line-height: 1;
      text-align: center;
      margin-top: 8px;
    }
    .ndl-timer-display[data-paused=true] { opacity: 0.5; }
    .ndl-timer-controls {
      display: flex; align-items: center; justify-content: center;
      gap: 10px; margin-top: 8px;
    }
  `;

  class TimerCard extends BaseCard {
    #display = null;
    #playBtn = null;
    #cancelBtn = null;
    #finishBtn = null;
    #timerInterval = null;
    #remaining = 0;
    #finishesAt = null;
    #state = "idle";
    #card = null;
    #chipEl = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${TIMER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip ndl-timer-chip">Idle</span>
          </div>
          <div class="ndl-timer-display">0:00:00</div>
          ${isWritable ? /* html */`
            <div class="ndl-timer-controls">
              <button class="ndl-circle-btn ndl-timer-pp" type="button"
                aria-label="Start / Pause"><span part="pp-icon"></span></button>
              <button class="ndl-circle-btn ndl-timer-cancel" type="button"
                aria-label="Cancel" disabled><span part="cancel-icon"></span></button>
              <button class="ndl-circle-btn ndl-timer-finish" type="button"
                aria-label="Finish" disabled><span part="finish-icon"></span></button>
            </div>
          ` : ""}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-chip");
      this.#display = this.root.querySelector(".ndl-timer-display");
      this.#playBtn = this.root.querySelector(".ndl-timer-pp");
      this.#cancelBtn = this.root.querySelector(".ndl-timer-cancel");
      this.#finishBtn = this.root.querySelector(".ndl-timer-finish");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:timer-outline"), "card-icon");
      this.renderIcon("mdi:play", "pp-icon");
      this.renderIcon("mdi:stop", "cancel-icon");
      this.renderIcon("mdi:check-circle", "finish-icon");
      if (this.#playBtn) this.#playBtn.addEventListener("click", () => {
        _triggerBounce(this.#playBtn);
        this.config.card?.sendCommand(this.#state === "active" ? "pause" : "start", {});
      });
      if (this.#cancelBtn) this.#cancelBtn.addEventListener("click", () => { _triggerBounce(this.#cancelBtn); this.config.card?.sendCommand("cancel", {}); });
      if (this.#finishBtn) this.#finishBtn.addEventListener("click", () => { _triggerBounce(this.#finishBtn); this.config.card?.sendCommand("finish", {}); });
      _applyCardGradient(this.#card, _colorsFor("timer"), true);
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, attributes) {
      this.#state = state;
      const isActive = state === "active";
      const isPaused = state === "paused";
      _applyCardGradient(this.#card, _colorsFor("timer"), isActive || isPaused);

      if (isActive && attributes.finishes_at) {
        this.#finishesAt = new Date(attributes.finishes_at).getTime();
        this.#startTick();
      } else {
        this.#stopTick();
        this.#finishesAt = null;
        if (isPaused && attributes.remaining) this.#remaining = this.#parseDur(attributes.remaining);
        else if (attributes.duration) this.#remaining = state === "idle" ? this.#parseDur(attributes.duration) : 0;
        else this.#remaining = 0;
      }
      if (this.#display) { this.#display.setAttribute("data-paused", String(isPaused)); this.#updateDisp(); }
      this.renderIcon(isActive ? "mdi:pause" : "mdi:play", "pp-icon");
      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);
      if (this.#cancelBtn) this.#cancelBtn.disabled = state === "idle";
      if (this.#finishBtn) this.#finishBtn.disabled = state === "idle";
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }

    destroy() { this.#stopTick(); }

    #parseDur(d) {
      if (typeof d !== "string") return 0;
      const p = d.split(":").map(Number);
      return p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p.length === 2 ? p[0]*60+p[1] : p[0]||0;
    }
    #startTick() { this.#stopTick(); this.#timerInterval = setInterval(() => this.#updateDisp(), 500); }
    #stopTick() { if (this.#timerInterval) { clearInterval(this.#timerInterval); this.#timerInterval = null; } }
    #updateDisp() {
      let s = this.#remaining;
      if (this.#finishesAt) s = Math.max(0, Math.round((this.#finishesAt - Date.now()) / 1000));
      const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
      if (this.#display) this.#display.textContent = `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    }
  }

  // ---------------------------------------------------------------------------
  // GenericCard / HarvestActionCard / RemoteCard
  // ---------------------------------------------------------------------------

  const GENERIC_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}
  `;

  class GenericCard extends BaseCard {
    #card = null;
    #chipEl = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${GENERIC_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip">-</span>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      this.#card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-chip");
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:help-circle"), "card-icon");
      if (isWritable) {
        this._attachGestureHandlers(this.root.querySelector("[part=card-icon]"), {
          onTap: () => {
            _triggerBounce(this.root.querySelector("[part=card-icon]"));
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("toggle", {});
          },
        });
      }
      _applyCardGradient(this.#card, _DEFAULT_COLORS, true);
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }

    applyState(state, _attributes) {
      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }
  }

  class HarvestActionCard extends BaseCard {
    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${GENERIC_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip">Action</span>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      const card = this.root.querySelector("[part=card]");
      _applyCardGradient(card, _colorsFor("harvest_action"), true);
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:play-circle-outline"), "card-icon");
      if (isWritable) {
        const iconEl = this.root.querySelector("[part=card-icon]");
        this._attachGestureHandlers(iconEl, {
          onTap: () => {
            _triggerBounce(iconEl);
            const tap = this.config.gestureConfig?.tap;
            if (tap) { this._runAction(tap); return; }
            this.config.card?.sendCommand("trigger", {});
          },
        });
      }
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }
    applyState(_state, _attributes) {
      this.announceState(`${this.def.friendly_name}, ${_state}`);
    }
  }

  const REMOTE_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    .ndl-remote-pad {
      display: grid;
      grid-template-columns: repeat(3, 40px);
      grid-template-rows: repeat(3, 40px);
      gap: 6px; place-items: center;
    }
    .ndl-remote-extra { display: flex; gap: 10px; justify-content: center; }
    .ndl-remote-controls {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      margin-top: 12px;
    }
  `;

  class RemoteCard extends BaseCard {
    #chipEl = null;

    render() {
      const isWritable = this.def.capabilities === "read-write";
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${REMOTE_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
            <span class="ndl-chip">-</span>
          </div>
          ${isWritable ? /* html */`
            <div class="ndl-remote-controls">
              <div class="ndl-remote-pad">
                <div></div>
                <button class="ndl-circle-btn" data-cmd="up" type="button" title="Up"><span part="r-up"></span></button>
                <div></div>
                <button class="ndl-circle-btn" data-cmd="left" type="button" title="Left"><span part="r-left"></span></button>
                <button class="ndl-circle-btn" data-cmd="select" type="button" title="Select"
                  style="background:rgba(255,255,255,0.7)"><span part="r-ok"></span></button>
                <button class="ndl-circle-btn" data-cmd="right" type="button" title="Right"><span part="r-right"></span></button>
                <div></div>
                <button class="ndl-circle-btn" data-cmd="down" type="button" title="Down"><span part="r-down"></span></button>
                <div></div>
              </div>
              <div class="ndl-remote-extra">
                <button class="ndl-circle-btn" data-cmd="back" type="button" title="Back"><span part="r-back"></span></button>
                <button class="ndl-circle-btn" data-cmd="menu" type="button" title="Menu"><span part="r-menu"></span></button>
              </div>
            </div>
          ` : ""}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;
      const card = this.root.querySelector("[part=card]");
      this.#chipEl = this.root.querySelector(".ndl-chip");
      _applyCardGradient(card, _colorsFor("remote"), true);
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:remote"), "card-icon");
      this.renderIcon("mdi:arrow-up", "r-up");
      this.renderIcon("mdi:arrow-down", "r-down");
      this.renderIcon("mdi:checkbox-blank-circle", "r-ok");
      this.renderIcon("mdi:arrow-up", "r-left");
      this.renderIcon("mdi:arrow-up", "r-right");
      this.renderIcon("mdi:arrow-up", "r-back");
      this.renderIcon("mdi:format-list-bulleted", "r-menu");
      const leftEl = this.root.querySelector("[part=r-left]"); if (leftEl) leftEl.style.transform = "rotate(-90deg)";
      const rightEl = this.root.querySelector("[part=r-right]"); if (rightEl) rightEl.style.transform = "rotate(90deg)";
      const backEl = this.root.querySelector("[part=r-back]"); if (backEl) backEl.style.transform = "rotate(-90deg)";
      if (isWritable) {
        this.root.querySelectorAll("[data-cmd]").forEach((btn) => {
          btn.addEventListener("click", () => { _triggerBounce(btn); this.config.card?.sendCommand("send_command", { command: btn.dataset.cmd }); });
        });
      }
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
      this._attachGestureHandlers(this.root.querySelector("[part=card]"));
    }
    applyState(state, _attributes) {
      if (this.#chipEl) this.#chipEl.textContent = _capitalize(state);
      this.announceState(`${this.def.friendly_name}, ${state}`);
    }
  }

  // ---------------------------------------------------------------------------
  // WeatherCard
  // ---------------------------------------------------------------------------

  // Condition-driven gradient palettes (sky-based colour logic)
  const _COND_COLORS = {
    "sunny":           { from: "#ffe566", to: "#ffd132", accent: "#f7b731" },
    "clear-night":     { from: "#748ffc", to: "#5c7cfa", accent: "#4c6ef5" },
    "partlycloudy":    { from: "#9fd1ff", to: "#74c0fc", accent: "#4dabf7" },
    "cloudy":          { from: "#b8c9d9", to: "#9ab2c4", accent: "#7a9db5" },
    "fog":             { from: "#c8d6df", to: "#b0c0ca", accent: "#8fa4b2" },
    "rainy":           { from: "#74c0fc", to: "#4dabf7", accent: "#339af0" },
    "pouring":         { from: "#4dabf7", to: "#339af0", accent: "#1c7ed6" },
    "snowy":           { from: "#e7f5ff", to: "#bac8ff", accent: "#91a7ff" },
    "snowy-rainy":     { from: "#c5f6fa", to: "#99e9f2", accent: "#66d9e8" },
    "hail":            { from: "#c5f6fa", to: "#a5d8ff", accent: "#74c0fc" },
    "lightning":       { from: "#d0bfff", to: "#9775fa", accent: "#7048e8" },
    "lightning-rainy": { from: "#74c0fc", to: "#5c7cfa", accent: "#4c6ef5" },
    "windy":           { from: "#96f2d7", to: "#63e6be", accent: "#38d9a9" },
    "windy-variant":   { from: "#96f2d7", to: "#63e6be", accent: "#38d9a9" },
    "exceptional":     { from: "#ffd8a8", to: "#ffa94d", accent: "#fd7e14" },
  };
  const _COND_COLORS_DEFAULT = { from: "#9fd1ff", to: "#74c0fc", accent: "#4dabf7" };

  function _condColors(condition) {
    return _COND_COLORS[condition] ?? _COND_COLORS_DEFAULT;
  }

  // Simplified temperature-to-colour for the large temperature number
  function _tempColor(celsius) {
    const c = Number(celsius);
    if (!Number.isFinite(c)) return null;
    if (c < 0)  return "#74c0fc";
    if (c < 15) return "#38d9a9";
    if (c < 25) return "#ffd132";
    if (c < 35) return "#f59f42";
    return "#e03131";
  }

  const _NDL_COND_PATHS = {
    "sunny":           "M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z",
    "clear-night":     "M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",
    "partlycloudy":    "M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.29 14.19,3.93 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.73C18.03,11.08 18.05,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.28C3,9.93 2.97,10.61 3.04,11.3M19,18H16V16A4,4 0 0,0 12,12A4,4 0 0,0 8,16H6A2,2 0 0,0 4,18A2,2 0 0,0 6,20H19A1,1 0 0,0 20,19A1,1 0 0,0 19,18Z",
    "cloudy":          "M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z",
    "fog":             "M3,15H13A1,1 0 0,1 14,16A1,1 0 0,1 13,17H3A1,1 0 0,1 2,16A1,1 0 0,1 3,15M16,15H21A1,1 0 0,1 22,16A1,1 0 0,1 21,17H16A1,1 0 0,1 15,16A1,1 0 0,1 16,15M1,12A5,5 0 0,1 6,7C7,4.65 9.3,3 12,3C15.43,3 18.24,5.66 18.5,9.03L19,9C21.19,9 22.97,10.76 23,13H21A2,2 0 0,0 19,11H17V10A5,5 0 0,0 12,5C9.5,5 7.45,6.82 7.06,9.19C6.73,9.07 6.37,9 6,9A3,3 0 0,0 3,12C3,12.35 3.06,12.69 3.17,13H1.1L1,12M3,19H5A1,1 0 0,1 6,20A1,1 0 0,1 5,21H3A1,1 0 0,1 2,20A1,1 0 0,1 3,19M8,19H21A1,1 0 0,1 22,20A1,1 0 0,1 21,21H8A1,1 0 0,1 7,20A1,1 0 0,1 8,19Z",
    "rainy":           "M6,14.03A1,1 0 0,1 7,15.03C7,15.58 6.55,16.03 6,16.03C3.24,16.03 1,13.79 1,11.03C1,8.27 3.24,6.03 6,6.03C7,3.68 9.3,2.03 12,2.03C15.43,2.03 18.24,4.69 18.5,8.06L19,8.03A4,4 0 0,1 23,12.03C23,14.23 21.21,16.03 19,16.03H18C17.45,16.03 17,15.58 17,15.03C17,14.47 17.45,14.03 18,14.03H19A2,2 0 0,0 21,12.03A2,2 0 0,0 19,10.03H17V9.03C17,6.27 14.76,4.03 12,4.03C9.5,4.03 7.45,5.84 7.06,8.21C6.73,8.09 6.37,8.03 6,8.03A3,3 0 0,0 3,11.03A3,3 0 0,0 6,14.03M12,14.15C12.18,14.39 12.37,14.66 12.56,14.94C13,15.56 14,17.03 14,18C14,19.11 13.1,20 12,20A2,2 0 0,1 10,18C10,17.03 11,15.56 11.44,14.94C11.63,14.66 11.82,14.4 12,14.15M12,11.03L11.5,11.59C11.5,11.59 10.65,12.55 9.79,13.81C8.93,15.06 8,16.56 8,18A4,4 0 0,0 12,22A4,4 0 0,0 16,18C16,16.56 15.07,15.06 14.21,13.81C13.35,12.55 12.5,11.59 12.5,11.59",
    "pouring":         "M9,12C9.53,12.14 9.85,12.69 9.71,13.22L8.41,18.05C8.27,18.59 7.72,18.9 7.19,18.76C6.65,18.62 6.34,18.07 6.5,17.54L7.78,12.71C7.92,12.17 8.47,11.86 9,12M13,12C13.53,12.14 13.85,12.69 13.71,13.22L11.64,20.95C11.5,21.5 10.95,21.8 10.41,21.66C9.88,21.5 9.56,20.97 9.7,20.43L11.78,12.71C11.92,12.17 12.47,11.86 13,12M17,12C17.53,12.14 17.85,12.69 17.71,13.22L16.41,18.05C16.27,18.59 15.72,18.9 15.19,18.76C14.65,18.62 14.34,18.07 14.5,17.54L15.78,12.71C15.92,12.17 16.47,11.86 17,12M17,10V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.43 4,15.6 3.5,15.32V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12C23,13.5 22.2,14.77 21,15.46V15.46C20.5,15.73 19.91,15.57 19.63,15.09C19.36,14.61 19.5,14 20,13.72V13.73C20.6,13.39 21,12.74 21,12A2,2 0 0,0 19,10H17Z",
    "snowy":           "M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M7.88,18.07L10.07,17.5L8.46,15.88C8.07,15.5 8.07,14.86 8.46,14.46C8.85,14.07 9.5,14.07 9.88,14.46L11.5,16.07L12.07,13.88C12.21,13.34 12.76,13.03 13.29,13.17C13.83,13.31 14.14,13.86 14,14.4L13.41,16.59L15.6,16C16.14,15.86 16.69,16.17 16.83,16.71C16.97,17.24 16.66,17.79 16.12,17.93L13.93,18.5L15.54,20.12C15.93,20.5 15.93,21.15 15.54,21.54C15.15,21.93 14.5,21.93 14.12,21.54L12.5,19.93L11.93,22.12C11.79,22.66 11.24,22.97 10.71,22.83C10.17,22.69 9.86,22.14 10,21.6L10.59,19.41L8.4,20C7.86,20.14 7.31,19.83 7.17,19.29C7.03,18.76 7.34,18.21 7.88,18.07Z",
    "snowy-rainy":     "M4,16.36C3.86,15.82 4.18,15.25 4.73,15.11L7,14.5L5.33,12.86C4.93,12.46 4.93,11.81 5.33,11.4C5.73,11 6.4,11 6.79,11.4L8.45,13.05L9.04,10.8C9.18,10.24 9.75,9.92 10.29,10.07C10.85,10.21 11.17,10.78 11,11.33L10.42,13.58L12.67,13C13.22,12.83 13.79,13.15 13.93,13.71C14.08,14.25 13.76,14.82 13.2,14.96L10.95,15.55L12.6,17.21C13,17.6 13,18.27 12.6,18.67C12.2,19.07 11.54,19.07 11.15,18.67L9.5,17L8.89,19.27C8.75,19.83 8.18,20.14 7.64,20C7.08,19.86 6.77,19.29 6.91,18.74L7.5,16.5L5.26,17.09C4.71,17.23 4.14,16.92 4,16.36M1,10A5,5 0 0,1 6,5C7,2.65 9.3,1 12,1C15.43,1 18.24,3.66 18.5,7.03L19,7A4,4 0 0,1 23,11A4,4 0 0,1 19,15A1,1 0 0,1 18,14A1,1 0 0,1 19,13A2,2 0 0,0 21,11A2,2 0 0,0 19,9H17V8A5,5 0 0,0 12,3C9.5,3 7.45,4.82 7.06,7.19C6.73,7.07 6.37,7 6,7A3,3 0 0,0 3,10C3,10.85 3.35,11.61 3.91,12.16C4.27,12.55 4.26,13.16 3.88,13.54C3.5,13.93 2.85,13.93 2.47,13.54C1.56,12.63 1,11.38 1,10M14.03,20.43C14.13,20.82 14.5,21.04 14.91,20.94L16.5,20.5L16.06,22.09C15.96,22.5 16.18,22.87 16.57,22.97C16.95,23.08 17.35,22.85 17.45,22.46L17.86,20.89L19.03,22.05C19.3,22.33 19.77,22.33 20.05,22.05C20.33,21.77 20.33,21.3 20.05,21.03L18.89,19.86L20.46,19.45C20.85,19.35 21.08,18.95 20.97,18.57C20.87,18.18 20.5,17.96 20.09,18.06L18.5,18.5L18.94,16.91C19.04,16.5 18.82,16.13 18.43,16.03C18.05,15.92 17.65,16.15 17.55,16.54L17.14,18.11L15.97,16.95C15.7,16.67 15.23,16.67 14.95,16.95C14.67,17.24 14.67,17.7 14.95,17.97L16.11,19.14L14.54,19.55C14.15,19.65 13.92,20.05 14.03,20.43Z",
    "hail":            "M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M10,18A2,2 0 0,1 12,20A2,2 0 0,1 10,22A2,2 0 0,1 8,20A2,2 0 0,1 10,18M14.5,16A1.5,1.5 0 0,1 16,17.5A1.5,1.5 0 0,1 14.5,19A1.5,1.5 0 0,1 13,17.5A1.5,1.5 0 0,1 14.5,16M10.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,15A1.5,1.5 0 0,1 9,13.5A1.5,1.5 0 0,1 10.5,12Z",
    "lightning":       "M6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14H7A1,1 0 0,1 8,15A1,1 0 0,1 7,16H6M12,11H15L13,15H15L11.25,22L12,17H9.5L12,11Z",
    "lightning-rainy": "M4.5,13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.44 4,15.6 3.5,15.33V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A1,1 0 0,1 18,15A1,1 0 0,1 19,14A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59M9.5,11H12.5L10.5,15H12.5L8.75,22L9.5,17H7L9.5,11M17.5,18.67C17.5,19.96 16.5,21 15.25,21C14,21 13,19.96 13,18.67C13,17.12 15.25,14.5 15.25,14.5C15.25,14.5 17.5,17.12 17.5,18.67Z",
    "windy":           "M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",
    "windy-variant":   "M6,6L6.69,6.06C7.32,3.72 9.46,2 12,2A5.5,5.5 0 0,1 17.5,7.5L17.42,8.45C17.88,8.16 18.42,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H6A4,4 0 0,1 2,10A4,4 0 0,1 6,6M6,8A2,2 0 0,0 4,10A2,2 0 0,0 6,12H19A1,1 0 0,0 20,11A1,1 0 0,0 19,10H15.5V7.5A3.5,3.5 0 0,0 12,4A3.5,3.5 0 0,0 8.5,7.5V8H6M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",
    "exceptional":     "M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z",
  };
  const _NDL_COND_DEFAULT = _NDL_COND_PATHS["cloudy"];

  function _ndlCondSvg(condition, size, color) {
    const d = _NDL_COND_PATHS[condition] ?? _NDL_COND_DEFAULT;
    const fill = color ? ` style="color:${color}"` : "";
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false"${fill}><path d="${d}" fill="currentColor"/></svg>`;
  }

  const _NDL_SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const WEATHER_STYLES = /* css */`
    ${NODALIA_BASE}
    ${_glowOverlayCSS()}

    @keyframes ndl-chip-pop {
      0%   { transform: scale(0.7); opacity: 0; }
      70%  { transform: scale(1.05); }
      100% { transform: scale(1);   opacity: 1; }
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
      overflow: hidden;
    }

    .ndl-weather-hero {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .ndl-weather-temp {
      display: flex;
      align-items: baseline;
      gap: 2px;
      line-height: 1;
    }

    .ndl-weather-num {
      font-size: 44px;
      font-weight: 700;
      color: var(--ndl-fg, #1a1a2e);
      letter-spacing: -0.02em;
      line-height: 1;
      transition: color 0.4s ease;
    }

    .ndl-weather-unit {
      font-size: 18px;
      font-weight: 400;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.6;
    }

    .ndl-weather-cond {
      font-size: 14px;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.75;
      text-transform: capitalize;
      margin-left: auto;
    }

    .ndl-weather-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .ndl-weather-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(255,255,255,0.35);
      border: 1px solid var(--ndl-weather-accent-18, rgba(255,255,255,0.4));
      font-size: 11px;
      font-weight: 500;
      color: var(--ndl-fg, #1a1a2e);
      backdrop-filter: blur(4px);
      animation: ndl-chip-pop 0.35s ease both;
    }

    .ndl-weather-chip svg {
      opacity: 0.75;
    }

    .ndl-forecast-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 16px;
      background: rgba(255,255,255,0.25);
      font-size: 11px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      cursor: pointer;
      font-family: inherit;
      backdrop-filter: blur(4px);
      transition: background 0.15s ease;
    }
    .ndl-forecast-toggle:hover {
      background: rgba(255,255,255,0.45);
    }
    .ndl-forecast-toggle:empty { display: none; }

    .ndl-forecast-strip {
      min-width: 0;
      width: 100%;
    }
    .ndl-forecast-strip:empty { display: none; }

    .ndl-forecast-strip[data-mode=daily] {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      padding: 4px 0 6px;
    }
    .ndl-forecast-strip[data-mode=hourly] {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 4px 0 6px;
      scrollbar-width: none;
      width: 0;
      min-width: 100%;
    }
    .ndl-forecast-strip[data-mode=hourly]::-webkit-scrollbar { display: none; }

    .ndl-forecast-scroll-track {
      width: 100%;
      align-self: stretch;
      height: 3px;
      border-radius: 2px;
      background: rgba(0,0,0,0.10);
      position: relative;
      cursor: pointer;
    }
    .ndl-forecast-scroll-track[hidden] { display: none; }
    .ndl-forecast-scroll-thumb {
      position: absolute;
      top: 0;
      height: 100%;
      border-radius: 2px;
      background: rgba(0,0,0,0.30);
      transition: left 80ms linear;
      cursor: grab;
      user-select: none;
    }
    .ndl-forecast-scroll-thumb:active { cursor: grabbing; }

    .ndl-forecast-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 6px;
      border-radius: 18px;
      background: rgba(255,255,255,0.30);
      border: 1px solid rgba(255,255,255,0.40);
      backdrop-filter: blur(6px);
      animation: ndl-fade-up 0.35s cubic-bezier(0.22, 0.84, 0.26, 1) both;
      min-width: 52px;
      flex: 0 0 auto;
    }
    .ndl-forecast-strip[data-mode=daily] .ndl-forecast-day {
      flex: 1;
      min-width: 0;
    }

    .ndl-forecast-day-name {
      font-size: 11px;
      font-weight: 700;
      color: var(--ndl-fg, #1a1a2e);
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .ndl-forecast-temps {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ndl-fg, #1a1a2e);
      white-space: nowrap;
    }

    .ndl-forecast-temp-hi {
      font-weight: 700;
    }

    .ndl-forecast-temp-lo {
      font-size: 10px;
      font-weight: 400;
      opacity: 0.50;
    }

    @media (prefers-reduced-motion: reduce) {
      [part=card] * { transition: none !important; animation: none !important; }
    }
  `;

  class WeatherCard extends BaseCard {
    /** @type {HTMLElement|null} */ #card            = null;
    /** @type {HTMLElement|null} */ #numEl           = null;
    /** @type {HTMLElement|null} */ #unitEl          = null;
    /** @type {HTMLElement|null} */ #condEl          = null;
    /** @type {HTMLElement|null} */ #humidityEl      = null;
    /** @type {HTMLElement|null} */ #windEl          = null;
    /** @type {HTMLElement|null} */ #pressureEl      = null;
    /** @type {HTMLElement|null} */ #forecastEl      = null;
    /** @type {HTMLElement|null} */ #tabsEl          = null;
    /** @type {HTMLElement|null} */ #scrollTrackEl   = null;
    /** @type {HTMLElement|null} */ #scrollThumbEl   = null;
    get #forecastMode() { return this.config._forecastMode ?? "daily"; }
    set #forecastMode(v) { this.config._forecastMode = v; }
    #forecastDaily  = null;
    #forecastHourly = null;

    static #HUMIDITY_PATH = "M12,3.77L11.25,4.61C11.25,4.61 9.97,6.06 8.68,7.94C7.39,9.82 6,12.07 6,14.23A6,6 0 0,0 12,20.23A6,6 0 0,0 18,14.23C18,12.07 16.61,9.82 15.32,7.94C14.03,6.06 12.75,4.61 12.75,4.61L12,3.77M12,1A1,1 0 0,1 13,2L13,2.01C13,2.01 14.35,3.56 15.72,5.55C17.09,7.54 18.5,9.93 18.5,12.5A6.5,6.5 0 0,1 12,19A6.5,6.5 0 0,1 5.5,12.5C5.5,9.93 6.91,7.54 8.28,5.55C9.65,3.56 11,2.01 11,2.01L11,2A1,1 0 0,1 12,1Z";
    static #WIND_PATH     = "M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z";
    static #PRESSURE_PATH = "M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.4 19,16.5 17.3,18C15.9,16.7 14,16 12,16C10,16 8.2,16.7 6.7,18C5,16.5 4,14.4 4,12A8,8 0 0,1 12,4M14,5.89C13.62,5.9 13.26,6.15 13.1,6.54L11.58,10C10.6,10.18 9.81,10.79 9.4,11.6L6.27,11.29C5.82,11.25 5.4,11.54 5.29,11.97C5.18,12.41 5.4,12.86 5.82,13.04L8.88,14.31C9.16,15.29 9.93,16.08 10.92,16.35L11.28,19.39C11.33,19.83 11.7,20.16 12.14,20.16C12.18,20.16 12.22,20.16 12.27,20.15C12.75,20.09 13.1,19.66 13.04,19.18L12.68,16.19C13.55,15.8 14.15,14.96 14.21,14H17.58C18.05,14 18.44,13.62 18.44,13.14C18.44,12.67 18.05,12.29 17.58,12.29H14.21C14.15,11.74 13.93,11.24 13.59,10.84L15.07,7.42C15.27,6.97 15.07,6.44 14.63,6.24C14.43,6 14.21,5.88 14,5.89Z";

    static #chipSvg(path) {
      return `<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path d="${path}" fill="currentColor"/></svg>`;
    }

    render() {
      this.root.innerHTML = /* html */`
        <style>${this.getSharedStyles()}${WEATHER_STYLES}${COMPANION_DOT_STYLES}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-icon" aria-hidden="true"></span>
            <span part="card-name">${_esc(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="ndl-weather-hero">
              <div class="ndl-weather-temp">
                <span class="ndl-weather-num" aria-live="polite">--</span>
                <span class="ndl-weather-unit"></span>
              </div>
              <span class="ndl-weather-cond">--</span>
            </div>
            <div class="ndl-weather-chips">
              <span class="ndl-weather-chip" data-stat="humidity">
                ${WeatherCard.#chipSvg(WeatherCard.#HUMIDITY_PATH)}
                <span data-value>--</span>
              </span>
              <span class="ndl-weather-chip" data-stat="wind" style="animation-delay:60ms">
                ${WeatherCard.#chipSvg(WeatherCard.#WIND_PATH)}
                <span data-value>--</span>
              </span>
              <span class="ndl-weather-chip" data-stat="pressure" style="animation-delay:120ms">
                ${WeatherCard.#chipSvg(WeatherCard.#PRESSURE_PATH)}
                <span data-value>--</span>
              </span>
            </div>
            <button class="ndl-forecast-toggle" type="button"></button>
            <div class="ndl-forecast-strip" data-mode="daily" role="list" aria-label="Forecast"></div>
            <div class="ndl-forecast-scroll-track" hidden><div class="ndl-forecast-scroll-thumb"></div></div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `;

      this.#card          = this.root.querySelector("[part=card]");
      this.#numEl         = this.root.querySelector(".ndl-weather-num");
      this.#unitEl        = this.root.querySelector(".ndl-weather-unit");
      this.#condEl        = this.root.querySelector(".ndl-weather-cond");
      this.#humidityEl    = this.root.querySelector("[data-stat=humidity] [data-value]");
      this.#windEl        = this.root.querySelector("[data-stat=wind] [data-value]");
      this.#pressureEl    = this.root.querySelector("[data-stat=pressure] [data-value]");
      this.#forecastEl    = this.root.querySelector(".ndl-forecast-strip");
      this.#tabsEl        = this.root.querySelector(".ndl-forecast-toggle");
      this.#scrollTrackEl = this.root.querySelector(".ndl-forecast-scroll-track");
      this.#scrollThumbEl = this.root.querySelector(".ndl-forecast-scroll-thumb");

      if (this.#forecastEl) {
        this.#forecastEl.addEventListener("scroll", () => this.#syncScrollThumb(), { passive: true });
      }
      if (this.#scrollTrackEl) {
        this.#scrollTrackEl.addEventListener("pointerdown", (e) => this.#onTrackPointerDown(e));
      }

      _applyCardGradient(this.#card, _COND_COLORS_DEFAULT, true);
      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:weather-cloudy"), "card-icon");
      this.renderCompanions();
      _applyCompanionTooltips(this.root);
    }

    applyState(state, attributes) {
      const condition = state || "cloudy";
      const colors = _condColors(condition);

      _applyCardGradient(this.#card, colors, true);
      this.#card.style.setProperty("--ndl-weather-accent-18", `color-mix(in srgb, ${colors.accent} 18%, transparent)`);

      const condLabel = this.i18n.t(`weather.${condition}`) !== `weather.${condition}`
        ? this.i18n.t(`weather.${condition}`)
        : condition.replace(/-/g, " ");
      if (this.#condEl) this.#condEl.textContent = condLabel;

      const temp = attributes.temperature ?? attributes.native_temperature;
      const tempUnit = attributes.temperature_unit ?? "";
      if (this.#numEl) {
        const rounded = temp != null ? Math.round(Number(temp)) : null;
        this.#numEl.textContent = rounded != null ? String(rounded) : "--";
      }
      if (this.#unitEl) this.#unitEl.textContent = tempUnit ? ` ${tempUnit}` : "";

      if (this.#humidityEl) {
        const h = attributes.humidity;
        this.#humidityEl.textContent = h != null ? `${h}%` : "--";
      }
      if (this.#windEl) {
        const w = attributes.wind_speed;
        const wu = attributes.wind_speed_unit ?? "";
        this.#windEl.textContent = w != null ? `${w} ${wu}`.trim() : "--";
      }
      if (this.#pressureEl) {
        const p = attributes.pressure;
        const pu = attributes.pressure_unit ?? "";
        this.#pressureEl.textContent = p != null ? `${p} ${pu}`.trim() : "--";
      }

      this.renderIcon(this.resolveIcon(this.def.icon, "mdi:weather-cloudy"), "card-icon");

      const show = (this.config.displayHints ?? this.def.display_hints ?? {}).show_forecast === true;
      this.#forecastDaily  = show ? (attributes.forecast_daily  ?? attributes.forecast ?? null) : null;
      this.#forecastHourly = show ? (attributes.forecast_hourly ?? null) : null;

      this.#buildTabs(colors.accent);
      this.#renderActiveForecast(colors.accent);

      this.announceState(
        `${this.def.friendly_name}, ${condLabel}, ${temp != null ? temp : "--"} ${tempUnit}`,
      );
    }

    #buildTabs(accent) {
      if (!this.#tabsEl) return;
      const hasDaily  = Array.isArray(this.#forecastDaily)  && this.#forecastDaily.length > 0;
      const hasHourly = Array.isArray(this.#forecastHourly) && this.#forecastHourly.length > 0;

      if (!hasDaily && !hasHourly) {
        this.#tabsEl.textContent = "";
        return;
      }
      if (hasDaily && !hasHourly) { this.#forecastMode = "daily"; }
      if (!hasDaily && hasHourly) { this.#forecastMode = "hourly"; }

      if (hasDaily && hasHourly) {
        this.#tabsEl.textContent = this.#forecastMode === "daily" ? "Hourly" : "5-Day";
        this.#tabsEl.onclick = () => {
          this.#forecastMode = this.#forecastMode === "daily" ? "hourly" : "daily";
          this.#buildTabs(accent);
          this.#renderActiveForecast(accent);
        };
      } else {
        this.#tabsEl.textContent = "";
        this.#tabsEl.onclick = null;
      }
    }

    #renderActiveForecast(accent) {
      if (!this.#forecastEl) return;
      const data = this.#forecastMode === "hourly" ? this.#forecastHourly : this.#forecastDaily;
      this.#forecastEl.setAttribute("data-mode", this.#forecastMode);

      if (!Array.isArray(data) || data.length === 0) {
        this.#forecastEl.innerHTML = "";
        if (this.#scrollTrackEl) this.#scrollTrackEl.hidden = true;
        return;
      }

      const items = this.#forecastMode === "daily" ? data.slice(0, 5) : data;
      this.#forecastEl.innerHTML = items.map((day, i) => {
        const dt = new Date(day.datetime);
        let label;
        if (this.#forecastMode === "hourly") {
          label = dt.toLocaleTimeString([], { hour: "numeric" });
        } else {
          label = _NDL_SHORT_DAYS[dt.getDay()] ?? "";
        }
        const hi = (day.temperature ?? day.native_temperature) != null
          ? Math.round(day.temperature ?? day.native_temperature) : "--";
        const lo = (day.templow ?? day.native_templow) != null
          ? Math.round(day.templow ?? day.native_templow) : null;
        const iconSvg = _ndlCondSvg(day.condition || "cloudy", 22, accent ?? null);
        return /* html */`
          <div class="ndl-forecast-day" role="listitem" style="animation-delay:${i * 60}ms">
            <span class="ndl-forecast-day-name">${_esc(String(label))}</span>
            ${iconSvg}
            <span class="ndl-forecast-temps">
              <span class="ndl-forecast-temp-hi">${_esc(String(hi))}</span>${lo != null ? `<span class="ndl-forecast-temp-lo">${_esc(String(lo))}</span>` : ""}
            </span>
          </div>`;
      }).join("");

      if (this.#forecastMode === "hourly") {
        requestAnimationFrame(() => this.#syncScrollThumb());
      } else if (this.#scrollTrackEl) {
        this.#scrollTrackEl.hidden = true;
      }
    }

    #syncScrollThumb() {
      const strip = this.#forecastEl;
      const track = this.#scrollTrackEl;
      const thumb = this.#scrollThumbEl;
      if (!strip || !track || !thumb) return;
      const ratio = strip.scrollWidth > strip.clientWidth
        ? strip.clientWidth / strip.scrollWidth
        : 1;
      if (ratio >= 1) {
        track.hidden = true;
        return;
      }
      track.hidden = false;
      const trackW = track.clientWidth;
      const thumbW = Math.max(24, ratio * trackW);
      const maxLeft = trackW - thumbW;
      const scrollRatio = strip.scrollLeft / (strip.scrollWidth - strip.clientWidth);
      thumb.style.width = `${thumbW}px`;
      thumb.style.left  = `${scrollRatio * maxLeft}px`;
    }

    #onTrackPointerDown(e) {
      const strip = this.#forecastEl;
      const track = this.#scrollTrackEl;
      const thumb = this.#scrollThumbEl;
      if (!strip || !track || !thumb) return;
      e.preventDefault();
      const trackRect = track.getBoundingClientRect();
      const thumbW = parseFloat(thumb.style.width) || 24;

      const scrollTo = (clientX) => {
        const relX = clientX - trackRect.left - thumbW / 2;
        const maxLeft = trackRect.width - thumbW;
        const ratio = Math.max(0, Math.min(1, relX / maxLeft));
        strip.scrollLeft = ratio * (strip.scrollWidth - strip.clientWidth);
      };

      scrollTo(e.clientX);

      const onMove = (ev) => scrollTo(ev.clientX);
      const onUp   = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup",   onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup",   onUp);
    }
  }

  // ---------------------------------------------------------------------------
  // Register all Nodalia renderers
  // ---------------------------------------------------------------------------

  HArvest._packs = HArvest._packs || {};
  const _packKey = (document.currentScript && document.currentScript.dataset.packId) || "nodalia";
  HArvest._packs[_packKey] = {
    "light":          LightCard,
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
    "weather":        WeatherCard,
    "generic":        GenericCard,
    _capabilities: {
      fan:          { display_modes: ["on-off"] },
      input_number: { display_modes: ["slider", "buttons"] },
      light:        { features: ["brightness", "color_temp", "rgb"] },
      climate:      { features: ["hvac_modes", "presets", "fan_mode", "swing_mode"] },
      cover:        { features: ["position", "tilt"] },
      media_player: { features: ["transport", "volume", "source"] },
    },
  };
})();
