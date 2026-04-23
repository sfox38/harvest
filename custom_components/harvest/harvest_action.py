"""harvest_action virtual entity domain for the HArvest integration.

A harvest_action is a named, server-side action definition stored by the
integration. It has a friendly name, an entity ID of the form
harvest_action.{slug}, and a list of HA service calls to execute when
triggered. The public widget sends only action: "trigger" and has no
knowledge of what services will be called.

Design decision (open question #1): action definitions are stored in a
separate Store key ("harvest_actions") parallel to "harvest_tokens",
not alongside tokens or in the config entry data.
"""
from __future__ import annotations

import dataclasses
import logging
import re
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

if TYPE_CHECKING:
    from .session_manager import Session

_LOGGER = logging.getLogger(__name__)

ACTIONS_STORAGE_KEY = "harvest_actions"
ACTIONS_STORAGE_VERSION = 1

@dataclasses.dataclass
class ServiceCall:
    """A single HA service call to execute as part of a harvest_action."""
    domain: str
    service: str
    data: dict


@dataclasses.dataclass
class HarvestActionDefinition:
    """A named, pre-approved action exposed as a virtual HA entity."""
    action_id: str
    label: str
    icon: str                               # MDI icon name
    service_calls: list[ServiceCall]
    created_by: str
    created_at: str                         # ISO 8601


class HarvestActionManager:
    """Manages harvest_action virtual entity definitions and execution."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, ACTIONS_STORAGE_VERSION, ACTIONS_STORAGE_KEY)
        self._actions: dict[str, HarvestActionDefinition] = {}

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    async def load(self) -> None:
        """Load action definitions from storage and register HA entities."""
        raw = await self._store.async_load()
        if not raw:
            return
        for item in raw.get("actions", []):
            try:
                action = _action_from_dict(item)
            except (KeyError, TypeError):
                _LOGGER.warning("HArvest: skipping malformed action definition: %s", item)
                continue
            self._actions[action.action_id] = action
            self._register_entity_state(action, "idle")

    async def _save(self) -> None:
        """Persist all action definitions to HA storage."""
        await self._store.async_save(
            {"actions": [_action_to_dict(a) for a in self._actions.values()]}
        )

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create(
        self,
        label: str,
        icon: str,
        service_calls: list[ServiceCall],
        created_by: str,
    ) -> HarvestActionDefinition:
        """Create a new harvest_action definition and register it as a HA entity.

        Generates a slug from the label (lowercase, spaces to underscores,
        non-alphanumeric removed). Ensures uniqueness by appending a numeric
        suffix if needed. Registers the entity state in HA's state machine.
        Saves to storage.
        """
        base_slug = _slugify(label)
        action_id = _unique_slug(base_slug, set(self._actions.keys()))

        action = HarvestActionDefinition(
            action_id=action_id,
            label=label,
            icon=icon,
            service_calls=service_calls,
            created_by=created_by,
            created_at=datetime.now(tz=timezone.utc).isoformat(),
        )
        self._actions[action_id] = action
        self._register_entity_state(action, "idle")
        await self._save()
        return action

    async def update(
        self,
        action_id: str,
        label: str | None = None,
        icon: str | None = None,
        service_calls: list[ServiceCall] | None = None,
    ) -> HarvestActionDefinition:
        """Update an existing harvest_action definition.

        Only provided fields are changed. Raises KeyError if not found.
        """
        action = self._actions.get(action_id)
        if action is None:
            raise KeyError(f"harvest_action not found: {action_id}")

        if label is not None:
            action.label = label
        if icon is not None:
            action.icon = icon
        if service_calls is not None:
            action.service_calls = service_calls

        self._register_entity_state(action, "idle")
        await self._save()
        return action

    async def delete(self, action_id: str) -> None:
        """Remove a harvest_action definition and unregister its HA entity.

        Raises KeyError if action_id not found.
        """
        if action_id not in self._actions:
            raise KeyError(f"harvest_action not found: {action_id}")

        entity_id = self.get_entity_id(action_id)

        # Remove from HA state machine.
        self._hass.states.async_remove(entity_id)

        # Remove from entity registry if present.
        registry = er.async_get(self._hass)
        entry = registry.async_get(entity_id)
        if entry is not None:
            registry.async_remove(entity_id)

        del self._actions[action_id]
        await self._save()

    async def trigger(self, action_id: str, session: "Session") -> None:
        """Execute the service calls for a harvest_action.

        Raises KeyError if action_id not found.
        Executes each ServiceCall in order using hass.async_create_task().
        Fire-and-forget: returns immediately without waiting for service completion.
        Logs each call at debug level with the session origin for audit.
        If a service call fails, it is logged but does not affect subsequent calls.
        """
        action = self._actions.get(action_id)
        if action is None:
            raise KeyError(f"harvest_action not found: {action_id}")

        self._hass.async_create_task(
            self._execute_and_reset(action, session)
        )

    async def _execute_and_reset(
        self, action: HarvestActionDefinition, session: "Session"
    ) -> None:
        """Execute all service calls and briefly set entity state to 'triggered'."""
        entity_id = self.get_entity_id(action.action_id)

        # Transition to "triggered".
        self._hass.states.async_set(
            entity_id,
            "triggered",
            {"friendly_name": action.label, "icon": action.icon},
        )

        for sc in action.service_calls:
            _LOGGER.debug(
                "HArvest: executing %s.%s for harvest_action %s (origin=%s)",
                sc.domain, sc.service, action.action_id, session.origin_validated,
            )
            try:
                await self._hass.services.async_call(
                    sc.domain, sc.service, sc.data, blocking=True
                )
            except Exception:
                _LOGGER.exception(
                    "HArvest: service call %s.%s failed for harvest_action %s.",
                    sc.domain, sc.service, action.action_id,
                )

        # Revert to "idle".
        self._hass.states.async_set(
            entity_id,
            "idle",
            {"friendly_name": action.label, "icon": action.icon},
        )

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def get(self, action_id: str) -> HarvestActionDefinition | None:
        """Return an action definition by ID, or None."""
        return self._actions.get(action_id)

    def get_all(self) -> list[HarvestActionDefinition]:
        """Return all defined actions."""
        return list(self._actions.values())

    def get_entity_id(self, action_id: str) -> str:
        """Return the HA entity_id for a given action_id.

        Format: 'harvest_action.{action_id}'
        """
        return f"harvest_action.{action_id}"

    def build_entity_definition_payload(self, action_id: str) -> dict | None:
        """Build the entity_definition message payload for a harvest_action.

        Returns a dict with all required fields. Returns None if action_id not found.
        """
        action = self._actions.get(action_id)
        if action is None:
            return None

        entity_id = self.get_entity_id(action_id)
        icon = action.icon

        return {
            "entity_id": entity_id,
            "domain": "harvest_action",
            "device_class": None,
            "friendly_name": action.label,
            "supported_features": [],
            "feature_config": {},
            "icon": icon,
            "icon_state_map": {"triggered": icon, "idle": icon},
            "support_tier": 1,
            "renderer": "HarvestActionCard",
            "unit_of_measurement": None,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _register_entity_state(
        self, action: HarvestActionDefinition, state: str
    ) -> None:
        """Write the entity state to HA's state machine and entity registry."""
        entity_id = self.get_entity_id(action.action_id)

        # Register in entity registry so it appears in the UI.
        registry = er.async_get(self._hass)
        if registry.async_get(entity_id) is None:
            registry.async_get_or_create(
                domain="harvest_action",
                platform="harvest",
                unique_id=f"harvest_action_{action.action_id}",
                suggested_object_id=action.action_id,
            )

        self._hass.states.async_set(
            entity_id,
            state,
            {"friendly_name": action.label, "icon": action.icon},
        )


# ---------------------------------------------------------------------------
# Module-level serialisation helpers
# ---------------------------------------------------------------------------

def _slugify(label: str) -> str:
    """Convert a label to a lowercase slug with underscores."""
    slug = label.lower().strip()
    slug = re.sub(r"[\s\-]+", "_", slug)
    slug = re.sub(r"[^a-z0-9_]", "", slug)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug or "action"


def _unique_slug(base: str, existing: set[str]) -> str:
    """Return base if not in existing, otherwise base_2, base_3, etc."""
    if base not in existing:
        return base
    n = 2
    while f"{base}_{n}" in existing:
        n += 1
    return f"{base}_{n}"


def _action_to_dict(action: HarvestActionDefinition) -> dict:
    """Serialise a HarvestActionDefinition to a JSON-safe dict."""
    return {
        "action_id": action.action_id,
        "label": action.label,
        "icon": action.icon,
        "service_calls": [dataclasses.asdict(sc) for sc in action.service_calls],
        "created_by": action.created_by,
        "created_at": action.created_at,
    }


def _action_from_dict(d: dict) -> HarvestActionDefinition:
    """Deserialise a HarvestActionDefinition from a storage dict."""
    service_calls = [
        ServiceCall(domain=sc["domain"], service=sc["service"], data=sc.get("data", {}))
        for sc in d.get("service_calls", [])
    ]
    return HarvestActionDefinition(
        action_id=d["action_id"],
        label=d["label"],
        icon=d.get("icon", "mdi:play-circle"),
        service_calls=service_calls,
        created_by=d.get("created_by", ""),
        created_at=d.get("created_at", ""),
    )
