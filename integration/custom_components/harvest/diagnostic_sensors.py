"""Diagnostic sensor entities for the HArvest integration.

Creates and manages HA sensor entities that surface HArvest metrics into the
HA state machine, enabling dashboards, automations, and alerts.
"""
from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_interval

from .activity_store import ActivityStore
from .session_manager import SessionManager
from .token_manager import TokenManager

_GLOBAL_UPDATE_INTERVAL = timedelta(seconds=30)


def _slugify(label: str) -> str:
    """Convert a token label to a slug suitable for entity_id use.

    Lowercases, replaces spaces and hyphens with underscores, removes all
    characters that are not alphanumeric or underscore.
    """
    slug = label.lower().strip()
    slug = re.sub(r"[\s\-]+", "_", slug)
    slug = re.sub(r"[^a-z0-9_]", "", slug)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug or "unnamed"


class DiagnosticSensors:
    """Factory and registry for HArvest diagnostic sensor entities."""

    def __init__(
        self,
        hass: HomeAssistant,
        session_manager: SessionManager,
        activity_store: ActivityStore,
        token_manager: TokenManager,
    ) -> None:
        self._hass = hass
        self._session_manager = session_manager
        self._activity_store = activity_store
        self._token_manager = token_manager
        self._entities: list[SensorEntity | BinarySensorEntity] = []
        # Per-token sensor registries keyed by token_id.
        self._token_entities: dict[str, list[SensorEntity]] = {}
        self._unsub_update: Any = None

    def create_global_sensors(self) -> list[SensorEntity | BinarySensorEntity]:
        """Return global diagnostic sensor entities to register with HA.

        Creates: HarvestActiveSessionsSensor, HarvestActiveTokensSensor,
        HarvestCommandsTodaySensor, HarvestErrorsTodaySensor,
        HarvestDbSizeSensor, HarvestRunningSensor (binary, device_class=connectivity).
        """
        sensors: list[SensorEntity | BinarySensorEntity] = [
            HarvestRunningSensor(),
            HarvestActiveSessionsSensor(self._session_manager),
            HarvestActiveTokensSensor(self._token_manager),
            HarvestCommandsTodaySensor(self._activity_store),
            HarvestErrorsTodaySensor(self._activity_store),
            HarvestDbSizeSensor(self._activity_store),
        ]
        self._entities.extend(sensors)
        return sensors

    def create_token_sensors(self, token_id: str, label: str) -> list[SensorEntity]:
        """Create per-token sensor entities for a newly created token.

        Creates: sessions, last_seen, last_origin, commands_today sensors.
        Entity IDs follow: sensor.harvest_{label_slug}_{metric}
        where {label_slug} is the token label slugified.
        """
        slug = _slugify(label)
        sensors: list[SensorEntity] = [
            HarvestTokenSessionsSensor(token_id, slug, self._session_manager),
            HarvestTokenLastSeenSensor(token_id, slug, self._activity_store),
            HarvestTokenLastOriginSensor(token_id, slug, self._activity_store),
            HarvestTokenCommandsTodaySensor(token_id, slug, self._activity_store),
        ]
        self._token_entities[token_id] = sensors
        self._entities.extend(sensors)
        return sensors

    def remove_token_sensors(self, token_id: str) -> None:
        """Unregister and remove per-token sensor entities when a token is deleted.

        Marks per-token sensors as unavailable and removes them from the
        internal registry. Full entity registry removal requires the entity
        platform to call async_remove(); this marks them unavailable so HA
        hides them from the UI until the next restart clears them.
        """
        sensors = self._token_entities.pop(token_id, [])
        for sensor in sensors:
            sensor._attr_available = False
            if sensor.hass is not None:
                sensor.async_write_ha_state()
            if sensor in self._entities:
                self._entities.remove(sensor)

    def schedule_updates(self) -> None:
        """Schedule periodic sensor state updates.

        Global sensors update every 30 seconds.
        Per-token sensors update on relevant events via push from ws_proxy/token_manager.
        """
        self._unsub_update = async_track_time_interval(
            self._hass, self._async_update_global_sensors, _GLOBAL_UPDATE_INTERVAL
        )

    def stop_updates(self) -> None:
        """Unsubscribe from the periodic update timer."""
        if self._unsub_update is not None:
            self._unsub_update()
            self._unsub_update = None

    async def _async_update_global_sensors(self, _now: Any = None) -> None:
        """Refresh all global sensor states.

        HarvestRunningSensor is excluded - it updates via set_running() push
        only and has no async_update() method.
        """
        for entity in self._entities:
            if isinstance(entity, _GlobalHarvestSensor):
                if entity.hass is not None:
                    await entity.async_update()
                    entity.async_write_ha_state()

    def push_token_update(self, token_id: str) -> None:
        """Immediately refresh per-token sensors for a given token.

        Called by ws_proxy on session open/close, by token_manager on auth_ok,
        and by the command handler when a command is processed. This keeps
        per-token sensors current without waiting for the 30-second cycle.
        """
        for sensor in self._token_entities.get(token_id, []):
            if sensor.hass is not None:
                self._hass.async_create_task(self._refresh_sensor(sensor))

    def get_entities(self) -> list:
        """Return all registered sensor entities."""
        return list(self._entities)

    async def _refresh_sensor(self, sensor: SensorEntity) -> None:
        await sensor.async_update()
        sensor.async_write_ha_state()


# ---------------------------------------------------------------------------
# Global sensor base class
# ---------------------------------------------------------------------------

class _GlobalHarvestSensor(SensorEntity):
    """Base class for global HArvest diagnostic sensors."""

    _attr_should_poll = False
    _attr_available = True


# ---------------------------------------------------------------------------
# Global sensors
# ---------------------------------------------------------------------------

class HarvestRunningSensor(BinarySensorEntity):
    """binary_sensor.harvest_running - connectivity device class.

    'on' while the integration is running and able to accept connections.
    Updated immediately on state change rather than on the 30-second cycle.
    """

    _attr_unique_id = "harvest_running"
    _attr_name = "HArvest Running"
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_icon = "mdi:leaf"
    _attr_should_poll = False

    def __init__(self) -> None:
        super().__init__()
        self._attr_is_on = True  # instance attribute - avoids shared class-level mutation

    def set_running(self, running: bool) -> None:
        """Update the running state and push to HA."""
        self._attr_is_on = running
        if self.hass is not None:
            self.async_write_ha_state()


class HarvestActiveSessionsSensor(_GlobalHarvestSensor):
    """sensor.harvest_active_sessions - live WebSocket session count."""

    _attr_unique_id = "harvest_active_sessions"
    _attr_name = "HArvest Active Sessions"
    _attr_native_unit_of_measurement = "sessions"
    _attr_icon = "mdi:connection"

    def __init__(self, session_manager: SessionManager) -> None:
        self._session_manager = session_manager

    async def async_update(self) -> None:
        self._attr_native_value = self._session_manager.count_active()


class HarvestActiveTokensSensor(_GlobalHarvestSensor):
    """sensor.harvest_active_tokens - count of active (non-expired, non-revoked) tokens."""

    _attr_unique_id = "harvest_active_tokens"
    _attr_name = "HArvest Active Tokens"
    _attr_native_unit_of_measurement = "tokens"
    _attr_icon = "mdi:key"

    def __init__(self, token_manager: TokenManager) -> None:
        self._token_manager = token_manager

    async def async_update(self) -> None:
        self._attr_native_value = len(self._token_manager.get_active())


class HarvestCommandsTodaySensor(_GlobalHarvestSensor):
    """sensor.harvest_commands_today - successful commands since midnight (HA TZ)."""

    _attr_unique_id = "harvest_commands_today"
    _attr_name = "HArvest Commands Today"
    _attr_native_unit_of_measurement = "commands"
    _attr_icon = "mdi:lightning-bolt"

    def __init__(self, activity_store: ActivityStore) -> None:
        self._activity_store = activity_store

    async def async_update(self) -> None:
        today = await self._activity_store.count_today()
        self._attr_native_value = today.get("commands", 0)


class HarvestErrorsTodaySensor(_GlobalHarvestSensor):
    """sensor.harvest_errors_today - auth failures and errors since midnight (HA TZ)."""

    _attr_unique_id = "harvest_errors_today"
    _attr_name = "HArvest Errors Today"
    _attr_native_unit_of_measurement = "errors"
    _attr_icon = "mdi:alert-circle"

    def __init__(self, activity_store: ActivityStore) -> None:
        self._activity_store = activity_store

    async def async_update(self) -> None:
        today = await self._activity_store.count_today()
        auth_fail = today.get("auth_fail", 0)
        errors = today.get("errors", 0)
        self._attr_native_value = auth_fail + errors


class HarvestDbSizeSensor(_GlobalHarvestSensor):
    """sensor.harvest_db_size - activity database file size in MB."""

    _attr_unique_id = "harvest_db_size"
    _attr_name = "HArvest DB Size"
    _attr_native_unit_of_measurement = "MB"
    _attr_icon = "mdi:database"
    _attr_suggested_display_precision = 2

    def __init__(self, activity_store: ActivityStore) -> None:
        self._activity_store = activity_store

    async def async_update(self) -> None:
        size_bytes = await self._activity_store.get_db_size_bytes()
        self._attr_native_value = round(size_bytes / (1024 * 1024), 2)


# ---------------------------------------------------------------------------
# Per-token sensors
# ---------------------------------------------------------------------------

class _TokenSensorBase(SensorEntity):
    """Base class for per-token HArvest diagnostic sensors."""

    _attr_should_poll = False
    _attr_available = True

    def __init__(self, token_id: str, label_slug: str) -> None:
        self._token_id = token_id
        self._label_slug = label_slug


class HarvestTokenSessionsSensor(_TokenSensorBase):
    """sensor.harvest_{label}_sessions - active session count for this token."""

    _attr_native_unit_of_measurement = "sessions"

    def __init__(self, token_id: str, label_slug: str, session_manager: SessionManager) -> None:
        super().__init__(token_id, label_slug)
        self._session_manager = session_manager
        self._attr_unique_id = f"harvest_token_{token_id}_sessions"
        self._attr_name = f"HArvest {label_slug} Sessions"

    async def async_update(self) -> None:
        self._attr_native_value = self._session_manager.count_for_token(self._token_id)


class HarvestTokenLastSeenSensor(_TokenSensorBase):
    """sensor.harvest_{label}_last_seen - timestamp of last successful auth."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, token_id: str, label_slug: str, activity_store: ActivityStore) -> None:
        super().__init__(token_id, label_slug)
        self._activity_store = activity_store
        self._attr_unique_id = f"harvest_token_{token_id}_last_seen"
        self._attr_name = f"HArvest {label_slug} Last Seen"

    async def async_update(self) -> None:
        events, _ = await self._activity_store.query_activity(
            token_id=self._token_id,
            display_type_filter="AUTH_OK",
            limit=1,
            offset=0,
        )
        if events:
            self._attr_native_value = events[0].get("timestamp")
        else:
            self._attr_native_value = None


class HarvestTokenLastOriginSensor(_TokenSensorBase):
    """sensor.harvest_{label}_last_origin - Origin header from last successful auth."""

    def __init__(self, token_id: str, label_slug: str, activity_store: ActivityStore) -> None:
        super().__init__(token_id, label_slug)
        self._activity_store = activity_store
        self._attr_unique_id = f"harvest_token_{token_id}_last_origin"
        self._attr_name = f"HArvest {label_slug} Last Origin"

    async def async_update(self) -> None:
        events, _ = await self._activity_store.query_activity(
            token_id=self._token_id,
            display_type_filter="AUTH_OK",
            limit=1,
            offset=0,
        )
        if events:
            self._attr_native_value = events[0].get("origin") or None
        else:
            self._attr_native_value = None


class HarvestTokenCommandsTodaySensor(_TokenSensorBase):
    """sensor.harvest_{label}_commands_today - commands via this token since midnight."""

    _attr_native_unit_of_measurement = "commands"

    def __init__(self, token_id: str, label_slug: str, activity_store: ActivityStore) -> None:
        super().__init__(token_id, label_slug)
        self._activity_store = activity_store
        self._attr_unique_id = f"harvest_token_{token_id}_commands_today"
        self._attr_name = f"HArvest {label_slug} Commands Today"

    async def async_update(self) -> None:
        from datetime import datetime, timezone
        import zoneinfo

        try:
            tz = zoneinfo.ZoneInfo(self._activity_store._hass.config.time_zone)
        except Exception:
            tz = timezone.utc

        now_local = datetime.now(tz=tz)
        midnight_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        midnight_utc = midnight_local.astimezone(timezone.utc)

        _events, total = await self._activity_store.query_activity(
            token_id=self._token_id,
            display_type_filter="COMMAND",
            since=midnight_utc,
            limit=1,
        )
        self._attr_native_value = total
