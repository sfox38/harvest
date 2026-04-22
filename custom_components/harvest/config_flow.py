"""Config flow for the HArvest integration.

Collects no required user input on initial setup. All configuration lives
in the panel Settings screen. This flow just registers the config entry.

Design decision (open question #5): the config flow prompts for nothing
and creates the entry immediately on confirmation. HA's standard "Add
Integration" dialog shows the integration name and a single Confirm button.
"""
from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback

from .const import DOMAIN


class HarvestConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the HArvest config flow.

    Single step: confirm installation. No user input required.
    Only one config entry is permitted at a time.
    """

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle the initial step.

        Shows a confirmation form on first visit. Creates the entry on submit.
        Aborts if an entry already exists (only one HArvest instance per HA).
        """
        # Prevent duplicate entries.
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title="HArvest", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
            description_placeholders={},
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> HarvestOptionsFlow:
        """Return the options flow handler."""
        return HarvestOptionsFlow(config_entry)


class HarvestOptionsFlow(config_entries.OptionsFlow):
    """Handle HArvest options.

    Options are managed via the panel Settings screen rather than through
    HA's options flow UI. This stub is present so that HA's integration
    card shows an Options button, which opens the panel directly.

    All actual option persistence is handled by HarvestConfigView.patch()
    in http_views.py via hass.config_entries.async_update_entry().
    """

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Redirect the user to the HArvest panel for configuration."""
        if user_input is not None:
            return self.async_create_entry(title="", data=self._config_entry.options)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({}),
            description_placeholders={
                "panel_url": "/harvest",
            },
        )
