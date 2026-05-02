/**
 * renderers/index.js - Renderer registry and lookup function.
 *
 * Provides:
 *   lookupRenderer(domain, deviceClass) -> typeof BaseCard
 *   registerRenderer(key, rendererClass)  - public API for third-party renderers
 *
 * Lookup priority:
 *   1. "{domain}.{device_class}" (specific key)
 *   2. "{domain}"                (domain-level key)
 *   3. "generic"                 (final fallback)
 *
 * registerRenderer() is last-write-wins. A console warning is emitted on
 * collision so contributors are aware their renderer is overriding an existing
 * entry (built-in or previously registered).
 */

import { BaseCard }               from "./base-card.js";
import { LightCard }              from "./light-card.js";
import { SwitchCard }             from "./switch-card.js";
import { FanCard }                from "./fan-card.js";
import { ClimateCard }            from "./climate-card.js";
import { CoverCard }              from "./cover-card.js";
import { MediaPlayerCard }        from "./media-player-card.js";
import { RemoteCard }             from "./remote-card.js";
import { TemperatureSensorCard }  from "./sensor-temperature-card.js";
import { HumiditySensorCard }     from "./sensor-humidity-card.js";
import { BatterySensorCard }      from "./sensor-battery-card.js";
import { GenericSensorCard }      from "./sensor-generic-card.js";
import { BinarySensorCard }       from "./binary-sensor-card.js";
import { InputBooleanCard }       from "./input-boolean-card.js";
import { InputNumberCard }        from "./input-number-card.js";
import { InputSelectCard }        from "./input-select-card.js";
import { HarvestActionCard }      from "./harvest-action-card.js";
import { TimerCard }              from "./timer-card.js";
import { WeatherCard }            from "./weather-card.js";
import { GenericCard }            from "./generic-card.js";

/**
 * Built-in renderer registry.
 * Keys are either "{domain}" or "{domain}.{device_class}".
 * @type {Map<string, typeof import("./base-card.js").BaseCard>}
 */
const _registry = new Map([
  // Tier 1 - fully supported domains
  ["light",                   LightCard],
  ["switch",                  SwitchCard],
  ["fan",                     FanCard],
  ["climate",                 ClimateCard],
  ["cover",                   CoverCard],
  ["media_player",            MediaPlayerCard],
  ["remote",                  RemoteCard],

  // Sensor variants - device_class specific keys take priority over "sensor"
  ["sensor.temperature",      TemperatureSensorCard],
  ["sensor.humidity",         HumiditySensorCard],
  ["sensor.battery",          BatterySensorCard],
  ["sensor",                  GenericSensorCard],

  // Binary sensor - always read-only
  ["binary_sensor",           BinarySensorCard],

  // Input helpers
  ["input_boolean",           InputBooleanCard],
  ["input_number",            InputNumberCard],
  ["input_select",            InputSelectCard],

  // Timer
  ["timer",                   TimerCard],

  // Weather
  ["weather",                 WeatherCard],

  // Virtual domain
  ["harvest_action",          HarvestActionCard],

  // Tier 2 fallback
  ["generic",                 GenericCard],
]);

/**
 * Return the renderer class for the given domain and optional device_class.
 *
 * @param {string}      domain
 * @param {string|null} deviceClass
 * @returns {typeof import("./base-card.js").BaseCard}
 */
export function lookupRenderer(domain, deviceClass) {
  const specificKey = deviceClass ? `${domain}.${deviceClass}` : null;
  return (
    (specificKey && _registry.get(specificKey)) ||
    _registry.get(domain) ||
    _registry.get("generic")
  );
}

/**
 * Register a custom renderer. Last-write-wins. Logs a warning on collision.
 *
 * @param {string} key - Domain or "domain.device_class" key
 * @param {typeof import("./base-card.js").BaseCard} rendererClass
 */
export function registerRenderer(key, rendererClass) {
  if (_registry.has(key)) {
    console.warn(
      `[HArvest] registerRenderer: overriding existing renderer for key "${key}"`,
    );
  }
  _registry.set(key, rendererClass);
}

export const _BUILTIN_CAPABILITIES = {
  fan:          { display_modes: ["on-off", "continuous", "stepped", "cycle"] },
  input_number: { display_modes: ["slider", "buttons"] },
  light:        { features: ["brightness", "color_temp", "rgb"] },
  climate:      { features: ["hvac_modes", "presets", "fan_mode", "swing_mode"] },
  cover:        { features: ["position", "tilt"] },
  media_player: { features: ["transport", "volume", "source"] },
};

// Re-export all renderer classes so they are accessible via
// window.HArvest.renderers (assembled in the build entry point).
export {
  BaseCard,
  LightCard,
  SwitchCard,
  FanCard,
  ClimateCard,
  CoverCard,
  MediaPlayerCard,
  RemoteCard,
  TemperatureSensorCard,
  HumiditySensorCard,
  BatterySensorCard,
  GenericSensorCard,
  BinarySensorCard,
  InputBooleanCard,
  InputNumberCard,
  InputSelectCard,
  HarvestActionCard,
  TimerCard,
  WeatherCard,
  GenericCard,
};
