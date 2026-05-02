"""Renderer pack management for the HArvest integration.

Manages bundled and user-installed renderer packs. Packs are JS files that
override built-in widget renderers. The bundled "minimus" pack ships with
the integration; user packs are stored as JS files in packs/user/ with
filenames matching their paired theme ID.

Consent state (the AGREE gate) is stored separately so that it persists
across HA restarts and integration reloads.
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
_USER_PACKS_DIR = _PACKS_DIR / "user"


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
        self._consent_store: Store = Store(hass, PACKS_CONSENT_VERSION, PACKS_CONSENT_KEY)
        self._bundled: dict[str, PackDefinition] = {}
        self._agreed: bool = False

    async def load(self) -> None:
        """Load bundled pack definitions and consent state."""
        self._bundled["minimus"] = PackDefinition(
            pack_id="minimus",
            name="Minimus",
            description="Alternative renderers: dial-based light control and more.",
            version="1.0",
            author="HArvest",
            is_bundled=True,
        )

        raw = await self._consent_store.async_load()
        if raw:
            self._agreed = bool(raw.get("agreed", False))

    @property
    def agreed(self) -> bool:
        """Whether the admin has consented to running renderer pack JS."""
        return self._agreed

    async def set_agreed(self, agreed: bool) -> None:
        """Persist the consent state."""
        self._agreed = agreed
        await self._consent_store.async_save({"agreed": agreed})

    def get(self, pack_id: str) -> PackDefinition | None:
        """Return a bundled pack by ID, or None."""
        return self._bundled.get(pack_id)

    def get_all(self) -> list[PackDefinition]:
        """Return all bundled packs."""
        return list(self._bundled.values())

    def get_pack_path(self, pack_id: str) -> Path | None:
        """Return the path to a pack's JS file, or None if it does not exist.

        Checks bundled packs first, then user packs in packs/user/.
        """
        if ".." in pack_id or "/" in pack_id or "\\" in pack_id:
            return None
        if pack_id in self._bundled:
            path = _PACKS_DIR / f"{pack_id}.js"
            return path if path.is_file() else None
        path = _USER_PACKS_DIR / f"{pack_id}.js"
        return path if path.is_file() else None

    def has_user_pack(self, pack_id: str) -> bool:
        """Check whether a user pack JS file exists for the given ID."""
        return (_USER_PACKS_DIR / f"{pack_id}.js").is_file()

    def get_code(self, pack_id: str) -> str | None:
        """Read JS source code for a pack. Returns None if file not found."""
        path = self.get_pack_path(pack_id)
        if path is None:
            return None
        return path.read_text("utf-8")

    async def update_code(self, pack_id: str, js_code: str) -> None:
        """Write JS source code for a user pack. Raises ValueError for bundled."""
        if pack_id in self._bundled:
            raise ValueError("Cannot modify bundled pack code.")
        await self._hass.async_add_executor_job(self._write_code, pack_id, js_code)

    async def delete_user_pack(self, pack_id: str) -> None:
        """Delete a user pack's JS file."""
        if pack_id in self._bundled:
            raise ValueError("Cannot delete a bundled pack.")
        await self._hass.async_add_executor_job(self._delete_pack_file, pack_id)

    @staticmethod
    def _write_code(pack_id: str, js_code: str) -> None:
        """Write pack JS to disk (runs in executor)."""
        _USER_PACKS_DIR.mkdir(parents=True, exist_ok=True)
        path = _USER_PACKS_DIR / f"{pack_id}.js"
        path.write_text(js_code, "utf-8")

    @staticmethod
    def _delete_pack_file(pack_id: str) -> None:
        """Remove a user pack's JS file (runs in executor)."""
        path = _USER_PACKS_DIR / f"{pack_id}.js"
        if path.is_file():
            path.unlink()


def pack_to_api_dict(pack: PackDefinition) -> dict:
    """Serialise a PackDefinition for API responses."""
    return {
        "pack_id": pack.pack_id,
        "name": pack.name,
        "description": pack.description,
        "version": pack.version,
        "author": pack.author,
        "is_bundled": pack.is_bundled,
    }
