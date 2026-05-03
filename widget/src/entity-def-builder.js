/**
 * Client-side entity definition builder.
 *
 * Ports the authoritative logic from entity_definition.py so the panel can
 * build entity definitions for mock previews without duplicating the mapping
 * tables in TSX code. For real entities, use the server API instead.
 */

// ---------------------------------------------------------------------------
// Domain -> bitmask bit -> feature string (matches entity_definition.py)
// ---------------------------------------------------------------------------

const FEATURE_FLAGS = {
  light: {
    1: "brightness", 2: "color_temp", 4: "effect",
    16: "flash", 32: "transition", 64: "transition", 128: "rgb_color", 1024: "white_value",
  },
  fan:   { 1: "set_speed", 2: "oscillate", 4: "direction", 8: "preset_mode" },
  cover: { 4: "set_position", 128: "set_tilt_position", 8: "stop" },
  climate: {
    1: "target_temperature", 2: "target_temperature_range",
    4: "fan_mode", 8: "preset_mode", 16: "swing_mode", 32: "aux_heat",
  },
  media_player: {
    1: "play_pause", 2: "next_track", 4: "previous_track",
    8: "volume_set", 16: "volume_step", 128: "turn_on", 256: "turn_off",
  },
  remote: { 1: "learn_command", 2: "delete_command" },
};

// ---------------------------------------------------------------------------
// Blocked attributes (matches entity_definition.py BLOCKED_ATTRIBUTES)
// ---------------------------------------------------------------------------

const BLOCKED_ATTRIBUTES = new Set([
  "supported_features",
  "supported_color_modes",
  "friendly_name",
  "attribution",
  "assumed_state",
  "editable",
  "id",
]);

const MAX_ATTRIBUTE_VALUE_BYTES = 8192;

// ---------------------------------------------------------------------------
// Domain icon defaults (matches entity_definition.py _DOMAIN_ICON_DEFAULTS)
// ---------------------------------------------------------------------------

const DOMAIN_ICON_DEFAULTS = {
  light:          { on: "mdi:lightbulb",            "*": "mdi:lightbulb-outline" },
  switch:         { on: "mdi:toggle-switch",         "*": "mdi:toggle-switch-off-outline" },
  fan:            { on: "mdi:fan",                   "*": "mdi:fan-off" },
  cover:          { open: "mdi:window-shutter-open", opening: "mdi:window-shutter-open",
                    closing: "mdi:window-shutter",   "*": "mdi:window-shutter" },
  climate:        { "*": "mdi:thermostat" },
  media_player:   { playing: "mdi:cast-connected", idle: "mdi:cast", off: "mdi:cast", "*": "mdi:cast" },
  remote:         { on: "mdi:remote",               "*": "mdi:remote" },
  input_boolean:  { on: "mdi:toggle-switch",         "*": "mdi:toggle-switch-off-outline" },
  input_number:   { "*": "mdi:numeric" },
  input_select:   { "*": "mdi:format-list-bulleted" },
  sensor:         { "*": "mdi:gauge" },
  binary_sensor:  { on: "mdi:radiobox-marked",       "*": "mdi:radiobox-blank" },
  harvest_action: { triggered: "mdi:play-circle",    "*": "mdi:play-circle-outline" },
  timer:          { active: "mdi:timer", paused: "mdi:timer-pause", "*": "mdi:timer-outline" },
  weather: {
    sunny:           "mdi:weather-sunny",
    "clear-night":   "mdi:weather-night",
    partlycloudy:    "mdi:weather-partly-cloudy",
    cloudy:          "mdi:weather-cloudy",
    fog:             "mdi:weather-fog",
    rainy:           "mdi:weather-rainy",
    pouring:         "mdi:weather-pouring",
    snowy:           "mdi:weather-snowy",
    "snowy-rainy":   "mdi:weather-snowy-heavy",
    hail:            "mdi:weather-hail",
    lightning:       "mdi:weather-lightning",
    "lightning-rainy":"mdi:weather-lightning-rainy",
    windy:           "mdi:weather-windy",
    "windy-variant": "mdi:weather-windy-variant",
    exceptional:     "mdi:alert-circle-outline",
    "*":             "mdi:weather-cloudy",
  },
};

const BINARY_SENSOR_DC_ICONS = {
  motion:       { on: "mdi:motion-sensor",                    "*": "mdi:motion-sensor-off" },
  door:         { on: "mdi:door-open",                        "*": "mdi:door-closed" },
  window:       { on: "mdi:window-open",                      "*": "mdi:window-closed" },
  lock:         { on: "mdi:lock-open",                        "*": "mdi:lock" },
  connectivity: { on: "mdi:wifi",                             "*": "mdi:wifi-off" },
  moisture:     { on: "mdi:water",                            "*": "mdi:water-off" },
  smoke:        { on: "mdi:smoke-detector-variant-alert",     "*": "mdi:smoke-detector-variant" },
  presence:     { on: "mdi:home",                             "*": "mdi:home-outline" },
};

const SENSOR_DC_ICONS = {
  temperature:    "mdi:thermometer",
  humidity:       "mdi:water-percent",
  battery:        "mdi:battery",
  illuminance:    "mdi:brightness-5",
  pressure:       "mdi:gauge",
  power:          "mdi:flash",
  energy:         "mdi:lightning-bolt",
  voltage:        "mdi:sine-wave",
  current:        "mdi:current-ac",
  carbon_dioxide: "mdi:molecule-co2",
  pm25:           "mdi:air-filter",
};

// ---------------------------------------------------------------------------
// Tier / renderer maps (matches entity_compatibility.py)
// ---------------------------------------------------------------------------

const TIER1_DOMAINS = {
  light:          "LightCard",
  switch:         "SwitchCard",
  fan:            "FanCard",
  climate:        "ClimateCard",
  cover:          "CoverCard",
  media_player:   "MediaPlayerCard",
  remote:         "RemoteCard",
  sensor:         "GenericSensorCard",
  binary_sensor:  "BinarySensorCard",
  input_boolean:  "InputBooleanCard",
  input_number:   "InputNumberCard",
  input_select:   "InputSelectCard",
  harvest_action: "HarvestActionCard",
  timer:          "TimerCard",
  weather:        "WeatherCard",
};

const SENSOR_DEVICE_CLASS_RENDERERS = {
  temperature: "TemperatureSensorCard",
  humidity:    "HumiditySensorCard",
  battery:     "BatterySensorCard",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function decodeSupportedFeatures(domain, bitmask) {
  const flags = FEATURE_FLAGS[domain];
  if (!flags || !bitmask) return [];
  const result = [];
  for (const [bit, name] of Object.entries(flags)) {
    if (bitmask & Number(bit)) result.push(name);
  }
  return result;
}

function buildIconStateMap(domain, state, deviceClass, iconOverride) {
  if (iconOverride) {
    return { "*": iconOverride };
  }
  if (domain === "binary_sensor" && deviceClass && BINARY_SENSOR_DC_ICONS[deviceClass]) {
    return { ...BINARY_SENSOR_DC_ICONS[deviceClass] };
  }
  if (domain === "sensor" && deviceClass && SENSOR_DC_ICONS[deviceClass]) {
    return { "*": SENSOR_DC_ICONS[deviceClass] };
  }
  const defaults = DOMAIN_ICON_DEFAULTS[domain];
  if (defaults) return { ...defaults };
  return { "*": "mdi:help-circle" };
}

function buildFeatureConfig(domain, attributes) {
  if (domain === "light") {
    const config = { min_brightness: 0, max_brightness: 255 };
    if (attributes.min_mireds != null) config.min_color_temp = attributes.min_mireds;
    if (attributes.max_mireds != null) config.max_color_temp = attributes.max_mireds;
    return config;
  }

  if (domain === "fan") {
    const config = {};
    const step = attributes.percentage_step;
    if (step && step > 0) {
      config.percentage_step = step;
      config.speed_count = Math.round(100 / step);
    }
    if (attributes.preset_modes != null) config.preset_modes = attributes.preset_modes;
    return config;
  }

  if (domain === "input_number") {
    const config = {};
    for (const key of ["min", "max", "step"]) {
      if (attributes[key] != null) config[key] = attributes[key];
    }
    return config;
  }

  if (domain === "climate") {
    const config = {};
    for (const key of ["min_temp", "max_temp"]) {
      if (attributes[key] != null) config[key] = attributes[key];
    }
    if (attributes.target_temp_step != null) config.temp_step = attributes.target_temp_step;
    for (const listKey of ["hvac_modes", "fan_modes", "preset_modes", "swing_modes"]) {
      if (attributes[listKey] != null) config[listKey] = attributes[listKey];
    }
    return config;
  }

  return {};
}

function getRendererName(domain, deviceClass) {
  if (domain === "sensor" && deviceClass && SENSOR_DEVICE_CLASS_RENDERERS[deviceClass]) {
    return SENSOR_DEVICE_CLASS_RENDERERS[deviceClass];
  }
  return TIER1_DOMAINS[domain] || "GenericCard";
}

function getSupportTier(domain) {
  if (domain in TIER1_DOMAINS) return 1;
  return 2;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an entity definition from raw entity data.
 *
 * @param {object} rawEntity
 *   - domain       {string}  Entity domain (e.g. "light")
 *   - state        {string}  Current state value (e.g. "on")
 *   - friendly_name {string} Display name
 *   - attributes   {object}  HA-style state attributes
 *   - unit         {string}  (optional) unit_of_measurement
 * @param {object} [options]
 *   - capabilities    {string}  "read" | "read-write" (default "read-write")
 *   - features        {object}  Feature toggle overrides from the preview UI.
 *                                Keys match the feature names (e.g. "brightness",
 *                                "color_temp"). When provided, only features with
 *                                a truthy value are included.
 *   - iconOverride    {string}  Single icon for all states
 *   - nameOverride    {string}  Override friendly_name
 *   - colorScheme     {string}  "light" | "dark" | "auto"
 *   - displayHints    {object}  Pass-through display hints
 *   - gestureConfig   {object}  Pass-through gesture config
 * @returns {object} Entity definition ready for window.HArvest.preview()
 */
export function buildEntityDef(rawEntity, options = {}) {
  const { domain, state, attributes = {} } = rawEntity;
  const friendlyName = options.nameOverride || rawEntity.friendly_name || "";
  const deviceClass = attributes.device_class ?? null;
  const capabilities = options.capabilities ?? "read-write";

  // Decode bitmask features.
  const bitmask = attributes.supported_features ?? 0;
  let supportedFeatures = decodeSupportedFeatures(domain, bitmask);

  // Light: augment from supported_color_modes (modern HA).
  if (domain === "light") {
    const colorModes = new Set(attributes.supported_color_modes ?? []);
    const dimmable = new Set(["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"]);
    if ([...colorModes].some(m => dimmable.has(m)) && !supportedFeatures.includes("brightness")) {
      supportedFeatures.push("brightness");
    }
    if (colorModes.has("color_temp") && !supportedFeatures.includes("color_temp")) {
      supportedFeatures.push("color_temp");
    }
    const colorCapable = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);
    if ([...colorModes].some(m => colorCapable.has(m)) && !supportedFeatures.includes("rgb_color")) {
      supportedFeatures.push("rgb_color");
    }
  }

  if (domain === "cover" && !supportedFeatures.includes("buttons")) {
    supportedFeatures.push("buttons");
  }

  if (domain === "weather") {
    const rawFeatures = attributes.supported_features ?? 0;
    if (rawFeatures & 1) supportedFeatures.push("forecast_daily");
    if (rawFeatures & 2) supportedFeatures.push("forecast_hourly");
  }

  // Apply feature toggles from the preview UI.
  if (options.features) {
    supportedFeatures = supportedFeatures.filter(f => {
      for (const [key, enabled] of Object.entries(options.features)) {
        if (!enabled && featureMatchesToggle(domain, f, key)) return false;
      }
      return true;
    });
    for (const [key, enabled] of Object.entries(options.features)) {
      if (enabled) {
        const mapped = toggleToFeatures(domain, key);
        for (const f of mapped) {
          if (!supportedFeatures.includes(f)) supportedFeatures.push(f);
        }
      }
    }
  }

  const iconStateMap = buildIconStateMap(domain, state, deviceClass, options.iconOverride ?? null);
  const currentIcon = options.iconOverride
    || iconStateMap[state]
    || iconStateMap["*"]
    || "mdi:help-circle";

  const featureConfig = buildFeatureConfig(domain, attributes);
  const renderer = getRendererName(domain, deviceClass);
  const supportTier = getSupportTier(domain);

  return {
    entity_id: attributes._entity_id ?? `${domain}.preview`,
    domain,
    device_class: deviceClass,
    friendly_name: friendlyName,
    capabilities,
    supported_features: supportedFeatures,
    feature_config: featureConfig,
    icon: currentIcon,
    icon_state_map: iconStateMap,
    support_tier: supportTier,
    renderer,
    unit_of_measurement: rawEntity.unit ?? attributes.unit_of_measurement ?? null,
    gesture_config: options.gestureConfig ?? {},
    color_scheme: options.colorScheme ?? "auto",
    display_hints: options.displayHints ?? {},
    companions: [],
  };
}

/**
 * Filter attributes through the global blocklist.
 *
 * @param {object} attributes - Raw HA attributes
 * @returns {object} Filtered attributes safe for widget consumption
 */
export function filterAttributes(attributes) {
  const filtered = {};
  for (const [k, v] of Object.entries(attributes)) {
    if (BLOCKED_ATTRIBUTES.has(k)) continue;
    try {
      if (JSON.stringify(v).length > MAX_ATTRIBUTE_VALUE_BYTES) continue;
    } catch (_e) {
      continue;
    }
    filtered[k] = v;
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Feature toggle helpers
// ---------------------------------------------------------------------------
// The preview UI uses human-friendly toggle keys ("brightness", "color_temp",
// "percentage", "forecast") that may not match the feature string names exactly.
// These helpers bridge the gap.

function featureMatchesToggle(domain, feature, toggleKey) {
  const map = TOGGLE_TO_FEATURE[domain];
  if (!map) return feature === toggleKey;
  const mapped = map[toggleKey];
  if (!mapped) return feature === toggleKey;
  return mapped.includes(feature);
}

function toggleToFeatures(domain, toggleKey) {
  const map = TOGGLE_TO_FEATURE[domain];
  if (!map || !map[toggleKey]) return [toggleKey];
  return map[toggleKey];
}

const TOGGLE_TO_FEATURE = {
  light: {
    brightness: ["brightness"],
    color_temp: ["color_temp"],
    rgb_color:  ["rgb_color"],
  },
  fan: {
    percentage:  ["set_speed"],
    oscillating: ["oscillate"],
    direction:   ["direction"],
    preset_mode: ["preset_mode"],
    animate:     [],
  },
  cover: {
    current_position: ["set_position"],
    buttons:          ["buttons"],
  },
  climate: {
    temperature: ["target_temperature"],
    hvac_modes:  [],
  },
  media_player: {
    transport: ["play_pause", "next_track", "previous_track"],
    volume:    ["volume_set"],
  },
  input_number: {
    slider: [],
  },
  weather: {
    forecast: ["forecast_daily"],
  },
};
