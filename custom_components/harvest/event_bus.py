"""HA event bus publisher for HArvest security events.

Publishes selected events to HA's event bus based on user configuration.
High-volume events (session_connected, auth_failure) are disabled by default
to avoid logbook noise on busy installs.
"""
from __future__ import annotations

from homeassistant.core import HomeAssistant

from .const import CONF_HA_EVENT_BUS, DEFAULTS


class EventBus:
    """Publishes HArvest security events to the HA event bus. One instance per entry."""

    def __init__(self, hass: HomeAssistant, config: dict) -> None:
        self._hass = hass
        self._event_config: dict[str, bool] = config.get(
            CONF_HA_EVENT_BUS, DEFAULTS[CONF_HA_EVENT_BUS]
        )

    def fire(self, event_name: str, data: dict) -> None:
        """Fire an event if it is enabled in config. Does nothing if disabled."""
        if self._event_config.get(event_name, False):
            self._hass.bus.async_fire(event_name, data)

    def token_revoked(self, token_id: str, label: str, reason: str | None) -> None:
        """Fire harvest_token_revoked if enabled.

        Payload:
            token_id:  str        - the revoked token's ID
            label:     str        - the token's human-readable label
            reason:    str | None - the revocation reason, or None if not provided
        """
        self.fire("harvest_token_revoked", {
            "token_id": token_id,
            "label": label,
            "reason": reason,
        })

    def suspicious_origin(self, token_id: str, origin: str, source_ip: str) -> None:
        """Fire harvest_suspicious_origin if enabled.

        Fired when an auth attempt arrives from an origin not in the token's allowed list.

        Payload:
            token_id:   str - the token ID the request was attempting to use
            origin:     str - the Origin header value from the request
            source_ip:  str - the client IP address (resolved via trusted_proxies if set)
        """
        self.fire("harvest_suspicious_origin", {
            "token_id": token_id,
            "origin": origin,
            "source_ip": source_ip,
        })

    def session_limit_reached(self, token_id: str, label: str) -> None:
        """Fire harvest_session_limit_reached if enabled.

        Fired when a new auth attempt is rejected because max_sessions is already reached.

        Payload:
            token_id:  str - the token that is at its session limit
            label:     str - the token's human-readable label
        """
        self.fire("harvest_session_limit_reached", {
            "token_id": token_id,
            "label": label,
        })

    def flood_protection(self, session_id: str, origin: str) -> None:
        """Fire harvest_flood_protection if enabled.

        Fired when a session is closed due to receiving too many malformed messages.

        Payload:
            session_id:  str - the terminated session ID
            origin:      str - the Origin header of the terminated session
        """
        self.fire("harvest_flood_protection", {
            "session_id": session_id,
            "origin": origin,
        })

    def session_connected(self, session_id: str, token_id: str, origin: str) -> None:
        """Fire harvest_session_connected if enabled (off by default).

        Fired each time a new session is successfully authenticated.

        Payload:
            session_id:  str - the new session ID
            token_id:    str - the token used to authenticate
            origin:      str - the Origin header of the connecting browser
        """
        self.fire("harvest_session_connected", {
            "session_id": session_id,
            "token_id": token_id,
            "origin": origin,
        })

    def auth_failure(
        self, token_id: str | None, origin: str, error_code: str
    ) -> None:
        """Fire harvest_auth_failure if enabled (off by default).

        Fired on every failed authentication attempt.

        Payload:
            token_id:    str | None - the token ID from the request, or None if not parseable
            origin:      str        - the Origin header from the request
            error_code:  str        - the HRV_* error code that caused the failure
        """
        self.fire("harvest_auth_failure", {
            "token_id": token_id,
            "origin": origin,
            "error_code": error_code,
        })
