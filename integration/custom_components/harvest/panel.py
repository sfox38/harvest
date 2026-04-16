"""Sidebar panel registration for the HArvest integration.

Registers the custom panel with HA's frontend so the HArvest management UI
appears in the HA sidebar.
"""
from __future__ import annotations

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN, PANEL_PATH


def _panel_js_url(hass: HomeAssistant) -> str:
    """Return the js_url for the panel bundle, with a build-version query string.

    The build number is written to panel_version.txt by the frontend build
    script (scripts/increment-build.js) so each new build gets a distinct URL,
    preventing the browser from serving a stale cached bundle.
    """
    version_file = hass.config.path("custom_components", DOMAIN, "panel", "panel_version.txt")
    try:
        build = open(version_file).read().strip()  # noqa: WPS515
        return f"/{PANEL_PATH}/panel.js?v={build}"
    except OSError:
        return f"/{PANEL_PATH}/panel.js"


async def register_panel(hass: HomeAssistant) -> None:
    """Register the HArvest sidebar panel.

    Serves the panel/ directory as static files under /{PANEL_PATH}/.
    Registers the panel in the HA sidebar as 'HArvest' with the mdi:leaf icon.
    """
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            f"/{PANEL_PATH}",
            hass.config.path("custom_components", DOMAIN, "panel"),
            cache_headers=False,
        )
    ])

    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="HArvest",
        sidebar_icon="mdi:leaf",
        frontend_url_path=PANEL_PATH,
        config={"_panel_custom": {
            "name": "ha-panel-harvest",
            "js_url": _panel_js_url(hass),
            "embed_iframe": False,
            "trust_external": False,
        }},
        require_admin=False,
    )
