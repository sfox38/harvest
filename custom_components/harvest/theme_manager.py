"""Theme management for the HArvest integration.

Manages bundled and user-created widget themes. Bundled themes are loaded
from JSON files in the themes/ subdirectory. Custom themes are persisted
via HA's Store helper in a separate storage key (harvest_themes).
"""
from __future__ import annotations

import dataclasses
import json
import logging
import secrets
from datetime import datetime, timezone
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import BASE62_ALPHABET, THEME_ID_LENGTH, THEME_PREFIX

_LOGGER = logging.getLogger(__name__)

THEMES_STORAGE_KEY = "harvest_themes"
THEMES_STORAGE_VERSION = 1

_THEMES_DIR = Path(__file__).parent / "themes"
_CUSTOM_THUMBNAILS_DIR = _THEMES_DIR / "custom"

_BUNDLED_IDS = {"default", "glass", "access", "minimus"}

_MAX_THUMBNAIL_BYTES = 512 * 1024  # 500 KB
_ALLOWED_THUMBNAIL_TYPES = {".png", ".jpg", ".jpeg"}


@dataclasses.dataclass
class ThemeDefinition:
    """A widget theme definition with CSS custom property variables."""
    theme_id: str
    name: str
    author: str
    version: str
    harvest_version: int
    variables: dict[str, str]
    dark_variables: dict[str, str]
    created_at: str
    renderer_pack: str = ""
    created_by: str = ""
    is_bundled: bool = False


class ThemeManager:
    """Manages theme persistence and lifecycle."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, THEMES_STORAGE_VERSION, THEMES_STORAGE_KEY)
        self._bundled: dict[str, ThemeDefinition] = {}
        self._custom: dict[str, ThemeDefinition] = {}

    async def load(self) -> dict[str, str | None]:
        """Load bundled themes from disk and custom themes from HA storage.

        Returns a dict mapping theme_id to an error string (or None on success)
        for each bundled theme file attempted.
        """
        self._bundled = {}
        results: dict[str, str | None] = {}
        for filename in ("default.json", "glass.json", "access.json", "minimus.json"):
            path = _THEMES_DIR / filename
            theme_id = filename.removesuffix(".json")
            try:
                text = await self._hass.async_add_executor_job(
                    path.read_text, "utf-8",
                )
                raw = json.loads(text)
                self._bundled[theme_id] = ThemeDefinition(
                    theme_id=theme_id,
                    name=raw.get("name", theme_id.title()),
                    author=raw.get("author", ""),
                    version=raw.get("version", "1.0"),
                    harvest_version=raw.get("harvest_version", 1),
                    variables=raw.get("variables", {}),
                    dark_variables=raw.get("dark_variables", {}),
                    renderer_pack=raw.get("renderer_pack", ""),
                    created_by="system",
                    created_at="",
                    is_bundled=True,
                )
                results[theme_id] = None
            except Exception as exc:
                _LOGGER.warning("HArvest: failed to load bundled theme %s: %s", filename, exc)
                results[theme_id] = str(exc)

        self._custom = {}
        raw = await self._store.async_load()
        if not raw:
            return results
        for item in raw.get("themes", []):
            try:
                theme = _theme_from_dict(item)
            except (KeyError, TypeError):
                _LOGGER.warning("HArvest: skipping malformed theme: %s", item)
                continue
            self._custom[theme.theme_id] = theme
        return results

    async def _save(self) -> None:
        """Persist custom themes to HA storage."""
        await self._store.async_save(
            {"themes": [_theme_to_dict(t) for t in self._custom.values()]}
        )

    def _generate_id(self) -> str:
        """Generate a unique theme ID with hth_ prefix."""
        while True:
            candidate = THEME_PREFIX + "".join(
                secrets.choice(BASE62_ALPHABET) for _ in range(THEME_ID_LENGTH)
            )
            if candidate not in self._custom:
                return candidate

    def get(self, theme_id: str) -> ThemeDefinition | None:
        """Return a theme by ID, checking both bundled and custom."""
        return self._bundled.get(theme_id) or self._custom.get(theme_id)

    def name_exists(self, name: str, exclude_id: str | None = None) -> bool:
        """Return True if any theme already uses this name (case-insensitive)."""
        lower = name.lower()
        for theme in list(self._bundled.values()) + list(self._custom.values()):
            if theme.theme_id == exclude_id:
                continue
            if theme.name.lower() == lower:
                return True
        return False

    def get_all(self) -> list[ThemeDefinition]:
        """Return all themes, bundled first then custom."""
        return list(self._bundled.values()) + list(self._custom.values())

    async def create(
        self,
        name: str,
        variables: dict[str, str],
        dark_variables: dict[str, str] | None,
        created_by: str,
        author: str = "",
        version: str = "1.0",
        renderer_pack: str = "",
    ) -> ThemeDefinition:
        """Create and persist a new custom theme."""
        theme = ThemeDefinition(
            theme_id=self._generate_id(),
            name=name,
            author=author,
            version=version,
            harvest_version=1,
            variables=variables,
            dark_variables=dark_variables or {},
            renderer_pack=renderer_pack,
            created_by=created_by,
            created_at=datetime.now(tz=timezone.utc).isoformat(),
            is_bundled=False,
        )
        self._custom[theme.theme_id] = theme
        await self._save()
        return theme

    async def update(self, theme_id: str, updates: dict) -> ThemeDefinition:
        """Update a custom theme. Raises ValueError for bundled, KeyError if not found."""
        if theme_id in self._bundled:
            raise ValueError("Cannot modify a bundled theme.")
        theme = self._custom.get(theme_id)
        if theme is None:
            raise KeyError(f"Theme not found: {theme_id}")

        _UPDATABLE = {"name", "author", "version", "variables", "dark_variables", "renderer_pack"}
        for field, value in updates.items():
            if field in _UPDATABLE:
                setattr(theme, field, value)

        await self._save()
        return theme

    async def delete(self, theme_id: str) -> None:
        """Delete a custom theme. Raises ValueError for bundled, KeyError if not found."""
        if theme_id in self._bundled:
            raise ValueError("Cannot delete a bundled theme.")
        if theme_id not in self._custom:
            raise KeyError(f"Theme not found: {theme_id}")
        del self._custom[theme_id]
        self.delete_thumbnail(theme_id)
        await self._save()

    # -- Thumbnail helpers ---------------------------------------------------

    def get_thumbnail_path(self, theme_id: str) -> Path | None:
        """Return the path to a theme's thumbnail, or None if no thumbnail exists."""
        if theme_id in self._bundled:
            for ext in (".png", ".jpg", ".jpeg"):
                path = _THEMES_DIR / f"{theme_id}{ext}"
                if path.is_file():
                    return path
        else:
            for ext in (".png", ".jpg", ".jpeg"):
                path = _CUSTOM_THUMBNAILS_DIR / f"{theme_id}{ext}"
                if path.is_file():
                    return path
        return None

    def get_fallback_thumbnail_path(self) -> Path:
        """Return the path to the nothumbnail.png fallback image."""
        return _THEMES_DIR / "nothumbnail.png"

    def has_thumbnail(self, theme_id: str) -> bool:
        """Check whether a theme has a thumbnail image."""
        return self.get_thumbnail_path(theme_id) is not None

    def save_thumbnail(self, theme_id: str, data: bytes, extension: str) -> Path:
        """Save a thumbnail image for a custom theme. Returns the saved path."""
        if theme_id in self._bundled:
            raise ValueError("Cannot modify bundled theme thumbnails.")
        if theme_id not in self._custom:
            raise KeyError(f"Theme not found: {theme_id}")
        ext = extension.lower()
        if ext not in _ALLOWED_THUMBNAIL_TYPES:
            raise ValueError(f"Unsupported image type: {ext}")
        if len(data) > _MAX_THUMBNAIL_BYTES:
            raise ValueError(f"Image too large (max {_MAX_THUMBNAIL_BYTES // 1024} KB).")
        _CUSTOM_THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)
        for old_ext in (".png", ".jpg", ".jpeg"):
            old = _CUSTOM_THUMBNAILS_DIR / f"{theme_id}{old_ext}"
            if old.is_file():
                old.unlink()
        path = _CUSTOM_THUMBNAILS_DIR / f"{theme_id}{ext}"
        path.write_bytes(data)
        return path

    def delete_thumbnail(self, theme_id: str) -> bool:
        """Delete a custom theme's thumbnail. Returns True if a file was removed."""
        for ext in (".png", ".jpg", ".jpeg"):
            path = _CUSTOM_THUMBNAILS_DIR / f"{theme_id}{ext}"
            if path.is_file():
                path.unlink()
                return True
        return False


def _theme_to_dict(theme: ThemeDefinition) -> dict:
    """Serialise a ThemeDefinition to a JSON-compatible dict for storage."""
    return {
        "theme_id": theme.theme_id,
        "name": theme.name,
        "author": theme.author,
        "version": theme.version,
        "harvest_version": theme.harvest_version,
        "variables": theme.variables,
        "dark_variables": theme.dark_variables,
        "renderer_pack": theme.renderer_pack,
        "created_by": theme.created_by,
        "created_at": theme.created_at,
    }


def _theme_from_dict(d: dict) -> ThemeDefinition:
    """Deserialise a ThemeDefinition from a storage dict."""
    return ThemeDefinition(
        theme_id=d["theme_id"],
        name=d["name"],
        author=d.get("author", ""),
        version=d.get("version", "1.0"),
        harvest_version=d.get("harvest_version", 1),
        variables=d.get("variables", {}),
        dark_variables=d.get("dark_variables", {}),
        renderer_pack=d.get("renderer_pack", ""),
        created_by=d.get("created_by", ""),
        created_at=d.get("created_at", ""),
        is_bundled=False,
    )


def theme_to_api_dict(theme: ThemeDefinition, has_thumbnail: bool = False) -> dict:
    """Serialise a ThemeDefinition for API responses (includes is_bundled)."""
    d = _theme_to_dict(theme)
    d["is_bundled"] = theme.is_bundled
    d["has_thumbnail"] = has_thumbnail
    return d


def theme_url_to_id(theme_url: str) -> str:
    """Map a token's theme_url value to a theme_id.

    "" -> "default", "bundled:X" -> "X", "custom:hth_xxx" -> "hth_xxx".
    """
    if not theme_url:
        return "default"
    if theme_url.startswith("bundled:"):
        return theme_url.removeprefix("bundled:")
    if theme_url.startswith("custom:"):
        return theme_url.removeprefix("custom:")
    return theme_url
