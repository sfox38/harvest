"""Builds entity_definition messages for the HArvest WebSocket protocol.

Reads HA entity state and registry data, translates supported_features
bitmasks to string lists, and packages everything the widget needs to render
a card - without exposing any HA internals the token owner has not approved.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant, State
from homeassistant.helpers import entity_registry as er

from .entity_compatibility import get_renderer_name, get_support_tier

if TYPE_CHECKING:
    from .token_manager import EntityAccess


# ---------------------------------------------------------------------------
# Attribute exclusion helpers
# ---------------------------------------------------------------------------
# When exclude_attributes is set on a token entity, the widget should not see
# features, config ranges, or accept commands for those attributes.
#
# Most feature/data key names match the HA attribute name directly.  The maps
# below cover the known cases where they differ.

# state attribute -> feature name it belongs to (only where names differ).
# When any of these attributes is excluded, the mapped feature is suppressed.
_ATTR_TO_FEATURE: dict[str, str] = {
    "color_temp_kelvin": "color_temp",
    "min_mireds": "color_temp",
    "max_mireds": "color_temp",
    "min_color_temp_kelvin": "color_temp",
    "max_color_temp_kelvin": "color_temp",
    "hs_color": "rgb_color",
    "xy_color": "rgb_color",
    "effect_list": "effect",
    "percentage": "set_speed",
    "percentage_step": "set_speed",
    "oscillating": "oscillate",
    "current_position": "set_position",
    "current_tilt_position": "set_tilt_position",
    "temperature": "target_temperature",
    "volume_level": "volume_set",
}

# command data key -> state attribute it controls (only where names differ)
_DATA_KEY_ATTR_NAME: dict[str, str] = {
    "brightness_pct": "brightness",
    "color_temp_kelvin": "color_temp",
    "rgbw_color": "rgb_color",
    "rgbww_color": "rgb_color",
    "hs_color": "rgb_color",
    "xy_color": "rgb_color",
    "target_temp_low": "temperature",
    "target_temp_high": "temperature",
    "position": "current_position",
    "tilt_position": "current_tilt_position",
}

# attribute -> extra feature_config keys to remove (only where the attribute
# name does not appear as a substring of the config key)
_ATTR_EXTRA_CONFIG_KEYS: dict[str, set[str]] = {
    "temperature": {"min_temp", "max_temp", "temp_step"},
    "percentage": {"speed_count"},
}


def _features_to_suppress(exclude_attributes: list[str]) -> set[str]:
    """Compute the set of feature names to remove from supported_features.

    Direct match: attribute name = feature name (covers most cases).
    Reverse lookup: attribute maps to a differently-named feature via _ATTR_TO_FEATURE.
    """
    result: set[str] = set()
    for attr in exclude_attributes:
        result.add(attr)
        mapped = _ATTR_TO_FEATURE.get(attr)
        if mapped:
            result.add(mapped)
    return result


def _is_config_key_excluded(key: str, exclude_attrs: list[str]) -> bool:
    """Check if a feature_config key should be removed."""
    for attr in exclude_attrs:
        if attr in key:
            return True
        extra = _ATTR_EXTRA_CONFIG_KEYS.get(attr)
        if extra and key in extra:
            return True
    return False


def get_blocked_data_keys(exclude_attributes: list[str]) -> set[str]:
    """Return the set of command data keys that should be stripped.

    Direct match: data key name in excluded attributes.
    Forward lookup: data key maps to an excluded attribute via _DATA_KEY_ATTR_NAME.
    Reverse lookup: excluded attribute maps to a feature, and data keys sharing
    that feature name are also blocked.
    """
    exclude_set = set(exclude_attributes)
    blocked: set[str] = set(exclude_attributes)
    suppressed = _features_to_suppress(exclude_attributes)
    for data_key, attr in _DATA_KEY_ATTR_NAME.items():
        if attr in exclude_set or attr in suppressed:
            blocked.add(data_key)
    blocked |= suppressed
    return blocked


# Maps (domain, bitmask_bit) -> feature string for translate_supported_features.
FEATURE_FLAGS: dict[str, dict[int, str]] = {
    "light": {
        1: "brightness", 2: "color_temp", 4: "effect",
        16: "flash", 32: "transition", 64: "transition", 128: "rgb_color", 1024: "white_value",
    },
    "fan": {1: "set_speed", 2: "oscillate", 4: "direction", 8: "preset_mode"},
    "cover": {4: "set_position", 128: "set_tilt_position", 8: "stop"},
    "climate": {
        1: "target_temperature", 2: "target_temperature_range",
        4: "fan_mode", 8: "preset_mode", 16: "swing_mode", 32: "aux_heat",
    },
    "media_player": {
        1: "play_pause", 2: "next_track", 4: "previous_track",
        8: "volume_set", 16: "volume_step", 128: "turn_on", 256: "turn_off",
    },
    "remote": {1: "learn_command", 2: "delete_command"},
}

# Attributes blocked from state_update messages. All other attributes are
# forwarded to the widget. Individual values exceeding MAX_ATTRIBUTE_VALUE_BYTES
# are silently dropped as a safety net against oversized payloads.
BLOCKED_ATTRIBUTES: frozenset[str] = frozenset({
    "supported_features",
    "supported_color_modes",
    "friendly_name",
    "attribution",
    "assumed_state",
    "editable",
    "id",
    "forecast",
})

MAX_ATTRIBUTE_VALUE_BYTES = 8192

# Default icon per state for each domain. Used when the entity registry has no
# custom icon set. State key "*" applies to all unlisted states.
_DOMAIN_ICON_DEFAULTS: dict[str, dict[str, str]] = {
    "light": {
        "on": "mdi:lightbulb",
        "*": "mdi:lightbulb-outline",
    },
    "switch": {
        "on": "mdi:toggle-switch",
        "*": "mdi:toggle-switch-off-outline",
    },
    "fan": {
        "on": "mdi:fan",
        "*": "mdi:fan-off",
    },
    "cover": {
        "open":    "mdi:window-shutter-open",
        "opening": "mdi:window-shutter-open",
        "closing": "mdi:window-shutter",
        "*":       "mdi:window-shutter",
    },
    "climate": {
        "*": "mdi:thermostat",
    },
    "media_player": {
        "playing": "mdi:cast-connected",
        "idle":    "mdi:cast",
        "off":     "mdi:cast",
        "*":       "mdi:cast",
    },
    "remote": {
        "on": "mdi:remote",
        "*":  "mdi:remote",
    },
    "input_boolean": {
        "on": "mdi:toggle-switch",
        "*":  "mdi:toggle-switch-off-outline",
    },
    "input_number": {
        "*": "mdi:numeric",
    },
    "input_select": {
        "*": "mdi:format-list-bulleted",
    },
    "sensor": {
        "*": "mdi:gauge",
    },
    "binary_sensor": {
        "on":  "mdi:radiobox-marked",
        "*":   "mdi:radiobox-blank",
    },
    "harvest_action": {
        "triggered": "mdi:play-circle",
        "*":         "mdi:play-circle-outline",
    },
    "timer": {
        "active": "mdi:timer",
        "paused": "mdi:timer-pause",
        "*":      "mdi:timer-outline",
    },
}

# Device-class icon overrides for binary_sensor and sensor.
_BINARY_SENSOR_DC_ICONS: dict[str, dict[str, str]] = {
    "motion":       {"on": "mdi:motion-sensor", "*": "mdi:motion-sensor-off"},
    "door":         {"on": "mdi:door-open", "*": "mdi:door-closed"},
    "window":       {"on": "mdi:window-open", "*": "mdi:window-closed"},
    "lock":         {"on": "mdi:lock-open", "*": "mdi:lock"},
    "connectivity": {"on": "mdi:wifi", "*": "mdi:wifi-off"},
    "moisture":     {"on": "mdi:water", "*": "mdi:water-off"},
    "smoke":        {"on": "mdi:smoke-detector-variant-alert", "*": "mdi:smoke-detector-variant"},
    "presence":     {"on": "mdi:home", "*": "mdi:home-outline"},
}

_SENSOR_DC_ICONS: dict[str, str] = {
    "temperature":    "mdi:thermometer",
    "humidity":       "mdi:water-percent",
    "battery":        "mdi:battery",
    "illuminance":    "mdi:brightness-5",
    "pressure":       "mdi:gauge",
    "power":          "mdi:flash",
    "energy":         "mdi:lightning-bolt",
    "voltage":        "mdi:sine-wave",
    "current":        "mdi:current-ac",
    "carbon_dioxide": "mdi:molecule-co2",
    "pm25":           "mdi:air-filter",
}


def build_entity_definition(
    hass: HomeAssistant,
    entity_id: str,
    entity_access: "EntityAccess",
    companions: list[str] | None = None,
) -> dict | None:
    """Build a complete entity_definition message dict for a given entity.

    Reads current state and entity registry entry from HA.
    Translates supported_features bitmask to string list.
    Builds icon and icon_state_map from entity registry and domain defaults.
    Builds feature_config with domain-specific range values.
    Returns None if the entity does not exist in HA's state machine.
    """
    state = hass.states.get(entity_id)
    if state is None:
        return None

    domain = entity_id.split(".")[0]
    attrs = state.attributes

    # Entity registry - may be None for synthetic/virtual entities.
    registry = er.async_get(hass)
    entry = registry.async_get(entity_id)

    # device_class: prefer registry override, fall back to state attribute.
    device_class: str | None = None
    if entry is not None:
        device_class = entry.device_class or entry.original_device_class
    if device_class is None:
        device_class = attrs.get("device_class")

    # friendly_name: prefer state attribute (HA keeps it current), fall back to
    # registry original_name.
    friendly_name: str = attrs.get("friendly_name") or ""
    if not friendly_name and entry is not None:
        friendly_name = entry.name or entry.original_name or entity_id

    # supported_features bitmask -> string list.
    supported_features = decode_supported_features(
        domain, attrs.get("supported_features", 0)
    )

    # Modern HA lights report capabilities via supported_color_modes rather than
    # the supported_features bitmask. Augment the decoded feature list so that
    # RGBW/color_temp lights get their sliders without needing the old bitmask.
    if domain == "light":
        color_modes = set(attrs.get("supported_color_modes", []))
        dimmable_modes = {"brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"}
        if color_modes & dimmable_modes and "brightness" not in supported_features:
            supported_features.append("brightness")
        if "color_temp" in color_modes and "color_temp" not in supported_features:
            supported_features.append("color_temp")
        color_capable_modes = {"hs", "xy", "rgb", "rgbw", "rgbww"}
        if color_modes & color_capable_modes and "rgb_color" not in supported_features:
            supported_features.append("rgb_color")

    if domain == "cover" and "buttons" not in supported_features:
        supported_features.append("buttons")

    # icon_state_map (includes the icon for the current state as default icon).
    icon_state_map = build_icon_state_map(domain, state, entry, device_class)

    # The entity's default icon is the one for its current state.
    current_icon = icon_state_map.get(state.state) or icon_state_map.get("*", "mdi:help-circle")

    # feature_config for domain-specific sliders / range controls.
    feature_config = build_feature_config(domain, state)

    # unit_of_measurement from state attributes.
    unit_of_measurement: str | None = attrs.get("unit_of_measurement")

    # Apply exclude_attributes: remove suppressed features and config keys.
    if entity_access.exclude_attributes:
        suppressed = _features_to_suppress(entity_access.exclude_attributes)
        supported_features = [f for f in supported_features if f not in suppressed]
        feature_config = {
            k: v for k, v in feature_config.items()
            if not _is_config_key_excluded(k, entity_access.exclude_attributes)
        }

    support_tier = int(get_support_tier(domain))
    renderer = get_renderer_name(domain, device_class)

    return {
        "entity_id": entity_id,
        "domain": domain,
        "device_class": device_class,
        "friendly_name": friendly_name,
        "supported_features": supported_features,
        "feature_config": feature_config,
        "icon": current_icon,
        "icon_state_map": icon_state_map,
        "support_tier": support_tier,
        "renderer": renderer,
        "unit_of_measurement": unit_of_measurement,
        "gesture_config": entity_access.gesture_config or {},
        "graph": entity_access.graph,
        "hours": entity_access.hours,
        "period": entity_access.period,
        "animate": entity_access.animate,
        "companions": companions or [],
    }


def decode_supported_features(domain: str, bitmask: int) -> list[str]:
    """Translate a HA supported_features bitmask to a list of feature strings.

    Uses FEATURE_FLAGS for the domain. Bits not in the map are ignored.
    Returns an empty list for unknown domains or zero bitmask.
    """
    flags = FEATURE_FLAGS.get(domain, {})
    return [name for bit, name in flags.items() if bitmask & bit]


def filter_attributes(attributes: dict) -> dict:
    """Filter entity attributes using a blocklist and per-value size cap.

    Removes globally blocked attributes and any individual value whose JSON
    serialization exceeds MAX_ATTRIBUTE_VALUE_BYTES.
    """
    import json

    filtered = {}
    for k, v in attributes.items():
        if k in BLOCKED_ATTRIBUTES:
            continue
        try:
            if len(json.dumps(v, default=str)) > MAX_ATTRIBUTE_VALUE_BYTES:
                continue
        except (TypeError, ValueError):
            continue
        filtered[k] = v
    return filtered


def build_icon_state_map(
    domain: str,
    state: State,
    entry: er.RegistryEntry | None,
    device_class: str | None,
) -> dict[str, str]:
    """Build the icon_state_map for an entity.

    Reads the entity's icon from the entity registry if set (user-customised).
    Falls back to HA's built-in domain/device_class icon conventions.
    Returns a dict of state strings to MDI icon names.

    When the entity has a user-set icon in the registry, all states map to that
    single icon (the user override applies universally). Domain defaults provide
    per-state icons.
    """
    # User-customised icon from entity registry overrides everything.
    user_icon: str | None = entry.icon if entry is not None else None
    if user_icon:
        # Apply user icon to all known states for this domain plus a "*" fallback.
        known_states = list(_DOMAIN_ICON_DEFAULTS.get(domain, {}).keys())
        return {s: user_icon for s in known_states} | {"*": user_icon}

    # Device-class overrides for binary_sensor.
    if domain == "binary_sensor" and device_class in _BINARY_SENSOR_DC_ICONS:
        return dict(_BINARY_SENSOR_DC_ICONS[device_class])

    # Device-class icon for sensor (single icon, no state split).
    if domain == "sensor" and device_class in _SENSOR_DC_ICONS:
        icon = _SENSOR_DC_ICONS[device_class]
        return {"*": icon}

    # Fall back to domain defaults.
    defaults = _DOMAIN_ICON_DEFAULTS.get(domain)
    if defaults:
        return dict(defaults)

    # Unknown domain - generic fallback.
    return {"*": "mdi:help-circle"}


def build_feature_config(domain: str, state: State) -> dict:
    """Build the feature_config dict for domain-specific range values.

    light:        min_brightness (0), max_brightness (255), min_color_temp,
                  max_color_temp (from state attributes min_mireds/max_mireds)
    fan:          speed_count (derived from percentage_step attribute: 100 / step)
    input_number: min, max, step (from state attributes)
    climate:      min_temp, max_temp, target_temp_step (from state attributes)
    Returns an empty dict for domains with no configurable ranges.
    """
    attrs = state.attributes

    if domain == "light":
        config: dict = {
            "min_brightness": 0,
            "max_brightness": 255,
        }
        if "min_mireds" in attrs:
            config["min_color_temp"] = attrs["min_mireds"]
        if "max_mireds" in attrs:
            config["max_color_temp"] = attrs["max_mireds"]
        return config

    if domain == "fan":
        config = {}
        step = attrs.get("percentage_step")
        if step and step > 0:
            config["percentage_step"] = step
            config["speed_count"] = int(round(100 / step))
        if "preset_modes" in attrs:
            config["preset_modes"] = attrs["preset_modes"]
        return config

    if domain == "input_number":
        config = {}
        for key in ("min", "max", "step"):
            if key in attrs:
                config[key] = attrs[key]
        return config

    if domain == "climate":
        config = {}
        for key in ("min_temp", "max_temp"):
            if key in attrs:
                config[key] = attrs[key]
        if "target_temp_step" in attrs:
            config["temp_step"] = attrs["target_temp_step"]
        for list_key in ("hvac_modes", "fan_modes", "preset_modes", "swing_modes"):
            if list_key in attrs:
                config[list_key] = attrs[list_key]
        return config

    return {}
