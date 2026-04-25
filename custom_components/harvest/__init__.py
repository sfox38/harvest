"""HArvest integration entry point.

Sets up and tears down all integration components. Called by HA during
config entry setup and unload.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_component import EntityComponent
from homeassistant.helpers.event import async_track_time_interval

from .activity_store import ActivityStore
from .const import DEFAULTS, DOMAIN
from .diagnostic_sensors import DiagnosticSensors
from .event_bus import EventBus
from .harvest_action import HarvestActionManager
from .http_views import register_views
from .pack_manager import PackManager
from .theme_manager import ThemeManager
from .panel import register_panel
from .rate_limiter import RateLimiter
from .session_manager import SessionManager
from .token_manager import TokenManager
from .ws_proxy import HarvestWsView

_LOGGER = logging.getLogger(__name__)

# Scan interval for EntityComponent managing diagnostic sensors.
_SENSOR_SCAN_INTERVAL = timedelta(seconds=30)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up HArvest from a config entry.

    Merges DEFAULTS with config entry data and options.
    Instantiates all managers in dependency order.
    Loads tokens and actions from storage.
    Opens activity store.
    Registers WebSocket view, HTTP views, panel, and diagnostic sensors.
    Schedules daily activity log purge and preview token cleanup.
    Stores all managers in hass.data[DOMAIN][entry.entry_id].
    """
    # Build effective config: defaults < entry.data < entry.options.
    config: dict = {**DEFAULTS, **entry.data, **entry.options}

    # --- Instantiate in dependency order ---
    activity_store = ActivityStore(hass, config)
    await activity_store.open()

    token_manager = TokenManager(hass, config)
    await token_manager.load()

    session_manager = SessionManager(config)
    rate_limiter = RateLimiter(config)
    event_bus = EventBus(hass, config)

    action_manager = HarvestActionManager(hass)
    await action_manager.load()

    theme_manager = ThemeManager(hass)
    await theme_manager.load()
    _LOGGER.debug("HArvest theme manager loaded: %d themes", len(theme_manager.get_all()))

    pack_manager = PackManager(hass)
    await pack_manager.load()
    _LOGGER.warning("HArvest pack manager loaded: %d packs, agreed=%s", len(pack_manager.get_all()), pack_manager.agreed)

    # DiagnosticSensors takes token_manager in addition to the spec's 3 args
    # because HarvestActiveTokensSensor needs to query get_active().
    sensors = DiagnosticSensors(hass, session_manager, activity_store, token_manager)

    # --- Register WebSocket view ---
    ws_view = HarvestWsView(
        hass, token_manager, session_manager,
        rate_limiter, activity_store, event_bus,
        action_manager, config,
        sensors=sensors,
        theme_manager=theme_manager,
        pack_manager=pack_manager,
    )
    hass.http.register_view(ws_view)

    # --- Register HTTP panel API views ---
    register_views(hass, token_manager, session_manager,
                   activity_store, action_manager, sensors, event_bus,
                   theme_manager=theme_manager,
                   pack_manager=pack_manager)

    # --- Register sidebar panel ---
    await register_panel(hass)

    # --- Create and register diagnostic sensor entities ---
    # The spec has no separate sensor.py / binary_sensor.py platform files, so
    # sensor entities are added directly via EntityComponent, which is a valid
    # HA pattern for integrations that manage their own entity lifecycle.
    all_sensor_entities = sensors.create_global_sensors()

    # Create per-token sensors for tokens already in storage at startup.
    for token in token_manager.get_all():
        all_sensor_entities.extend(sensors.create_token_sensors(token.token_id, token.label))

    sensor_entities = [e for e in all_sensor_entities if not hasattr(e, "is_on")]
    binary_entities = [e for e in all_sensor_entities if hasattr(e, "is_on")]

    if sensor_entities:
        sensor_component = EntityComponent(
            _LOGGER, "sensor", hass, _SENSOR_SCAN_INTERVAL
        )
        await sensor_component.async_add_entities(sensor_entities)
        hass.data.setdefault(DOMAIN, {}).setdefault(
            entry.entry_id, {}
        )["sensor_component"] = sensor_component

    if binary_entities:
        binary_component = EntityComponent(
            _LOGGER, "binary_sensor", hass, _SENSOR_SCAN_INTERVAL
        )
        await binary_component.async_add_entities(binary_entities)
        hass.data.setdefault(DOMAIN, {}).setdefault(
            entry.entry_id, {}
        )["binary_sensor_component"] = binary_component

    # --- Schedule periodic tasks ---
    sensors.schedule_updates()

    # Daily activity log purge.
    async def _purge_old_records(_now: object) -> None:
        await activity_store.purge_old_records()

    unsub_purge = async_track_time_interval(hass, _purge_old_records, timedelta(hours=24))

    # Periodic preview token cleanup (every 60 seconds per spec).
    async def _cleanup_expired_previews(_now: object) -> None:
        await token_manager.cleanup_expired_previews()

    unsub_preview = async_track_time_interval(hass, _cleanup_expired_previews, timedelta(seconds=60))

    # --- Store all managers for access by other parts of the integration ---
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        **hass.data.get(DOMAIN, {}).get(entry.entry_id, {}),
        "token_manager":   token_manager,
        "session_manager": session_manager,
        "rate_limiter":    rate_limiter,
        "activity_store":  activity_store,
        "event_bus":       event_bus,
        "action_manager":  action_manager,
        "theme_manager":   theme_manager,
        "pack_manager":    pack_manager,
        "sensors":         sensors,
        "unsub_purge":     unsub_purge,
        "unsub_preview":   unsub_preview,
    }

    _LOGGER.info("HArvest integration set up successfully.")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry.

    Closes the activity store (flushing pending writes).
    Closes all active WebSocket sessions.
    Marks the running sensor as off.
    Stops the sensor update timer.
    Removes hass.data entry.
    """
    data = hass.data.get(DOMAIN, {}).pop(entry.entry_id, {})

    # Cancel periodic timers.
    for key in ("unsub_purge", "unsub_preview"):
        if unsub := data.get(key):
            unsub()

    # Signal the running sensor to go offline before teardown.
    if sensors := data.get("sensors"):
        sensors.stop_updates()
        for entity in sensors.get_entities():
            if hasattr(entity, "set_running"):
                entity.set_running(False)

    # Flush and close the activity store.
    if activity_store := data.get("activity_store"):
        await activity_store.close()

    # Close all active WebSocket sessions.
    if session_manager := data.get("session_manager"):
        for session in session_manager.get_all():
            if not session.ws.closed:
                await session.ws.close()

    _LOGGER.info("HArvest integration unloaded.")
    return True
