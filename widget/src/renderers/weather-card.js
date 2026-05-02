/**
 * renderers/weather-card.js - Renderer for weather entities.
 *
 * Displays current conditions: condition icon, temperature, condition label,
 * and detail stats (humidity, wind speed, pressure). Forecast section supports
 * daily (5-day, no scroll) and hourly (8+ items, horizontal scroll) tabs.
 */

import { BaseCard } from "./base-card.js";
import { renderIconSVG } from "../icons.js";

const CONDITION_ICONS = {
  "sunny":            "mdi:weather-sunny",
  "clear-night":      "mdi:weather-night",
  "partlycloudy":     "mdi:weather-partly-cloudy",
  "cloudy":           "mdi:weather-cloudy",
  "fog":              "mdi:weather-fog",
  "rainy":            "mdi:weather-rainy",
  "pouring":          "mdi:weather-pouring",
  "snowy":            "mdi:weather-snowy",
  "snowy-rainy":      "mdi:weather-snowy-heavy",
  "hail":             "mdi:weather-hail",
  "lightning":        "mdi:weather-lightning",
  "lightning-rainy":  "mdi:weather-lightning-rainy",
  "windy":            "mdi:weather-windy",
  "windy-variant":    "mdi:weather-windy-variant",
  "exceptional":      "mdi:alert-circle-outline",
};

const WEATHER_STYLES = /* css */`
  [part=card-body] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--hrv-spacing-xs);
    padding: var(--hrv-spacing-xs) 0;
    min-width: 0;
    overflow: hidden;
  }

  [part=weather-main] {
    display: flex;
    align-items: center;
    gap: var(--hrv-spacing-m);
  }

  [part=weather-icon] {
    width: 48px;
    height: 48px;
    color: var(--hrv-color-state-on);
    flex-shrink: 0;
  }

  [part=weather-icon] svg {
    width: 100%;
    height: 100%;
  }

  [part=weather-temp] {
    font-size: 2.25rem;
    font-weight: var(--hrv-font-weight-bold);
    color: var(--hrv-color-text);
    line-height: 1;
  }

  [part=weather-temp-unit] {
    font-size: var(--hrv-font-size-l);
    font-weight: var(--hrv-font-weight-normal);
    color: var(--hrv-color-text-secondary);
  }

  [part=weather-condition] {
    font-size: var(--hrv-font-size-m);
    color: var(--hrv-color-text-secondary);
    text-transform: capitalize;
  }

  [part=weather-details] {
    display: flex;
    justify-content: center;
    gap: var(--hrv-spacing-l);
    width: 100%;
    padding-top: var(--hrv-spacing-xs);
    border-top: 1px solid var(--hrv-color-border);
  }

  [part=weather-stat] {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--hrv-font-size-s);
    color: var(--hrv-color-text-secondary);
  }

  [part=weather-stat] svg {
    width: 16px;
    height: 16px;
    color: var(--hrv-color-icon);
    flex-shrink: 0;
  }

  [part=forecast-toggle] {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border: 1px solid var(--hrv-color-border);
    border-radius: var(--hrv-radius-s);
    background: none;
    font-size: var(--hrv-font-size-xs);
    font-weight: var(--hrv-font-weight-medium);
    color: var(--hrv-color-text-secondary);
    cursor: pointer;
    font-family: inherit;
  }
  [part=forecast-toggle]:hover {
    background: var(--hrv-color-border);
  }
  [part=forecast-toggle]:empty { display: none; }

  [part=forecast-strip] {
    width: 100%;
    padding-top: var(--hrv-spacing-xs);
    border-top: 1px solid var(--hrv-color-border);
  }
  [part=forecast-strip]:empty {
    display: none;
  }

  [part=forecast-strip][data-mode=daily] {
    display: flex;
    justify-content: space-between;
    gap: var(--hrv-spacing-xs);
  }
  [part=forecast-strip][data-mode=daily] [part=forecast-day] {
    flex: 1;
    min-width: 0;
  }
  [part=forecast-strip][data-mode=hourly] {
    display: flex;
    gap: var(--hrv-spacing-xs);
    overflow-x: auto;
    scrollbar-width: none;
    width: 0;
    min-width: 100%;
  }
  [part=forecast-strip][data-mode=hourly]::-webkit-scrollbar { display: none; }

  [part=forecast-day] {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex: 0 0 auto;
    min-width: 52px;
  }

  [part=forecast-day-name] {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text-secondary);
    font-weight: var(--hrv-font-weight-medium);
  }

  [part=forecast-day] svg {
    width: 20px;
    height: 20px;
    color: var(--hrv-color-icon);
  }

  [part=forecast-temps] {
    font-size: var(--hrv-font-size-xs);
    color: var(--hrv-color-text);
    white-space: nowrap;
  }

  [part=forecast-temp-low] {
    color: var(--hrv-color-text-secondary);
  }

  [part=forecast-scroll-track] {
    width: 100%;
    align-self: stretch;
    height: 3px;
    border-radius: 2px;
    background: var(--hrv-color-border);
    position: relative;
    margin-top: 4px;
    cursor: pointer;
  }
  [part=forecast-scroll-track][hidden] { display: none; }
  [part=forecast-scroll-thumb] {
    position: absolute;
    top: 0;
    height: 100%;
    border-radius: 2px;
    background: var(--hrv-color-text-secondary);
    transition: left 80ms linear;
  }

  @media (prefers-reduced-motion: reduce) {
    [part=card] * { transition: none !important; }
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

function _conditionIcon(condition) {
  return CONDITION_ICONS[condition] ?? "mdi:weather-cloudy";
}

const _SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export class WeatherCard extends BaseCard {
  /** @type {HTMLElement|null} */ #iconEl     = null;
  /** @type {HTMLElement|null} */ #tempEl     = null;
  /** @type {HTMLElement|null} */ #condEl     = null;
  /** @type {HTMLElement|null} */ #humidityEl = null;
  /** @type {HTMLElement|null} */ #windEl     = null;
  /** @type {HTMLElement|null} */ #pressureEl = null;
  /** @type {HTMLElement|null} */ #forecastEl = null;
  /** @type {HTMLElement|null} */ #tabsEl     = null;
  /** @type {HTMLElement|null} */ #scrollTrackEl = null;
  /** @type {HTMLElement|null} */ #scrollThumbEl = null;
  get #forecastMode() { return this.config._forecastMode ?? "daily"; }
  set #forecastMode(v) { this.config._forecastMode = v; }
  #forecastDaily  = null;
  #forecastHourly = null;

  render() {
    this.root.innerHTML = /* html */`
      <style>${this.getSharedStyles()}${WEATHER_STYLES}</style>
      <div part="card">
        <div part="card-header">
          <span part="card-icon" aria-hidden="true"></span>
          <span part="card-name">${_esc(this.def.friendly_name)}</span>
        </div>
        <div part="card-body">
          <div part="weather-main">
            <span part="weather-icon" aria-hidden="true"></span>
            <span part="weather-temp">
              --<span part="weather-temp-unit"></span>
            </span>
          </div>
          <span part="weather-condition" aria-live="polite">--</span>
          <div part="weather-details">
            <span part="weather-stat" data-stat="humidity">
              ${renderIconSVG("mdi:water-percent", "stat-icon")}
              <span data-value>--</span>
            </span>
            <span part="weather-stat" data-stat="wind">
              ${renderIconSVG("mdi:weather-windy", "stat-icon")}
              <span data-value>--</span>
            </span>
            <span part="weather-stat" data-stat="pressure">
              ${renderIconSVG("mdi:gauge", "stat-icon")}
              <span data-value>--</span>
            </span>
          </div>
          <button part="forecast-toggle" type="button"></button>
          <div part="forecast-strip" data-mode="daily" role="list" aria-label="${this.i18n.t("weather.forecast")}"></div>
          <div part="forecast-scroll-track" hidden><div part="forecast-scroll-thumb"></div></div>
        </div>
        ${this.renderHistoryZoneHTML()}
        ${this.renderAriaLiveHTML()}
        ${this.renderCompanionZoneHTML()}
        <div part="stale-indicator" aria-hidden="true"></div>
      </div>
    `;

    this.#iconEl     = this.root.querySelector("[part=weather-icon]");
    this.#tempEl     = this.root.querySelector("[part=weather-temp]");
    this.#condEl     = this.root.querySelector("[part=weather-condition]");
    this.#humidityEl = this.root.querySelector("[part=weather-stat][data-stat=humidity] [data-value]");
    this.#windEl     = this.root.querySelector("[part=weather-stat][data-stat=wind] [data-value]");
    this.#pressureEl = this.root.querySelector("[part=weather-stat][data-stat=pressure] [data-value]");
    this.#forecastEl = this.root.querySelector("[part=forecast-strip]");
    this.#tabsEl     = this.root.querySelector("[part=forecast-toggle]");
    this.#scrollTrackEl = this.root.querySelector("[part=forecast-scroll-track]");
    this.#scrollThumbEl = this.root.querySelector("[part=forecast-scroll-thumb]");

    if (this.#forecastEl) {
      this.#forecastEl.addEventListener("scroll", () => this.#syncScrollThumb(), { passive: true });
    }
    if (this.#scrollTrackEl) {
      this.#scrollTrackEl.addEventListener("pointerdown", (e) => this.#onTrackPointerDown(e));
    }

    this.renderIcon(this.def.icon ?? "mdi:weather-cloudy", "card-icon");
    this.renderCompanions();
    this._attachGestureHandlers(this.root.querySelector("[part=card]"));
  }

  applyState(state, attributes) {
    const condition = state || "cloudy";
    const iconName = _conditionIcon(condition);

    if (this.#iconEl) {
      this.#iconEl.innerHTML = renderIconSVG(iconName, "weather-icon-svg");
    }

    const condLabel = this.i18n.t(`weather.${condition}`) !== `weather.${condition}`
      ? this.i18n.t(`weather.${condition}`)
      : condition.replace(/-/g, " ");
    if (this.#condEl) this.#condEl.textContent = condLabel;

    const temp = attributes.temperature ?? attributes.native_temperature;
    const tempUnit = attributes.temperature_unit ?? "";
    if (this.#tempEl) {
      const unitEl = this.#tempEl.querySelector("[part=weather-temp-unit]");
      this.#tempEl.firstChild.textContent = temp != null ? Math.round(Number(temp)) : "--";
      if (unitEl) unitEl.textContent = tempUnit ? ` ${tempUnit}` : "";
    }

    const headerIcon = this.def.icon_state_map?.[state] ?? this.def.icon ?? iconName;
    this.renderIcon(headerIcon, "card-icon");

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

    const show = (this.config.displayHints ?? this.def.display_hints ?? {}).show_forecast === true;
    this.#forecastDaily  = show ? (attributes.forecast_daily  ?? attributes.forecast ?? null) : null;
    this.#forecastHourly = show ? (attributes.forecast_hourly ?? null) : null;

    this.#buildTabs();
    this.#renderActiveForecast();

    this.announceState(
      `${this.def.friendly_name}, ${condLabel}, ${temp != null ? temp : "--"} ${tempUnit}`,
    );
  }

  #buildTabs() {
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
        this.#buildTabs();
        this.#renderActiveForecast();
      };
    } else {
      this.#tabsEl.textContent = "";
      this.#tabsEl.onclick = null;
    }
  }

  #renderActiveForecast() {
    if (!this.#forecastEl) return;
    const data = this.#forecastMode === "hourly" ? this.#forecastHourly : this.#forecastDaily;
    this.#forecastEl.setAttribute("data-mode", this.#forecastMode);

    if (!Array.isArray(data) || data.length === 0) {
      this.#forecastEl.innerHTML = "";
      if (this.#scrollTrackEl) this.#scrollTrackEl.hidden = true;
      return;
    }

    const items = this.#forecastMode === "daily" ? data.slice(0, 5) : data;
    this.#forecastEl.innerHTML = items.map(day => {
      const dt = new Date(day.datetime);
      let label;
      if (this.#forecastMode === "hourly") {
        label = dt.toLocaleTimeString([], { hour: "numeric" });
      } else {
        label = _SHORT_DAYS[dt.getDay()] ?? "";
      }
      const icon = _conditionIcon(day.condition);
      const hi = (day.temperature ?? day.native_temperature) != null
        ? Math.round(day.temperature ?? day.native_temperature) : "--";
      const lo = (day.templow ?? day.native_templow) != null
        ? Math.round(day.templow ?? day.native_templow) : null;

      return /* html */`
        <div part="forecast-day" role="listitem">
          <span part="forecast-day-name">${_esc(String(label))}</span>
          ${renderIconSVG(icon, "forecast-icon")}
          <span part="forecast-temps">
            ${_esc(String(hi))}${lo != null ? `/<span part="forecast-temp-low">${_esc(String(lo))}</span>` : ""}
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
      ? strip.clientWidth / strip.scrollWidth : 1;
    if (ratio >= 1) { track.hidden = true; return; }
    track.hidden = false;
    const trackW = track.clientWidth;
    const thumbW = Math.max(20, ratio * trackW);
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
    const thumbW = parseFloat(thumb.style.width) || 20;
    const scrollTo = (clientX) => {
      const relX = clientX - trackRect.left - thumbW / 2;
      const maxLeft = trackRect.width - thumbW;
      const r = Math.max(0, Math.min(1, relX / maxLeft));
      strip.scrollLeft = r * (strip.scrollWidth - strip.clientWidth);
    };
    scrollTo(e.clientX);
    const onMove = (ev) => scrollTo(ev.clientX);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
}
