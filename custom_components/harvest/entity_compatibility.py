"""Entity domain compatibility definitions for the HArvest integration.

Defines which entity domains are supported (Tier 1, Tier 2, Tier 3) and
validates actions against the allowed services map.
"""
from __future__ import annotations

from enum import IntEnum

from .const import ERR_ENTITY_INCOMPATIBLE, ERR_PERMISSION_DENIED


class SupportTier(IntEnum):
    FULLY_SUPPORTED = 1
    GENERIC = 2
    BLOCKED = 3


TIER1_DOMAINS: dict[str, str] = {
    "light":           "LightCard",
    "switch":          "SwitchCard",
    "fan":             "FanCard",
    "climate":         "ClimateCard",
    "cover":           "CoverCard",
    "media_player":    "MediaPlayerCard",
    "remote":          "RemoteCard",
    "sensor":          "GenericSensorCard",
    "binary_sensor":   "BinarySensorCard",
    "input_boolean":   "InputBooleanCard",
    "input_number":    "InputNumberCard",
    "input_select":    "InputSelectCard",
    "harvest_action":  "HarvestActionCard",
    "timer":           "TimerCard",
}

SENSOR_DEVICE_CLASS_RENDERERS: dict[str, str] = {
    "temperature": "TemperatureSensorCard",
    "humidity":    "HumiditySensorCard",
    "battery":     "BatterySensorCard",
}

TIER3_DOMAINS: dict[str, str] = {
    "alarm_control_panel": "Security-critical. Publicly embeddable alarm control is too high risk.",
    "lock":                "Physical security risk.",
    "person":              "Exposes real-time location data of named individuals.",
    "device_tracker":      "Same privacy concern as person.",
    "camera":              "Video streaming is out of scope.",
    "script":              "Use harvest_action instead.",
    "automation":          "Same concern as script.",
    "scene":               "Could trigger wide device effects. Deferred to v2.",
    "update":              "Triggering firmware updates from a public page is too risky.",
    "button":              "Use harvest_action instead.",
}

ALLOWED_SERVICES: dict[str, set[str]] = {
    "light":          {"turn_on", "turn_off", "toggle"},
    "switch":         {"turn_on", "turn_off", "toggle"},
    "fan":            {"turn_on", "turn_off", "toggle", "set_percentage",
                       "oscillate", "set_direction", "set_preset_mode",
                       "increase_speed", "decrease_speed"},
    "cover":          {"open_cover", "close_cover", "stop_cover", "set_cover_position"},
    "climate":        {"turn_on", "turn_off", "set_temperature", "set_hvac_mode",
                       "set_fan_mode", "set_preset_mode", "set_swing_mode"},
    "input_boolean":  {"turn_on", "turn_off", "toggle"},
    "input_number":   {"set_value"},
    "input_select":   {"select_option"},
    "timer":          {"start", "pause", "cancel", "finish"},
    "media_player":   {"media_play_pause", "media_next_track", "media_previous_track",
                       "volume_up", "volume_down", "volume_set", "turn_on", "turn_off"},
    "remote":         {"turn_on", "turn_off", "send_command"},
    "harvest_action": {"trigger"},
    # sensor and binary_sensor are intentionally absent: read-only domains with no HA
    # services. They never send commands so they never reach this check. Not an omission.
}

COMPANION_ALLOWED_DOMAINS: frozenset[str] = frozenset({
    "light", "switch", "binary_sensor",
    "input_boolean", "cover", "remote", "lock",
})


def get_support_tier(domain: str) -> SupportTier:
    """Return the support tier for a given entity domain."""
    if domain in TIER3_DOMAINS:
        return SupportTier.BLOCKED
    if domain in TIER1_DOMAINS:
        return SupportTier.FULLY_SUPPORTED
    return SupportTier.GENERIC


def get_renderer_name(domain: str, device_class: str | None) -> str:
    """Return the widget renderer class name for a domain and device_class.

    For sensor domain, checks SENSOR_DEVICE_CLASS_RENDERERS first.
    Falls back to TIER1_DOMAINS lookup, then 'GenericCard'.
    """
    if domain == "sensor" and device_class:
        if device_class in SENSOR_DEVICE_CLASS_RENDERERS:
            return SENSOR_DEVICE_CLASS_RENDERERS[device_class]
    return TIER1_DOMAINS.get(domain, "GenericCard")


def validate_entity(domain: str) -> str | None:
    """Return HRV_ENTITY_INCOMPATIBLE for Tier 3 domains, or None if allowed."""
    if domain in TIER3_DOMAINS:
        return ERR_ENTITY_INCOMPATIBLE
    return None


def validate_action(domain: str, action: str) -> str | None:
    """Return HRV_PERMISSION_DENIED if action is not allowed for domain, else None."""
    allowed = ALLOWED_SERVICES.get(domain, set())
    if action not in allowed:
        return ERR_PERMISSION_DENIED
    return None


def is_companion_allowed(domain: str) -> bool:
    """Return True if the domain is permitted as a companion entity."""
    return domain in COMPANION_ALLOWED_DOMAINS


def get_blocked_reason(domain: str) -> str | None:
    """Return the human-readable reason a Tier 3 domain is blocked, or None."""
    return TIER3_DOMAINS.get(domain)
