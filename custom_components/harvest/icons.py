"""MDI icon name validation for the HArvest integration.

Provides a lightweight check that an icon string follows the MDI naming
convention (mdi:<name>) without requiring the full MDI icon set to be
bundled server-side. The widget bundles the actual SVG paths; this module
only validates that a user-supplied icon string is plausibly an MDI icon
before storing it (e.g. in a HarvestActionDefinition).
"""
from __future__ import annotations

import re

# MDI icon names: lowercase letters, digits, and hyphens after the prefix.
_MDI_PATTERN = re.compile(r"^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$")


def is_valid_mdi_icon(icon: str) -> bool:
    """Return True if icon is a plausibly valid MDI icon name.

    Accepts strings matching mdi:<name> where <name> consists of lowercase
    alphanumeric segments joined by hyphens (e.g. mdi:lightbulb-outline).
    Does not validate that the icon actually exists in the MDI library -
    that check is deferred to the widget which renders the icon.
    """
    return bool(_MDI_PATTERN.match(icon))


def coerce_mdi_icon(icon: str, fallback: str = "mdi:help-circle") -> str:
    """Return icon if valid, otherwise return fallback.

    Used when storing user-supplied icon values to avoid persisting
    obviously malformed strings.
    """
    return icon if is_valid_mdi_icon(icon) else fallback
