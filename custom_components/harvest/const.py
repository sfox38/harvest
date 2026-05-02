"""Constants for the HArvest integration.

All other modules import from here. No classes, no functions.
"""
from __future__ import annotations

DOMAIN = "harvest"
PLATFORM_VERSION = "0.9.1"              # must match SPEC.md version header

# Token and session ID format
TOKEN_PREFIX = "hwt_"
SESSION_PREFIX = "hrs_"
TOKEN_ID_LENGTH = 22        # base62 characters after prefix
SESSION_ID_LENGTH = 22      # base62 characters after prefix
ALIAS_LENGTH = 8            # base62 characters for entity aliases
THEME_PREFIX = "hth_"
THEME_ID_LENGTH = 12        # base62 characters after prefix
PACK_PREFIX = "hpk_"
PACK_ID_LENGTH = 12         # base62 characters after prefix
BASE62_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# WebSocket endpoint path registered with HA's HTTP server
WS_PATH = "/api/harvest/ws"

# Panel UI path (sidebar URL)
PANEL_PATH = "harvest"

# Static assets path - separate from PANEL_PATH to avoid a direct GET to
# /harvest returning 403 (directory listing) on full page reload.
PANEL_ASSETS_PATH = "harvest_assets"

# SQLite activity store filename
ACTIVITY_DB_FILENAME = "harvest_activity.db"

# Global config option keys (stored in HA's config entry data)
CONF_AUTH_TIMEOUT = "auth_timeout_seconds"
CONF_MAX_ENTITIES_PER_TOKEN = "max_entities_per_token"
CONF_MAX_ENTITIES_HARD_CAP = "max_entities_hard_cap"
CONF_MAX_INBOUND_BYTES = "max_inbound_message_bytes"
CONF_KEEPALIVE_INTERVAL = "keepalive_interval_seconds"
CONF_KEEPALIVE_TIMEOUT = "keepalive_timeout_seconds"
CONF_HEARTBEAT_TIMEOUT = "heartbeat_timeout_seconds"
CONF_ACTIVITY_RETENTION_DAYS = "activity_log_retention_days"
CONF_ABSOLUTE_SESSION_LIFETIME = "absolute_session_lifetime_hours"
CONF_MAX_AUTH_PER_TOKEN = "max_auth_attempts_per_token_per_minute"
CONF_MAX_AUTH_PER_IP = "max_auth_attempts_per_ip_per_minute"
CONF_MAX_CONNECTIONS_PER_MINUTE = "max_connections_per_minute"
CONF_TRUSTED_PROXIES = "trusted_proxies"
CONF_DEFAULT_RATE_LIMITS = "default_rate_limits"
CONF_DEFAULT_SESSION = "default_session"
CONF_HA_EVENT_BUS = "ha_event_bus"
CONF_OVERRIDE_HOST = "override_host"
CONF_WIDGET_SCRIPT_URL = "widget_script_url"
CONF_KILL_SWITCH = "kill_switch"

# Default values matching SPEC.md Section 19
DEFAULTS: dict[str, object] = {
    CONF_AUTH_TIMEOUT: 10,
    CONF_MAX_ENTITIES_PER_TOKEN: 50,
    CONF_MAX_ENTITIES_HARD_CAP: 250,
    CONF_MAX_INBOUND_BYTES: 4096,
    CONF_KEEPALIVE_INTERVAL: 30,
    CONF_KEEPALIVE_TIMEOUT: 10,
    CONF_HEARTBEAT_TIMEOUT: 60,
    CONF_ACTIVITY_RETENTION_DAYS: 30,       # matches security.md documented default
    CONF_ABSOLUTE_SESSION_LIFETIME: 72,     # hard cap on total cumulative session age across all renewals
                                            # distinct from max_lifetime_minutes which bounds individual sessions
    CONF_MAX_AUTH_PER_TOKEN: 10,
    CONF_MAX_AUTH_PER_IP: 20,
    CONF_MAX_CONNECTIONS_PER_MINUTE: 100,
    CONF_TRUSTED_PROXIES: [],
    CONF_DEFAULT_RATE_LIMITS: {
        "max_push_per_second": 1,
        "max_commands_per_minute": 30,
    },
    CONF_DEFAULT_SESSION: {
        "lifetime_minutes": 60,             # initial session lifetime before first renewal required
        "max_lifetime_minutes": 1440,       # ceiling any single session can reach via renewals (24h)
                                            # absolute_session_lifetime_hours (72h) caps the total
                                            # cumulative time before full re-auth is needed
    },
    CONF_HA_EVENT_BUS: {
        # Security-critical events - enabled by default
        "harvest_token_revoked": True,
        "harvest_suspicious_origin": True,
        "harvest_session_limit_reached": True,
        "harvest_flood_protection": True,
        # High-volume events - disabled by default to avoid logbook noise on busy installs
        # Enable these for detailed monitoring or debugging
        "harvest_session_connected": False,
        "harvest_auth_failure": False,
    },
    # Empty string means no override; wizard uses window.location.origin.
    CONF_OVERRIDE_HOST: "",
    # Empty string means use the default CDN URL. Accepts a path (/harvest.min.js)
    # or a full URL (https://example.com/harvest.min.js).
    CONF_WIDGET_SCRIPT_URL: "",
    CONF_KILL_SWITCH: False,
    "default_lang": "auto",
    "default_a11y": "standard",
    "default_on_offline": "last-state",
    "default_on_error": "message",
    "default_offline_text": "",
    "default_error_text": "",
}

# Attribute denylist - keys containing these strings are stripped from state_updates.
# This is KEY-LEVEL substring matching (the substring appears in the key name itself).
# Example: "access_token" strips keys like "access_token" and "oauth_access_token"
# but NOT "access_token_hidden" if "hidden" is not in the substring list.
# Note: exclude_attributes in EntityAccess is EXACT key matching, not substring.
# The two mechanisms are complementary: denylist covers sensitive key patterns
# globally; exclude_attributes allows per-entity exact exclusions.
ATTRIBUTE_DENYLIST_SUBSTRINGS: tuple[str, ...] = (
    "access_token", "api_key", "password", "token",
    "secret", "credentials", "private_key",
)

# Error codes (subset used server-side; full list in SPEC.md Section 6)
ERR_TOKEN_INVALID = "HRV_TOKEN_INVALID"
ERR_TOKEN_EXPIRED = "HRV_TOKEN_EXPIRED"
ERR_TOKEN_REVOKED = "HRV_TOKEN_REVOKED"
ERR_TOKEN_INACTIVE = "HRV_TOKEN_INACTIVE"
ERR_ORIGIN_DENIED = "HRV_ORIGIN_DENIED"
ERR_IP_DENIED = "HRV_IP_DENIED"
ERR_ENTITY_NOT_IN_TOKEN = "HRV_ENTITY_NOT_IN_TOKEN"
ERR_ENTITY_INCOMPATIBLE = "HRV_ENTITY_INCOMPATIBLE"
ERR_SESSION_LIMIT_REACHED = "HRV_SESSION_LIMIT_REACHED"
ERR_SIGNATURE_INVALID = "HRV_SIGNATURE_INVALID"
ERR_AUTH_FAILED = "HRV_AUTH_FAILED"
ERR_ENTITY_MISSING = "HRV_ENTITY_MISSING"
ERR_ENTITY_REMOVED = "HRV_ENTITY_REMOVED"
ERR_PERMISSION_DENIED = "HRV_PERMISSION_DENIED"
ERR_RATE_LIMITED = "HRV_RATE_LIMITED"
ERR_SESSION_EXPIRED = "HRV_SESSION_EXPIRED"
ERR_BAD_REQUEST = "HRV_BAD_REQUEST"
ERR_MESSAGE_TOO_LARGE = "HRV_MESSAGE_TOO_LARGE"
ERR_SERVER_ERROR = "HRV_SERVER_ERROR"
