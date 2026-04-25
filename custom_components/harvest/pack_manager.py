"""Renderer pack management for the HArvest integration.

Manages bundled and user-installed renderer packs. Packs are JS files that
override built-in widget renderers. The bundled "examples" pack ships with
the integration; custom packs can be added later.

Consent state (the AGREE gate) is stored separately from pack definitions
so that it persists across HA restarts and integration reloads.
"""
from __future__ import annotations

import dataclasses
import logging
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

PACKS_CONSENT_KEY = "harvest_packs_consent"
PACKS_CONSENT_VERSION = 1

_PACKS_DIR = Path(__file__).parent / "packs"


@dataclasses.dataclass
class PackDefinition:
    """A renderer pack definition."""
    pack_id: str
    name: str
    description: str
    version: str
    author: str
    is_bundled: bool = False


class PackManager:
    """Manages renderer pack definitions and consent state."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, PACKS_CONSENT_VERSION, PACKS_CONSENT_KEY)
        self._bundled: dict[str, PackDefinition] = {}
        self._agreed: bool = False

    async def load(self) -> None:
        """Load bundled pack definitions and consent state from HA storage."""
        self._bundled["examples"] = PackDefinition(
            pack_id="examples",
            name="Examples",
            description="Alternative renderers: dial-based light control and more.",
            version="1.0",
            author="HArvest",
            is_bundled=True,
        )

        raw = await self._store.async_load()
        if raw:
            self._agreed = bool(raw.get("agreed", False))

    @property
    def agreed(self) -> bool:
        """Whether the admin has consented to running renderer pack JS."""
        return self._agreed

    async def set_agreed(self, agreed: bool) -> None:
        """Persist the consent state."""
        self._agreed = agreed
        await self._store.async_save({"agreed": agreed})

    def get(self, pack_id: str) -> PackDefinition | None:
        """Return a pack by ID, or None if not found."""
        return self._bundled.get(pack_id)

    def get_all(self) -> list[PackDefinition]:
        """Return all available packs."""
        return list(self._bundled.values())

    def get_pack_path(self, pack_id: str) -> Path | None:
        """Return the path to a pack's JS file, or None if it does not exist."""
        if pack_id in self._bundled:
            path = _PACKS_DIR / f"{pack_id}.js"
            return path if path.is_file() else None
        return None
