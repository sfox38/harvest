"""Controllable HA entities for HArvest.

Exports three writable entity types into the HA state machine so that
automations and scripts can control the integration:

  switch.harvest_kill_switch         - global on/off; blocks all auth when on
  switch.harvest_{label}_paused      - per-token pause without revocation
  button.harvest_close_all_sessions  - close every live WS session immediately
"""
from __future__ import annotations

import asyncio
import re
from typing import Any

from homeassistant.components.button import ButtonEntity
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant

from .const import CONF_KILL_SWITCH, DEFAULTS
from .session_manager import SessionManager
from .token_manager import TokenManager


def _slugify(label: str) -> str:
    slug = label.lower().strip()
    slug = re.sub(r"[\s\-]+", "_", slug)
    slug = re.sub(r"[^a-z0-9_]", "", slug)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug or "unnamed"


async def _close_ws(ws: Any) -> None:
    try:
        await ws.close()
    except Exception:
        pass


class ControlEntities:
    """Factory and registry for HArvest controllable entities."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        token_manager: TokenManager,
        session_manager: SessionManager,
    ) -> None:
        self._hass = hass
        self._entry = entry
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._entities: list[SwitchEntity | ButtonEntity] = []
        self._token_switches: dict[str, HarvestTokenPausedSwitch] = {}
        self._switch_add_fn: Any = None

    def build_startup_switches(self) -> list[SwitchEntity]:
        """Return all switch entities for initial platform setup.

        Creates the global kill switch plus a paused switch for every token
        already in storage. Called once from switch.py async_setup_entry.
        """
        kill = HarvestKillSwitch(self._hass, self._entry, self._session_manager)
        self._entities.append(kill)
        switches: list[SwitchEntity] = [kill]
        for token in self._token_manager.get_all():
            switches.extend(self.create_token_controls(token.token_id, token.label))
        return switches

    def build_startup_buttons(self) -> list[ButtonEntity]:
        """Return all button entities for initial platform setup.

        Called once from button.py async_setup_entry.
        """
        close_btn = HarvestCloseAllSessionsButton(self._session_manager)
        self._entities.append(close_btn)
        return [close_btn]

    def set_switch_add_fn(self, fn: Any) -> None:
        """Register the async callable used to add new switch entities to HA.

        Called once from __init__.py after the switch EntityComponent is ready.
        """
        self._switch_add_fn = fn

    def create_token_controls(self, token_id: str, label: str) -> list[SwitchEntity]:
        """Return a paused-switch entity for a token."""
        slug = _slugify(label)
        sw = HarvestTokenPausedSwitch(token_id, slug, self._token_manager)
        self._token_switches[token_id] = sw
        self._entities.append(sw)
        return [sw]

    async def create_and_register_token_controls(self, token_id: str, label: str) -> None:
        """Create per-token controls and add them to HA if the component is ready."""
        entities = self.create_token_controls(token_id, label)
        if self._switch_add_fn is not None:
            self._switch_add_fn(entities)  # AddEntitiesCallback is sync

    def remove_token_controls(self, token_id: str) -> None:
        """Mark the token's paused switch unavailable when the token is deleted."""
        sw = self._token_switches.pop(token_id, None)
        if sw is None:
            return
        sw._attr_available = False
        if sw.hass is not None:
            sw.async_write_ha_state()
        if sw in self._entities:
            self._entities.remove(sw)

    def get_entities(self) -> list:
        """Return all registered control entities."""
        return list(self._entities)


# ---------------------------------------------------------------------------
# Global: kill switch
# ---------------------------------------------------------------------------

class HarvestKillSwitch(SwitchEntity):
    """switch.harvest_kill_switch

    Mirrors CONF_KILL_SWITCH in the config entry options. Turning it on
    closes all active sessions immediately; turning it off re-opens auth.
    Reads the live config entry on every state check so it stays in sync
    with changes made via the panel Settings screen.
    """

    _attr_has_entity_name = False
    _attr_unique_id = "harvest_kill_switch"
    _attr_name = "HArvest Kill Switch"
    _attr_icon = "mdi:toggle-switch-off"
    _attr_should_poll = False
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        session_manager: SessionManager,
    ) -> None:
        self.entity_id = "switch.harvest_kill_switch"
        self._hass = hass
        self._entry = entry
        self._session_manager = session_manager

    @property
    def is_on(self) -> bool:
        merged = {**DEFAULTS, **self._entry.data, **self._entry.options}
        return bool(merged.get(CONF_KILL_SWITCH, False))

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._set(True)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._set(False)

    async def _set(self, value: bool) -> None:
        current = {**DEFAULTS, **self._entry.data, **self._entry.options}
        current[CONF_KILL_SWITCH] = value
        self._hass.config_entries.async_update_entry(self._entry, options=current)
        if value:
            for session in self._session_manager.get_all():
                if not session.ws.closed:
                    asyncio.create_task(_close_ws(session.ws))
        self.async_write_ha_state()


# ---------------------------------------------------------------------------
# Global: close all sessions button
# ---------------------------------------------------------------------------

class HarvestCloseAllSessionsButton(ButtonEntity):
    """button.harvest_close_all_sessions

    Closes every active WebSocket session immediately. New connections are
    still allowed (unlike the kill switch). Useful for scripted session
    hygiene - e.g. "kick all widget sessions when I arrive home."
    """

    _attr_has_entity_name = False
    _attr_unique_id = "harvest_close_all_sessions"
    _attr_name = "HArvest Close All Sessions"
    _attr_icon = "mdi:logout"
    _attr_should_poll = False
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, session_manager: SessionManager) -> None:
        self.entity_id = "button.harvest_close_all_sessions"
        self._session_manager = session_manager

    async def async_press(self) -> None:
        for session in self._session_manager.get_all():
            if not session.ws.closed:
                asyncio.create_task(_close_ws(session.ws))


# ---------------------------------------------------------------------------
# Per-token: paused switch
# ---------------------------------------------------------------------------

class HarvestTokenPausedSwitch(SwitchEntity):
    """switch.harvest_{label}_paused

    Mirrors token.paused. Turning it on pauses the token (auth refused,
    existing sessions closed by ws_proxy keepalive check); turning it off
    resumes. Entity ID follows: switch.harvest_{label_slug}_paused.
    """

    _attr_has_entity_name = False
    _attr_should_poll = False
    _attr_available = True
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(
        self,
        token_id: str,
        label_slug: str,
        token_manager: TokenManager,
    ) -> None:
        self._token_id = token_id
        self._label_slug = label_slug
        self._token_manager = token_manager
        self._attr_unique_id = f"harvest_token_{token_id}_paused"
        self._attr_name = f"HArvest {label_slug} Paused"
        self._attr_icon = "mdi:pause-circle"
        self.entity_id = f"switch.harvest_{label_slug}_paused"

    @property
    def is_on(self) -> bool:
        token = self._token_manager.get(self._token_id)
        return bool(token and token.paused)

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._token_manager.update(self._token_id, {"paused": True})
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._token_manager.update(self._token_id, {"paused": False})
        self.async_write_ha_state()
