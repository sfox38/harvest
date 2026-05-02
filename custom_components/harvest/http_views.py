"""HTTP API views for the HArvest panel.

This is an internal API between the bundled panel JS and the integration.
It is not a public protocol. All endpoints require HA authentication.
All endpoints are prefixed with /api/harvest/.
"""
from __future__ import annotations

import asyncio
import dataclasses
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_LOGGER = logging.getLogger(__name__)

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .activity_store import ActivityStore, TokenLifecycleEvent
from .control_entities import ControlEntities
from .diagnostic_sensors import DiagnosticSensors
from .entity_definition import build_entity_definition
from .event_bus import EventBus
from .harvest_action import HarvestActionManager, ServiceCall
from .session_manager import SessionManager
from .pack_manager import PackManager, pack_to_api_dict
from .theme_manager import ThemeManager, theme_to_api_dict, theme_url_to_id
from .const import ERR_TOKEN_INACTIVE
from .token_manager import (
    ActiveSchedule,
    ActiveScheduleWindow,
    EntityAccess,
    OriginConfig,
    RateLimitConfig,
    SessionConfig,
    Token,
    TokenManager,
)


async def _close_ws_with_auth_failed(ws) -> None:
    """Send auth_failed before closing so the client knows it is an auth
    rejection, not a connectivity issue."""
    try:
        await ws.send_json({"type": "auth_failed", "code": ERR_TOKEN_INACTIVE, "msg_id": None})
        await ws.close()
    except Exception:
        pass


def register_views(
    hass: HomeAssistant,
    token_manager: TokenManager,
    session_manager: SessionManager,
    activity_store: ActivityStore,
    action_manager: HarvestActionManager,
    sensors: DiagnosticSensors,
    event_bus: EventBus | None = None,
    theme_manager: ThemeManager | None = None,
    pack_manager: PackManager | None = None,
    controls: ControlEntities | None = None,
) -> None:
    """Register all HTTP API views with HA's HTTP server.

    All views are prefixed with /api/harvest/.
    All views require HA authentication (panel runs in authenticated context).
    """
    hass.http.register_view(HarvestTokensView(token_manager, session_manager, activity_store, sensors=sensors, controls=controls))
    hass.http.register_view(HarvestTokenDetailView(hass, token_manager, session_manager, activity_store, event_bus, theme_manager, pack_manager, sensors=sensors, controls=controls))
    hass.http.register_view(HarvestSessionsView(session_manager))
    hass.http.register_view(HarvestSessionTerminateView(session_manager))
    hass.http.register_view(HarvestActivityView(activity_store, token_manager))
    hass.http.register_view(HarvestActionsView(action_manager))
    hass.http.register_view(HarvestActionDetailView(action_manager))
    if theme_manager is not None:
        hass.http.register_view(HarvestThemesView(theme_manager, token_manager, pack_manager))
        hass.http.register_view(HarvestThemeReloadView(theme_manager, token_manager, session_manager, pack_manager))
        hass.http.register_view(HarvestThemeDetailView(theme_manager, token_manager, session_manager, pack_manager))
        hass.http.register_view(HarvestThemeThumbnailView(hass, theme_manager))
        _LOGGER.debug("HArvest: registered theme views")
    if pack_manager is not None:
        hass.http.register_view(HarvestPacksView(pack_manager))
        hass.http.register_view(HarvestPackAgreeView(pack_manager))
        hass.http.register_view(HarvestPackFileView(hass, pack_manager))
        hass.http.register_view(HarvestPackDetailView(pack_manager))
        hass.http.register_view(HarvestPackCodeView(hass, pack_manager))
        _LOGGER.warning("HArvest: registered pack views")
    hass.http.register_view(HarvestConfigView(hass, session_manager))
    hass.http.register_view(HarvestStatsView(sensors, activity_store, session_manager, token_manager))
    # Additional views needed by the wizard flow.
    hass.http.register_view(HarvestAliasView(token_manager))
    hass.http.register_view(HarvestPreviewTokenView(token_manager))
    hass.http.register_view(HarvestActivityExportView(activity_store))
    hass.http.register_view(HarvestAggregatesView(activity_store))
    hass.http.register_view(HarvestEntitiesView(hass))
    hass.http.register_view(HarvestPanelJsView(hass))


# ---------------------------------------------------------------------------
# Serialisation helpers
# ---------------------------------------------------------------------------

def _token_to_dict(token: Token) -> dict:
    """Serialise a Token to a JSON-safe dict."""
    d = dataclasses.asdict(token)
    d["created_at"] = token.created_at.isoformat()
    d["expires"] = token.expires.isoformat() if token.expires else None
    d["revoked_at"] = token.revoked_at.isoformat() if token.revoked_at else None
    # Never expose token_secret in API responses.
    d["token_secret"] = bool(token.token_secret)  # True/False: secret is set
    return d


def _session_to_dict(session) -> dict:
    """Serialise a Session to a JSON-safe dict (no WebSocket reference)."""
    return {
        "session_id": session.session_id,
        "token_id": session.token_id,
        "token_version": session.token_version,
        "issued_at": session.issued_at.isoformat(),
        "expires_at": session.expires_at.isoformat(),
        "absolute_expires_at": session.absolute_expires_at.isoformat(),
        "renewal_count": session.renewal_count,
        "origin": session.origin_validated,
        "referer": session.referer_validated,
        "ip_address": session.source_ip,
        "subscribed_entity_ids": list(session.subscribed_entity_ids),
        "last_message_at": session.last_message_at.isoformat(),
    }


def _parse_dt(value: Any) -> datetime | None:
    """Parse an ISO 8601 datetime string to a timezone-aware datetime, or None if empty/invalid."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _parse_origins(raw: dict) -> OriginConfig:
    return OriginConfig(
        allow_any=bool(raw.get("allow_any", False)),
        allowed=list(raw.get("allowed", [])),
        allow_paths=list(raw.get("allow_paths", [])),
    )


def _parse_rate_limits(raw: dict) -> RateLimitConfig:
    from .const import CONF_DEFAULT_RATE_LIMITS, DEFAULTS
    rl_defaults = DEFAULTS[CONF_DEFAULT_RATE_LIMITS]
    return RateLimitConfig(
        max_push_per_second=int(raw.get("max_push_per_second", rl_defaults["max_push_per_second"])),
        max_commands_per_minute=int(raw.get("max_commands_per_minute", rl_defaults["max_commands_per_minute"])),
        override_defaults=bool(raw.get("override_defaults", False)),
    )


def _parse_session_config(raw: dict) -> SessionConfig:
    return SessionConfig(
        lifetime_minutes=int(raw.get("lifetime_minutes", 60)),
        max_lifetime_minutes=int(raw.get("max_lifetime_minutes", 1440)),
        max_renewals=raw.get("max_renewals"),
        absolute_lifetime_hours=raw.get("absolute_lifetime_hours"),
    )


_VALID_CAPABILITIES = ("read", "read-write")
_ENTITY_ID_RE = re.compile(r"^[a-z0-9_]+\.[a-z0-9_]+$")


def _parse_gesture_config(raw: dict) -> dict:
    """Validate and normalise a gesture_config dict.

    Shape: { "tap"?: Action, "hold"?: Action, "double_tap"?: Action }
    where Action = { "action": str, "data"?: dict } | null.
    Unknown keys are ignored. Raises ValueError on invalid input.
    """
    result: dict = {}
    for key in ("tap", "hold", "double_tap"):
        val = raw.get(key)
        if val is None:
            continue
        if not isinstance(val, dict):
            raise ValueError(f"gesture_config.{key} must be a dict or null.")
        action = val.get("action", "")
        if not isinstance(action, str) or not action:
            raise ValueError(f"gesture_config.{key}.action must be a non-empty string.")
        data = val.get("data")
        if data is not None and not isinstance(data, dict):
            raise ValueError(f"gesture_config.{key}.data must be a dict or absent.")
        entry: dict = {"action": action}
        entity_id = val.get("entity_id")
        if entity_id is not None:
            if not isinstance(entity_id, str) or not entity_id:
                raise ValueError(f"gesture_config.{key}.entity_id must be a non-empty string.")
            entry["entity_id"] = entity_id
        if data:
            entry["data"] = data
        result[key] = entry
    return result


def _parse_entities(raw_list: list) -> list[EntityAccess]:
    from .entity_compatibility import get_support_tier
    entities = []
    for e in raw_list:
        entity_id = str(e["entity_id"])
        if not _ENTITY_ID_RE.match(entity_id):
            raise ValueError(f"Invalid entity_id {entity_id!r}; must match domain.slug.")
        domain = entity_id.split(".")[0]
        if get_support_tier(domain) == 3:
            raise ValueError(f"Domain '{domain}' is not supported (Tier 3).")
        cap = str(e.get("capabilities", "read"))
        if cap not in _VALID_CAPABILITIES:
            raise ValueError(f"Invalid capabilities {cap!r}; must be one of {_VALID_CAPABILITIES}")
        name_override = e.get("name_override") or None
        if name_override is not None:
            name_override = str(name_override).strip()
            if len(name_override) > 100:
                raise ValueError(f"name_override for {entity_id} exceeds 100 characters.")
            if not name_override:
                name_override = None

        icon_override = e.get("icon_override") or None
        if icon_override is not None:
            icon_override = str(icon_override).strip()
            if not icon_override.startswith("mdi:") or len(icon_override) > 64:
                raise ValueError(f"icon_override for {entity_id} must be a valid mdi:<name> key.")

        color_scheme = str(e.get("color_scheme", "auto"))
        if color_scheme not in ("auto", "light", "dark"):
            raise ValueError(f"Invalid color_scheme {color_scheme!r} for {entity_id}.")

        display_hints = e.get("display_hints")
        if display_hints is not None:
            if not isinstance(display_hints, dict):
                raise ValueError(f"display_hints for {entity_id} must be a dict.")
            display_hints = dict(display_hints)
        else:
            display_hints = {}

        entities.append(EntityAccess(
            entity_id=entity_id,
            capabilities=cap,
            alias=e.get("alias") or None,
            exclude_attributes=list(e.get("exclude_attributes", [])),
            companion_of=e.get("companion_of") or None,
            gesture_config=_parse_gesture_config(e.get("gesture_config", {})),
            name_override=name_override,
            icon_override=icon_override,
            color_scheme=color_scheme,
            display_hints=display_hints,
        ))
    return entities


_LABEL_ILLEGAL = re.compile(r"[\x00-\x1f<>\"&]")


def _validate_label(label: str, token_manager: TokenManager, exclude_token_id: str | None = None) -> str | None:
    """Return an error string if the label is invalid, else None."""
    stripped = label.strip()
    if not stripped:
        return "Name is required."
    if len(stripped) > 100:
        return "Name must be 100 characters or fewer."
    if _LABEL_ILLEGAL.search(stripped):
        return "Name contains invalid characters."
    for t in token_manager.get_all():
        if t.token_id == exclude_token_id:
            continue
        if t.status in ("revoked", "expired"):
            continue
        if t.label.strip().lower() == stripped.lower():
            return "A widget with this name already exists."
    return None


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base, returning a new dict.

    Nested dicts are merged rather than replaced, so partial updates to
    objects like default_session preserve keys not present in override.
    """
    result = dict(base)
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


_MIN_SECRET_LENGTH = 16


def _validate_token_secret(raw: Any) -> str | None:
    """Validate and return a token_secret value, or None if empty."""
    if not raw:
        return None
    secret = str(raw)
    if len(secret) < _MIN_SECRET_LENGTH:
        raise ValueError(
            f"token_secret must be at least {_MIN_SECRET_LENGTH} characters."
        )
    return secret


def _validate_max_sessions(raw: Any) -> int | None:
    """Validate and return a max_sessions value, or None if unset."""
    if raw is None:
        return None
    if not isinstance(raw, int) or isinstance(raw, bool) or raw < 1:
        raise ValueError("max_sessions must be a positive integer or null.")
    return raw


_DISPLAY_TEXT_MAX_LEN = 200
_DISPLAY_TEXT_FORBIDDEN_RE = re.compile(
    r"[<>\"';\\]"
    r"|--"
    r"|/\*"
    r"|\*/"
    r"|\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC)\b",
    re.IGNORECASE,
)


def _validate_display_text(raw: Any, field_name: str) -> str:
    """Validate a user-supplied display text field (offline_text, error_text)."""
    val = str(raw or "").strip()
    if len(val) > _DISPLAY_TEXT_MAX_LEN:
        raise web.HTTPBadRequest(
            reason=f"{field_name} must be {_DISPLAY_TEXT_MAX_LEN} characters or fewer.",
        )
    if val and _DISPLAY_TEXT_FORBIDDEN_RE.search(val):
        raise web.HTTPBadRequest(
            reason=f"{field_name} contains disallowed characters or keywords.",
        )
    return val


_VALID_DAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
_HH_MM_RE = re.compile(r"^\d{2}:\d{2}$")


def _parse_schedule(raw: dict | None) -> ActiveSchedule | None:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    if not raw:
        return None
    tz_str = str(raw["timezone"])
    try:
        ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, KeyError):
        raise ValueError(f"Invalid timezone: {tz_str!r}")
    windows = []
    for w in raw.get("windows", []):
        days = list(w["days"])
        for d in days:
            if d not in _VALID_DAYS:
                raise ValueError(f"Invalid day {d!r}; must be one of {sorted(_VALID_DAYS)}.")
        start = str(w["start"])
        end = str(w["end"])
        if not _HH_MM_RE.match(start):
            raise ValueError(f"Invalid start time {start!r}; must be HH:MM.")
        if not _HH_MM_RE.match(end):
            raise ValueError(f"Invalid end time {end!r}; must be HH:MM.")
        windows.append(ActiveScheduleWindow(days=days, start=start, end=end))
    return ActiveSchedule(timezone=tz_str, windows=windows)


# ---------------------------------------------------------------------------
# Token views
# ---------------------------------------------------------------------------

class HarvestTokensView(HomeAssistantView):
    """GET /api/harvest/tokens  - list all tokens.
    POST /api/harvest/tokens - create a new token.
    """

    url = "/api/harvest/tokens"
    name = "api:harvest:tokens"
    requires_auth = True

    def __init__(self, token_manager: TokenManager, session_manager: SessionManager, activity_store: ActivityStore, sensors: DiagnosticSensors | None = None, controls: ControlEntities | None = None) -> None:
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._activity_store = activity_store
        self._sensors = sensors
        self._controls = controls

    async def get(self, request: web.Request) -> web.Response:
        """Return all tokens with their active session counts."""
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        tokens = self._token_manager.get_all()
        result = []
        for t in tokens:
            d = _token_to_dict(t)
            d["active_sessions"] = self._session_manager.count_for_token(t.token_id)
            result.append(d)
        return self.json(result)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new token. Body: full token spec JSON."""
        user = request.get("hass_user")
        if user is None:
            raise web.HTTPUnauthorized()
        if not user.is_admin:
            raise web.HTTPForbidden()

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        try:
            entities = _parse_entities(body.get("entities", []))
            origins = _parse_origins(body.get("origins", {}))
            rate_limits = _parse_rate_limits(body.get("rate_limits", {}))
            session_cfg = _parse_session_config(body.get("session", {}))
            expires = _parse_dt(body.get("expires"))
            schedule = _parse_schedule(body.get("active_schedule"))
        except (KeyError, TypeError, ValueError) as exc:
            raise web.HTTPBadRequest(reason=f"Invalid request body: {exc}")

        raw_label = str(body.get("label", "Unnamed"))
        label_err = _validate_label(raw_label, self._token_manager)
        if label_err:
            raise web.HTTPBadRequest(reason=label_err)

        try:
            token = await self._token_manager.create(
                label=raw_label.strip(),
                created_by=user.id,
                origins=origins,
                entities=entities,
                expires=expires,
                token_secret=_validate_token_secret(body.get("token_secret")),
                rate_limits=rate_limits,
                session=session_cfg,
                max_sessions=_validate_max_sessions(body.get("max_sessions")),
                active_schedule=schedule,
                allowed_ips=list(body.get("allowed_ips", [])),
                embed_mode=str(body.get("embed_mode", "single")),
                theme_url=str(body.get("theme_url", "")),
            )
        except ValueError as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        self._activity_store.record_token_lifecycle(TokenLifecycleEvent(
            token_id=token.token_id,
            display_type="TOKEN_CREATED",
            reason=None,
            timestamp=datetime.now(timezone.utc),
            label=token.label,
        ))
        if self._sensors:
            await self._sensors.create_and_register_token_sensors(token.token_id, token.label)
        if self._controls:
            await self._controls.create_and_register_token_controls(token.token_id, token.label)
        return self.json(_token_to_dict(token), status_code=201)


class HarvestTokenDetailView(HomeAssistantView):
    """GET /api/harvest/tokens/{token_id}   - fetch one token.
    PATCH /api/harvest/tokens/{token_id}  - update token fields.
    DELETE /api/harvest/tokens/{token_id} - revoke or delete a token.
    """

    url = "/api/harvest/tokens/{token_id}"
    name = "api:harvest:token_detail"
    requires_auth = True

    def __init__(self, hass: HomeAssistant, token_manager: TokenManager, session_manager: SessionManager, activity_store: ActivityStore, event_bus: EventBus, theme_manager: ThemeManager | None = None, pack_manager: PackManager | None = None, sensors: DiagnosticSensors | None = None, controls: ControlEntities | None = None) -> None:
        self._hass = hass
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._activity_store = activity_store
        self._event_bus = event_bus
        self._theme_manager = theme_manager
        self._pack_manager = pack_manager
        self._sensors = sensors
        self._controls = controls

    async def _push_theme_to_sessions(self, token_id: str) -> None:
        """Push updated theme data to all active sessions for a token."""
        if not self._theme_manager:
            return
        token = self._token_manager.get(token_id)
        if not token:
            return
        theme_id = theme_url_to_id(token.theme_url)
        theme_def = self._theme_manager.get(theme_id)
        msg = {
            "type": "theme",
            "variables": theme_def.variables if theme_def else {},
            "dark_variables": theme_def.dark_variables if theme_def else {},
        }
        for session in self._session_manager.get_all_for_token(token_id):
            if not session.ws.closed:
                try:
                    await session.ws.send_json(msg)
                except Exception:
                    pass

    async def _push_renderer_pack_to_sessions(self, token_id: str) -> None:
        """Push renderer pack URL to all active sessions for a token."""
        token = self._token_manager.get(token_id)
        if not token:
            return
        msg: dict[str, Any] = {"type": "renderer_pack", "url": ""}
        if token.renderer_pack and self._pack_manager:
            path = self._pack_manager.get_pack_path(token.renderer_pack)
            if path:
                try:
                    mtime = int(path.stat().st_mtime)
                except OSError:
                    mtime = 0
                msg["url"] = f"/api/harvest/packs/{token.renderer_pack}.js?v={mtime}"
        for session in self._session_manager.get_all_for_token(token_id):
            if not session.ws.closed:
                try:
                    await session.ws.send_json(msg)
                except Exception:
                    pass

    async def _push_entity_definitions_to_sessions(
        self,
        token_id: str,
        changed_entity_ids: set[str] | None = None,
    ) -> None:
        """Push updated entity_definition messages to active sessions for a token.

        Called after entity capabilities, graph settings, or exclude_attributes
        change so that connected widgets reflect the new configuration without
        requiring a reconnect. Also reconciles companion subscriptions.

        If changed_entity_ids is provided, only those entities get a definition
        push (companion reconciliation still runs for all). When None, all
        subscribed entities are pushed.
        """
        token = self._token_manager.get(token_id)
        if not token:
            return
        ea_map = {ea.entity_id: ea for ea in token.entities}
        primary_ids = {ea.entity_id for ea in token.entities if ea.companion_of is None}

        sessions = self._session_manager.get_all_for_token(token_id)
        for session in sessions:
            if session.ws.closed:
                continue

            # Compute expected companions for currently subscribed primaries.
            expected_companions: set[str] = set()
            for real_id in session.subscribed_entity_ids:
                if real_id in primary_ids:
                    for ea in token.entities:
                        if ea.companion_of == real_id:
                            expected_companions.add(ea.entity_id)

            current_subs = set(session.subscribed_entity_ids)

            # Subscribe new companions and register their outgoing IDs.
            new_companions = expected_companions - current_subs
            if new_companions:
                self._session_manager.add_subscription(
                    session.session_id, list(new_companions)
                )
                for comp_id in new_companions:
                    if comp_id not in session.outgoing_ids:
                        comp_ea = ea_map.get(comp_id)
                        session.outgoing_ids[comp_id] = (
                            comp_ea.alias or comp_id
                        ) if comp_ea else comp_id

            # Unsubscribe removed companions (only companions, not primaries).
            removed = (current_subs - expected_companions - primary_ids) & {
                ea.entity_id for ea in token.entities if ea.companion_of is not None
            }
            if removed:
                self._session_manager.remove_subscription(
                    session.session_id, list(removed)
                )
                for rem_id in removed:
                    rem_ea = ea_map.get(rem_id)
                    out_id = session.outgoing_ids.get(
                        rem_id, rem_ea.alias if rem_ea and rem_ea.alias else rem_id
                    )
                    try:
                        await session.ws.send_json({
                            "type": "entity_removed",
                            "entity_id": out_id,
                            "msg_id": None,
                        })
                    except Exception:
                        pass

            # Decide which entities to push.
            push_ids = set(session.subscribed_entity_ids)
            if changed_entity_ids is not None:
                push_ids &= changed_entity_ids

            if not push_ids:
                continue

            for real_id in push_ids:
                ea = ea_map.get(real_id)
                if ea is None:
                    continue
                out_id = session.outgoing_ids.get(real_id, ea.alias or real_id)
                companion_refs = [
                    session.outgoing_ids.get(comp_ea.entity_id, comp_ea.alias or comp_ea.entity_id)
                    for comp_ea in token.entities
                    if comp_ea.companion_of == real_id
                ]
                defn = build_entity_definition(
                    self._hass, real_id, ea, companions=companion_refs
                )
                if defn is None:
                    continue
                defn = dict(defn)
                defn["type"] = "entity_definition"
                defn["entity_id"] = out_id
                defn["capabilities"] = ea.capabilities
                defn["msg_id"] = None
                try:
                    await session.ws.send_json(defn)
                except Exception:
                    pass

                state = self._hass.states.get(real_id)
                if state is not None:
                    filtered = self._token_manager.filter_attributes(
                        real_id, token, dict(state.attributes)
                    )
                    if real_id.startswith("weather.") and ea.display_hints.get("show_forecast") is True:
                        fc = await self._try_fetch_forecast(real_id)
                        if fc:
                            filtered = dict(filtered)
                            if fc.get("daily"):
                                filtered["forecast_daily"] = fc["daily"]
                            if fc.get("hourly"):
                                filtered["forecast_hourly"] = fc["hourly"]
                    try:
                        await session.ws.send_json({
                            "type": "state_update",
                            "entity_id": out_id,
                            "state": state.state,
                            "attributes": filtered,
                            "last_updated": state.last_updated.isoformat(),
                            "initial": True,
                            "msg_id": None,
                        })
                    except Exception:
                        pass

            # Send state_update for newly subscribed companions.
            for comp_id in new_companions:
                ea = ea_map.get(comp_id)
                if ea is None:
                    continue
                state = self._hass.states.get(comp_id)
                if state is None:
                    continue
                out_id = ea.alias if ea.alias else comp_id
                filtered = self._token_manager.filter_attributes(
                    comp_id, token, dict(state.attributes)
                )
                update: dict[str, Any] = {
                    "type": "state_update",
                    "entity_id": out_id,
                    "state": state.state,
                    "attributes": filtered,
                    "msg_id": None,
                }
                try:
                    await session.ws.send_json(update)
                except Exception:
                    pass

    async def _try_fetch_forecast(self, entity_id: str) -> dict[str, list | None] | None:
        """Fetch daily and hourly forecast for a weather entity."""
        try:
            component = self._hass.data.get("weather")
            if component is None:
                return None
            entity = component.get_entity(entity_id)
            if entity is None:
                return None
            from homeassistant.components.weather import WeatherEntityFeature
            from .ws_proxy import _normalize_forecast
            features = entity.supported_features or 0
            result: dict[str, list | None] = {}
            if features & WeatherEntityFeature.FORECAST_DAILY:
                result["daily"] = _normalize_forecast(await entity.async_forecast_daily())
            if features & WeatherEntityFeature.FORECAST_HOURLY:
                result["hourly"] = _normalize_forecast(await entity.async_forecast_hourly())
            return result if result else None
        except Exception:
            return None

    def _resolve_token_display(self, token: "Token") -> dict:
        """Resolve effective display values for a token, falling back to global defaults."""
        from .const import DOMAIN, DEFAULTS
        entries = self._hass.config_entries.async_entries(DOMAIN)
        gcfg: dict = dict(DEFAULTS)
        if entries:
            gcfg.update(entries[0].data)
            gcfg.update(entries[0].options)
        use_custom = token.custom_messages
        return {
            "lang": token.lang if token.lang != "auto" else gcfg.get("default_lang", "auto"),
            "a11y": token.a11y if token.a11y != "standard" else gcfg.get("default_a11y", "standard"),
            "color_scheme": token.color_scheme,
            "on_offline": token.on_offline if use_custom else gcfg.get("default_on_offline", "last-state"),
            "on_error": token.on_error if use_custom else gcfg.get("default_on_error", "message"),
            "offline_text": token.offline_text if use_custom else gcfg.get("default_offline_text", ""),
            "error_text": token.error_text if use_custom else gcfg.get("default_error_text", ""),
        }

    async def _push_token_config_to_sessions(self, token_id: str) -> None:
        """Push updated token_config to all active sessions for a token."""
        token = self._token_manager.get(token_id)
        if not token:
            return
        display = self._resolve_token_display(token)
        msg = {"type": "token_config", **display}
        for session in self._session_manager.get_all_for_token(token_id):
            if session.ws.closed:
                continue
            try:
                await session.ws.send_json(msg)
            except Exception:
                pass

    async def get(self, request: web.Request, token_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        token = self._token_manager.get(token_id)
        if token is None:
            raise web.HTTPNotFound(reason=f"Token not found: {token_id}")
        d = _token_to_dict(token)
        d["active_sessions"] = self._session_manager.count_for_token(token_id)
        # Resolve the creator's display name from HA's user registry.
        try:
            user = await self._hass.auth.async_get_user(token.created_by)
            d["created_by_name"] = user.name if user else None
        except Exception:
            d["created_by_name"] = None
        return self.json(d)

    async def patch(self, request: web.Request, token_id: str) -> web.Response:
        """Partially update a token. Accepts any subset of token fields."""
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        token = self._token_manager.get(token_id)
        if token is None:
            raise web.HTTPNotFound(reason=f"Token not found: {token_id}")

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        updates: dict = {}
        if "label" in body:
            raw_label = str(body["label"])
            label_err = _validate_label(raw_label, self._token_manager, exclude_token_id=token_id)
            if label_err:
                raise web.HTTPBadRequest(reason=label_err)
            updates["label"] = raw_label.strip()
        if "origins" in body:
            updates["origins"] = _parse_origins(body["origins"])
        if "entities" in body:
            updates["entities"] = _parse_entities(body["entities"])
        if "rate_limits" in body:
            updates["rate_limits"] = _parse_rate_limits(body["rate_limits"])
        if "session" in body:
            updates["session"] = _parse_session_config(body["session"])
        if "expires" in body:
            updates["expires"] = _parse_dt(body["expires"])
        if "max_sessions" in body:
            try:
                updates["max_sessions"] = _validate_max_sessions(body["max_sessions"])
            except ValueError as exc:
                raise web.HTTPBadRequest(reason=str(exc))
        if "allowed_ips" in body:
            if not isinstance(body["allowed_ips"], list):
                raise web.HTTPBadRequest(reason="allowed_ips must be a list.")
            from ipaddress import ip_network
            for entry in body["allowed_ips"]:
                try:
                    ip_network(str(entry), strict=False)
                except ValueError:
                    raise web.HTTPBadRequest(
                        reason=f"Invalid IP address or CIDR: {entry}"
                    )
            updates["allowed_ips"] = list(body["allowed_ips"])
        if "active_schedule" in body:
            updates["active_schedule"] = _parse_schedule(body["active_schedule"])
        if "paused" in body:
            if not isinstance(body["paused"], bool):
                raise web.HTTPBadRequest(reason="paused must be a boolean.")
            updates["paused"] = body["paused"]
        if "embed_mode" in body:
            if body["embed_mode"] not in ("single", "group", "page"):
                raise web.HTTPBadRequest(reason="embed_mode must be single, group, or page.")
            updates["embed_mode"] = body["embed_mode"]
        if "theme_url" in body:
            new_theme_url = str(body["theme_url"] or "")
            updates["theme_url"] = new_theme_url
            if self._theme_manager:
                theme_id = theme_url_to_id(new_theme_url)
                theme_def = self._theme_manager.get(theme_id)
                updates["renderer_pack"] = theme_id if theme_def and theme_def.has_renderer_pack else ""

        if "custom_messages" in body:
            if not isinstance(body["custom_messages"], bool):
                raise web.HTTPBadRequest(reason="custom_messages must be a boolean.")
            updates["custom_messages"] = body["custom_messages"]
        _VALID_ON_OFFLINE = {"dim", "hide", "message", "last-state"}
        _VALID_ON_ERROR = {"dim", "hide", "message"}
        if "lang" in body:
            lang_val = str(body["lang"] or "auto").strip().lower()
            if len(lang_val) > 20 or not re.fullmatch(r"auto|[a-z]{2,3}(-[a-zA-Z0-9]{1,8})*", lang_val):
                raise web.HTTPBadRequest(reason="lang must be 'auto' or a BCP 47 language tag.")
            updates["lang"] = lang_val
        if "a11y" in body:
            val = str(body["a11y"])
            if val not in ("standard", "enhanced"):
                raise web.HTTPBadRequest(reason="a11y must be standard or enhanced.")
            updates["a11y"] = val
        if "color_scheme" in body:
            val = str(body["color_scheme"])
            if val not in ("auto", "light", "dark"):
                raise web.HTTPBadRequest(reason="color_scheme must be auto, light, or dark.")
            updates["color_scheme"] = val
        if "on_offline" in body:
            val = str(body["on_offline"])
            if val not in _VALID_ON_OFFLINE:
                raise web.HTTPBadRequest(reason=f"on_offline must be one of {_VALID_ON_OFFLINE}.")
            updates["on_offline"] = val
        if "on_error" in body:
            val = str(body["on_error"])
            if val not in _VALID_ON_ERROR:
                raise web.HTTPBadRequest(reason=f"on_error must be one of {_VALID_ON_ERROR}.")
            updates["on_error"] = val
        if "offline_text" in body:
            updates["offline_text"] = _validate_display_text(
                body["offline_text"], "offline_text",
            )
        if "error_text" in body:
            updates["error_text"] = _validate_display_text(
                body["error_text"], "error_text",
            )

        generated_secret: str | None = None
        if "token_secret" in body:
            raw_secret = body["token_secret"]
            if raw_secret == "generate":
                import secrets as _secrets
                generated_secret = _secrets.token_hex(32)
                updates["token_secret"] = generated_secret
            elif raw_secret is None:
                updates["token_secret"] = None
            else:
                raise web.HTTPBadRequest(
                    reason='token_secret must be "generate" or null.'
                )

        old_ea_map = {ea.entity_id: ea for ea in token.entities} if "entities" in updates else {}

        try:
            token = await self._token_manager.update(token_id, updates)
        except (ValueError, KeyError) as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        security_fields = {"paused", "active_schedule", "allowed_ips", "token_secret", "origins"}
        if security_fields & updates.keys():
            ws_list = self._session_manager.terminate_all_for_token(token_id)
            for ws in ws_list:
                if not ws.closed:
                    asyncio.create_task(_close_ws_with_auth_failed(ws))

        if "entities" in updates:
            changed: set[str] = set()
            new_ea_map = {ea.entity_id: ea for ea in token.entities}
            for eid, new_ea in new_ea_map.items():
                old_ea = old_ea_map.get(eid)
                if old_ea is None or old_ea != new_ea:
                    changed.add(eid)
                    # If this is a companion, also push the primary so its companions list updates.
                    if new_ea.companion_of:
                        changed.add(new_ea.companion_of)
            for old_id in old_ea_map:
                if old_id not in new_ea_map:
                    changed.add(old_id)
                    # If a companion was removed, push the primary too.
                    old_ea = old_ea_map[old_id]
                    if old_ea.companion_of:
                        changed.add(old_ea.companion_of)
            await self._push_entity_definitions_to_sessions(token_id, changed or None)

        if "theme_url" in updates:
            await self._push_theme_to_sessions(token_id)
            await self._push_renderer_pack_to_sessions(token_id)

        _TOKEN_CONFIG_FIELDS = {"lang", "a11y", "color_scheme", "custom_messages", "on_offline", "on_error", "offline_text", "error_text"}
        if _TOKEN_CONFIG_FIELDS & updates.keys():
            await self._push_token_config_to_sessions(token_id)

        result = _token_to_dict(token)
        if generated_secret is not None:
            result["generated_secret"] = generated_secret
        return self.json(result)

    async def delete(self, request: web.Request, token_id: str) -> web.Response:
        """Revoke a token (POST ?action=revoke) or delete it (DELETE when revoked).

        Query param action=revoke: revokes an active token.
        No action param: deletes a revoked/expired token permanently.
        """
        user = request.get("hass_user")
        if user is None:
            raise web.HTTPUnauthorized()
        if not user.is_admin:
            raise web.HTTPForbidden()
        action = request.query.get("action")

        if action == "revoke":
            try:
                reason = request.query.get("reason")
                token = await self._token_manager.revoke(token_id, reason)
                # Terminate all active sessions for this token.
                ws_list = self._session_manager.terminate_all_for_token(token_id)
                for ws in ws_list:
                    if not ws.closed:
                        asyncio.create_task(ws.close())
                self._activity_store.record_token_lifecycle(TokenLifecycleEvent(
                    token_id=token_id,
                    display_type="TOKEN_REVOKED",
                    reason=reason,
                    timestamp=datetime.now(timezone.utc),
                    label=token.label,
                ))
                self._event_bus.token_revoked(token_id, token.label, reason)
            except KeyError:
                raise web.HTTPNotFound(reason=f"Token not found: {token_id}")
            return self.json(_token_to_dict(token))

        # Permanent delete - record before deleting so the token_id is still known.
        try:
            del_token = self._token_manager.get(token_id)
            self._activity_store.record_token_lifecycle(TokenLifecycleEvent(
                token_id=token_id,
                display_type="TOKEN_DELETED",
                reason=None,
                timestamp=datetime.now(timezone.utc),
                label=del_token.label if del_token else None,
            ))
            await self._token_manager.delete(token_id)
        except KeyError:
            raise web.HTTPNotFound(reason=f"Token not found: {token_id}")
        except ValueError as exc:
            raise web.HTTPBadRequest(reason=str(exc))
        if self._sensors:
            self._sensors.remove_token_sensors(token_id)
        if self._controls:
            self._controls.remove_token_controls(token_id)
        return web.Response(status=204)


# ---------------------------------------------------------------------------
# Session views
# ---------------------------------------------------------------------------

class HarvestSessionsView(HomeAssistantView):
    """GET /api/harvest/sessions - list active sessions, optionally filtered by token_id.
    DELETE /api/harvest/sessions?token_id=X - terminate all sessions for a token.
    """

    url = "/api/harvest/sessions"
    name = "api:harvest:sessions"
    requires_auth = True

    def __init__(self, session_manager: SessionManager) -> None:
        self._session_manager = session_manager

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        token_id = request.query.get("token_id")
        if token_id:
            sessions = self._session_manager.get_all_for_token(token_id)
        else:
            sessions = self._session_manager.get_all()
        return self.json([_session_to_dict(s) for s in sessions])

    async def delete(self, request: web.Request) -> web.Response:
        """Terminate all sessions, optionally filtered to one token."""
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        token_id = request.query.get("token_id")
        if token_id:
            ws_list = self._session_manager.terminate_all_for_token(token_id)
        else:
            # Terminate every active session.
            all_sessions = self._session_manager.get_all()
            ws_list = []
            for s in all_sessions:
                self._session_manager.terminate(s.session_id)
                ws_list.append(s.ws)
        for ws in ws_list:
            if not ws.closed:
                asyncio.create_task(ws.close())
        return web.Response(status=204)


class HarvestSessionTerminateView(HomeAssistantView):
    """DELETE /api/harvest/sessions/{session_id} - terminate a single session."""

    url = "/api/harvest/sessions/{session_id}"
    name = "api:harvest:sessions:terminate"
    requires_auth = True

    def __init__(self, session_manager: SessionManager) -> None:
        self._session_manager = session_manager

    async def delete(self, _request: web.Request, session_id: str) -> web.Response:
        user = _request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        session = self._session_manager.get(session_id)
        if session is None:
            raise web.HTTPNotFound(reason=f"Session not found: {session_id}")
        ws = session.ws
        self._session_manager.terminate(session_id)
        if not ws.closed:
            asyncio.create_task(ws.close())
        return web.Response(status=204)


# ---------------------------------------------------------------------------
# Activity views
# ---------------------------------------------------------------------------

class HarvestActivityView(HomeAssistantView):
    """GET /api/harvest/activity - query the activity log with optional filters.

    Query params: token_id, event_types (comma-sep), since (ISO), until (ISO),
                  limit (int, default 50), offset (int, default 0).
    """

    url = "/api/harvest/activity"
    name = "api:harvest:activity"
    requires_auth = True

    def __init__(self, activity_store: ActivityStore, token_manager: TokenManager | None = None) -> None:
        self._activity_store = activity_store
        self._token_manager = token_manager

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        token_id = request.query.get("token_id") or None
        # Accept both singular (frontend) and plural (legacy) param names.
        display_type = request.query.get("event_type") or request.query.get("event_types") or None
        search = request.query.get("search") or None
        try:
            since = _parse_dt(request.query.get("since"))
            until = _parse_dt(request.query.get("until"))
        except ValueError as exc:
            raise web.HTTPBadRequest(reason=str(exc))
        try:
            limit = max(1, min(500, int(request.query.get("limit", "50"))))
            offset = max(0, int(request.query.get("offset", "0")))
        except ValueError:
            raise web.HTTPBadRequest(reason="limit and offset must be integers.")

        events, total = await self._activity_store.query_activity(
            token_id=token_id,
            display_type_filter=display_type,
            since=since,
            until=until,
            limit=limit,
            offset=offset,
            search=search,
        )

        # Enrich events with token labels (friendly names).
        # Lifecycle events store label at write time; other events look it up.
        label_map = {t.token_id: t.label for t in self._token_manager.get_all()} if self._token_manager else {}
        for ev in events:
            if ev.get("token_id") and not ev.get("token_label"):
                ev["token_label"] = label_map.get(ev["token_id"])

        return self.json({"events": events, "total": total, "limit": limit, "offset": offset})


class HarvestActivityExportView(HomeAssistantView):
    """GET /api/harvest/activity/export - download activity log as CSV."""

    url = "/api/harvest/activity/export"
    name = "api:harvest:activity_export"
    requires_auth = True

    def __init__(self, activity_store: ActivityStore) -> None:
        self._activity_store = activity_store

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        token_id = request.query.get("token_id") or None
        display_type = request.query.get("event_type") or request.query.get("event_types") or None
        search = request.query.get("search") or None
        try:
            since = _parse_dt(request.query.get("since"))
            until = _parse_dt(request.query.get("until"))
        except ValueError as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        csv_data = await self._activity_store.export_csv(
            token_id=token_id,
            display_type_filter=display_type,
            since=since,
            until=until,
            search=search,
        )
        return web.Response(
            body=csv_data,
            content_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=harvest_activity.csv"},
        )


class HarvestAggregatesView(HomeAssistantView):
    """GET /api/harvest/activity/aggregates - hourly aggregate counts for graphs."""

    url = "/api/harvest/activity/aggregates"
    name = "api:harvest:activity_aggregates"
    requires_auth = True

    def __init__(self, activity_store: ActivityStore) -> None:
        self._activity_store = activity_store

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        try:
            hours = max(1, min(8760, int(request.query.get("hours", "24"))))
        except ValueError:
            raise web.HTTPBadRequest(reason="hours must be an integer.")
        token_id = request.query.get("token_id") or None
        data = await self._activity_store.query_aggregates(hours=hours, token_id=token_id)
        buckets = data.get("hours", [])
        return self.json([{
            "hour": b.get("hour", ""),
            "commands": b.get("command_count", 0),
            "sessions": b.get("peak_sessions", 0),
            "auth_failures": b.get("auth_fail_count", 0),
        } for b in buckets])


# ---------------------------------------------------------------------------
# Actions views
# ---------------------------------------------------------------------------

class HarvestActionsView(HomeAssistantView):
    """GET /api/harvest/actions     - list all harvest_actions.
    POST /api/harvest/actions    - create a new harvest_action.
    DELETE /api/harvest/actions/{action_id} - delete a harvest_action.
    """

    url = "/api/harvest/actions"
    name = "api:harvest:actions"
    requires_auth = True

    def __init__(self, action_manager: HarvestActionManager) -> None:
        self._action_manager = action_manager

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        actions = self._action_manager.get_all()
        return self.json([dataclasses.asdict(a) for a in actions])

    async def post(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None:
            raise web.HTTPUnauthorized()
        if not user.is_admin:
            raise web.HTTPForbidden()

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        _svc_re = re.compile(r"^[a-z0-9_]+$")
        try:
            service_calls = []
            for sc in body.get("service_calls", []):
                domain = str(sc["domain"])
                service = str(sc["service"])
                if not _svc_re.match(domain) or not _svc_re.match(service):
                    raise ValueError(f"Invalid domain/service format: {domain!r}/{service!r}")
                service_calls.append(ServiceCall(domain=domain, service=service, data=sc.get("data", {})))
        except (KeyError, TypeError, ValueError) as exc:
            raise web.HTTPBadRequest(reason=f"Invalid service_calls: {exc}")

        try:
            action = await self._action_manager.create(
                label=str(body.get("label", "Unnamed Action")),
                icon=str(body.get("icon", "mdi:play-circle")),
                service_calls=service_calls,
                created_by=user.id,
            )
        except Exception as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        return self.json(dataclasses.asdict(action), status_code=201)


class HarvestActionDetailView(HomeAssistantView):
    """PATCH /api/harvest/actions/{action_id} - update a harvest_action.
    DELETE /api/harvest/actions/{action_id} - delete a harvest_action.
    """

    url = "/api/harvest/actions/{action_id}"
    name = "api:harvest:action_detail"
    requires_auth = True

    def __init__(self, action_manager: HarvestActionManager) -> None:
        self._action_manager = action_manager

    async def patch(self, request: web.Request, action_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None:
            raise web.HTTPUnauthorized()
        if not user.is_admin:
            raise web.HTTPForbidden()

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        kwargs: dict = {}
        if "label" in body:
            kwargs["label"] = str(body["label"])
        if "icon" in body:
            kwargs["icon"] = str(body["icon"])
        if "service_calls" in body:
            _svc_re = re.compile(r"^[a-z0-9_]+$")
            try:
                scs = []
                for sc in body["service_calls"]:
                    domain = str(sc["domain"])
                    service = str(sc["service"])
                    if not _svc_re.match(domain) or not _svc_re.match(service):
                        raise ValueError(f"Invalid domain/service: {domain!r}/{service!r}")
                    scs.append(ServiceCall(domain=domain, service=service, data=sc.get("data", {})))
                kwargs["service_calls"] = scs
            except (KeyError, TypeError, ValueError) as exc:
                raise web.HTTPBadRequest(reason=f"Invalid service_calls: {exc}")

        try:
            action = await self._action_manager.update(action_id, **kwargs)
        except KeyError:
            raise web.HTTPNotFound(reason=f"Action not found: {action_id}")

        return self.json(dataclasses.asdict(action))

    async def delete(self, request: web.Request, action_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        try:
            await self._action_manager.delete(action_id)
        except KeyError:
            raise web.HTTPNotFound(reason=f"Action not found: {action_id}")
        return web.Response(status=204)


# ---------------------------------------------------------------------------
# Theme views
# ---------------------------------------------------------------------------

_THEME_NAME_RE = re.compile(r"^[a-zA-Z0-9 \-_'().]+$")
_THEME_NAME_MAX = 64


def _validate_theme_name(name: str) -> str | None:
    """Return an error string if the name is invalid, else None."""
    if not name:
        return "Theme name cannot be empty."
    if len(name) > _THEME_NAME_MAX:
        return f"Theme name must be {_THEME_NAME_MAX} characters or fewer."
    if not _THEME_NAME_RE.match(name):
        return "Theme name may only contain letters, numbers, spaces, hyphens, underscores, apostrophes, parentheses, and periods."
    return None


class HarvestThemesView(HomeAssistantView):
    """GET /api/harvest/themes  - list all themes.
    POST /api/harvest/themes - create a custom theme.
    """

    url = "/api/harvest/themes"
    name = "api:harvest:themes"
    requires_auth = True

    def __init__(self, theme_manager: ThemeManager, token_manager: TokenManager, pack_manager: PackManager | None = None) -> None:
        self._theme_manager = theme_manager
        self._token_manager = token_manager
        self._pack_manager = pack_manager

    def _usage_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for t in self._token_manager.get_all():
            tid = theme_url_to_id(t.theme_url)
            counts[tid] = counts.get(tid, 0) + 1
        return counts

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        counts = self._usage_counts()
        result = []
        for theme in self._theme_manager.get_all():
            d = theme_to_api_dict(theme, has_thumbnail=self._theme_manager.has_thumbnail(theme.theme_id))
            d["usage_count"] = counts.get(theme.theme_id, 0)
            if theme.has_renderer_pack and self._pack_manager is not None:
                d["has_pack"] = self._pack_manager.get_pack_path(theme.theme_id) is not None
            else:
                d["has_pack"] = False
            result.append(d)
        return self.json(result)

    async def post(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None:
            raise web.HTTPUnauthorized()
        if not user.is_admin:
            raise web.HTTPForbidden()

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        name = str(body.get("name", "")).strip()
        name_err = _validate_theme_name(name)
        if name_err:
            raise web.HTTPBadRequest(reason=name_err)
        if self._theme_manager.name_exists(name):
            raise web.HTTPConflict(reason=f"A theme named \"{name}\" already exists.")
        variables = body.get("variables")
        if not isinstance(variables, dict):
            raise web.HTTPBadRequest(reason="variables must be an object.")

        raw_cap = body.get("capabilities")
        capabilities = raw_cap if isinstance(raw_cap, dict) else None
        theme = await self._theme_manager.create(
            name=name,
            variables=variables,
            dark_variables=body.get("dark_variables"),
            created_by=user.id,
            author=str(body.get("author", "")),
            version=str(body.get("version", "1.0")),
            has_renderer_pack=bool(body.get("renderer_pack", False)),
            capabilities=capabilities,
        )
        d = theme_to_api_dict(theme)
        d["has_pack"] = False
        return self.json(d, status_code=201)


class HarvestThemeReloadView(HomeAssistantView):
    """POST /api/harvest/themes/reload - reload all bundled themes from disk.

    After reloading, pushes updated theme variables and renderer pack URLs
    to all active sessions that reference a bundled theme.
    """

    url = "/api/harvest/themes/reload"
    name = "api:harvest:themes:reload"
    requires_auth = True

    def __init__(
        self,
        theme_manager: ThemeManager,
        token_manager: TokenManager,
        session_manager: SessionManager,
        pack_manager: PackManager | None = None,
    ) -> None:
        self._theme_manager = theme_manager
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._pack_manager = pack_manager

    async def post(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        load_results = await self._theme_manager.load()
        errors = {tid: err for tid, err in load_results.items() if err is not None}
        ts = int(datetime.now(timezone.utc).timestamp())
        for token in self._token_manager.get_all():
            theme_id = theme_url_to_id(token.theme_url)
            theme_def = self._theme_manager.get(theme_id)
            if not theme_def or not theme_def.is_bundled:
                continue
            theme_msg = {
                "type": "theme",
                "variables": theme_def.variables,
                "dark_variables": theme_def.dark_variables,
            }
            pack_msg: dict[str, Any] = {"type": "renderer_pack", "url": ""}
            if token.renderer_pack and self._pack_manager:
                if self._pack_manager.get_pack_path(token.renderer_pack):
                    pack_msg["url"] = f"/api/harvest/packs/{token.renderer_pack}.js?v={ts}"
            for session in self._session_manager.get_all_for_token(token.token_id):
                if not session.ws.closed:
                    try:
                        await session.ws.send_json(theme_msg)
                        if token.renderer_pack:
                            await session.ws.send_json(pack_msg)
                    except Exception:
                        pass
        if errors:
            return self.json({"status": "partial", "errors": errors})
        return self.json({"status": "ok"})


class HarvestThemeDetailView(HomeAssistantView):
    """GET /api/harvest/themes/{theme_id}    - get one theme.
    PATCH /api/harvest/themes/{theme_id}  - update a custom theme.
    DELETE /api/harvest/themes/{theme_id} - delete a custom theme.
    """

    url = "/api/harvest/themes/{theme_id}"
    name = "api:harvest:theme_detail"
    requires_auth = True

    def __init__(self, theme_manager: ThemeManager, token_manager: TokenManager, session_manager: SessionManager, pack_manager: PackManager | None = None) -> None:
        self._theme_manager = theme_manager
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._pack_manager = pack_manager

    async def _push_theme_to_tokens(self, theme_id: str, theme: object) -> None:
        """Push updated theme variables to all active sessions using this theme."""
        msg = {
            "type": "theme",
            "variables": theme.variables,
            "dark_variables": theme.dark_variables,
        }
        for token in self._token_manager.get_all():
            if theme_url_to_id(token.theme_url) != theme_id:
                continue
            for session in self._session_manager.get_all_for_token(token.token_id):
                if not session.ws.closed:
                    try:
                        await session.ws.send_json(msg)
                    except Exception:
                        pass

    async def get(self, request: web.Request, theme_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        theme = self._theme_manager.get(theme_id)
        if theme is None:
            raise web.HTTPNotFound(reason=f"Theme not found: {theme_id}")
        d = theme_to_api_dict(theme, has_thumbnail=self._theme_manager.has_thumbnail(theme_id))
        count = sum(
            1 for t in self._token_manager.get_all()
            if theme_url_to_id(t.theme_url) == theme_id
        )
        d["usage_count"] = count
        if theme.has_renderer_pack and self._pack_manager is not None:
            d["has_pack"] = self._pack_manager.get_pack_path(theme_id) is not None
        else:
            d["has_pack"] = False
        return self.json(d)

    async def patch(self, request: web.Request, theme_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        updates: dict = {}
        if "name" in body:
            name = str(body["name"]).strip()
            name_err = _validate_theme_name(name)
            if name_err:
                raise web.HTTPBadRequest(reason=name_err)
            if self._theme_manager.name_exists(name, exclude_id=theme_id):
                raise web.HTTPConflict(reason=f"A theme named \"{name}\" already exists.")
            updates["name"] = name
        if "author" in body:
            updates["author"] = str(body["author"])
        if "version" in body:
            updates["version"] = str(body["version"])
        if "variables" in body:
            if not isinstance(body["variables"], dict):
                raise web.HTTPBadRequest(reason="variables must be an object.")
            updates["variables"] = body["variables"]
        if "dark_variables" in body:
            if not isinstance(body["dark_variables"], dict):
                raise web.HTTPBadRequest(reason="dark_variables must be an object.")
            updates["dark_variables"] = body["dark_variables"]
        if "renderer_pack" in body:
            updates["has_renderer_pack"] = bool(body["renderer_pack"])
        if "capabilities" in body:
            raw_cap = body["capabilities"]
            updates["capabilities"] = raw_cap if isinstance(raw_cap, dict) else None

        try:
            theme = await self._theme_manager.update(theme_id, updates)
        except ValueError as exc:
            raise web.HTTPForbidden(reason=str(exc))
        except KeyError:
            raise web.HTTPNotFound(reason=f"Theme not found: {theme_id}")

        if "variables" in updates or "dark_variables" in updates:
            await self._push_theme_to_tokens(theme_id, theme)

        d = theme_to_api_dict(theme)
        if theme.has_renderer_pack and self._pack_manager is not None:
            d["has_pack"] = self._pack_manager.get_pack_path(theme_id) is not None
        else:
            d["has_pack"] = False
        return self.json(d)

    async def delete(self, request: web.Request, theme_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()

        try:
            await self._theme_manager.delete(theme_id)
        except ValueError as exc:
            raise web.HTTPForbidden(reason=str(exc))
        except KeyError:
            pass

        affected_token_ids: list[str] = []
        for token in self._token_manager.get_all():
            if theme_url_to_id(token.theme_url) == theme_id:
                affected_token_ids.append(token.token_id)
                await self._token_manager.update(
                    token.token_id, {"theme_url": "", "renderer_pack": ""},
                )

        for tid in affected_token_ids:
            for session in self._session_manager.get_all_for_token(tid):
                if not session.ws.closed:
                    try:
                        await session.ws.send_json({"type": "theme", "variables": {}})
                        await session.ws.send_json({"type": "renderer_pack"})
                    except Exception:
                        pass

        if self._pack_manager:
            try:
                await self._pack_manager.delete_user_pack(theme_id)
            except Exception:
                pass

        return web.Response(status=204)


class HarvestThemeThumbnailView(HomeAssistantView):
    """GET /api/harvest/themes/{theme_id}/thumbnail  - serve thumbnail image.
    POST /api/harvest/themes/{theme_id}/thumbnail - upload thumbnail for custom theme.
    DELETE /api/harvest/themes/{theme_id}/thumbnail - remove custom thumbnail.
    """

    url = "/api/harvest/themes/{theme_id}/thumbnail"
    name = "api:harvest:theme_thumbnail"
    requires_auth = True

    def __init__(self, hass: HomeAssistant, theme_manager: ThemeManager) -> None:
        self._hass = hass
        self._theme_manager = theme_manager

    async def get(self, request: web.Request, theme_id: str) -> web.Response:
        path = self._theme_manager.get_thumbnail_path(theme_id)
        if path is None:
            path = self._theme_manager.get_fallback_thumbnail_path()
        if not path.is_file():
            raise web.HTTPNotFound()
        suffix = path.suffix.lower()
        ct = "image/png" if suffix == ".png" else "image/jpeg"
        data = await self._hass.async_add_executor_job(path.read_bytes)
        return web.Response(
            body=data,
            content_type=ct,
            headers={"Cache-Control": "no-store"},
        )

    async def post(self, request: web.Request, theme_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        reader = await request.multipart()
        field = await reader.next()
        if field is None or field.name != "file":
            raise web.HTTPBadRequest(reason="Expected a 'file' field.")
        filename = field.filename or "upload.png"
        from pathlib import PurePosixPath
        ext = PurePosixPath(filename).suffix.lower()
        data = await field.read(decode=False)
        try:
            self._theme_manager.save_thumbnail(theme_id, data, ext)
        except (ValueError, KeyError) as exc:
            raise web.HTTPBadRequest(reason=str(exc))
        return self.json({"ok": True, "has_thumbnail": True})

    async def delete(self, request: web.Request, theme_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        self._theme_manager.delete_thumbnail(theme_id)
        return web.Response(status=204)


# ---------------------------------------------------------------------------
# Renderer pack views
# ---------------------------------------------------------------------------


class HarvestPacksView(HomeAssistantView):
    """GET /api/harvest/packs - list bundled packs + consent state."""

    url = "/api/harvest/packs"
    name = "api:harvest:packs"
    requires_auth = True

    def __init__(self, pack_manager: PackManager) -> None:
        self._pack_manager = pack_manager

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        packs = self._pack_manager.get_all()
        return self.json({
            "agreed": self._pack_manager.agreed,
            "packs": [pack_to_api_dict(p) for p in packs],
        })


class HarvestPackAgreeView(HomeAssistantView):
    """POST /api/harvest/packs/agree - set renderer pack consent state."""

    url = "/api/harvest/packs/agree"
    name = "api:harvest:packs:agree"
    requires_auth = True

    def __init__(self, pack_manager: PackManager) -> None:
        self._pack_manager = pack_manager

    async def post(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")
        agreed = bool(body.get("agreed", False))
        await self._pack_manager.set_agreed(agreed)
        return self.json({"agreed": agreed})


class HarvestPackFileView(HomeAssistantView):
    """GET /api/harvest/packs/{pack_id}.js - serve a renderer pack JS file.

    No auth required - the widget on a remote page needs to fetch it.
    """

    url = "/api/harvest/packs/{pack_id}.js"
    name = "api:harvest:pack_file"
    requires_auth = False

    def __init__(self, hass: HomeAssistant, pack_manager: PackManager) -> None:
        self._hass = hass
        self._pack_manager = pack_manager

    async def get(self, request: web.Request, pack_id: str) -> web.Response:
        path = self._pack_manager.get_pack_path(pack_id)
        if path is None:
            raise web.HTTPNotFound()
        data = await self._hass.async_add_executor_job(path.read_bytes)
        return web.Response(
            body=data,
            content_type="application/javascript",
            headers={"Cache-Control": "no-store"},
        )


class HarvestPackDetailView(HomeAssistantView):
    """GET /api/harvest/packs/{pack_id} - get bundled pack info."""

    url = "/api/harvest/packs/{pack_id}"
    name = "api:harvest:pack_detail"
    requires_auth = True

    def __init__(self, pack_manager: PackManager) -> None:
        self._pack_manager = pack_manager

    async def get(self, request: web.Request, pack_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        pack = self._pack_manager.get(pack_id)
        if pack is None:
            raise web.HTTPNotFound(reason=f"Pack not found: {pack_id}")
        return self.json(pack_to_api_dict(pack))


class HarvestPackCodeView(HomeAssistantView):
    """GET/POST /api/harvest/packs/{pack_id}/code - view or update pack JS source."""

    url = "/api/harvest/packs/{pack_id}/code"
    name = "api:harvest:pack_code"
    requires_auth = True

    def __init__(self, hass: HomeAssistant, pack_manager: PackManager) -> None:
        self._hass = hass
        self._pack_manager = pack_manager

    async def get(self, request: web.Request, pack_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        if not self._pack_manager.get_pack_path(pack_id):
            raise web.HTTPNotFound()
        code = await self._hass.async_add_executor_job(
            self._pack_manager.get_code, pack_id,
        )
        return self.json({"pack_id": pack_id, "code": code or ""})

    async def post(self, request: web.Request, pack_id: str) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")
        code = body.get("code")
        if code is None or not isinstance(code, str):
            raise web.HTTPBadRequest(reason="'code' field (string) is required.")
        try:
            await self._pack_manager.update_code(pack_id, code)
        except ValueError as exc:
            raise web.HTTPForbidden(reason=str(exc))
        except KeyError as exc:
            raise web.HTTPNotFound(reason=str(exc))
        return self.json({"pack_id": pack_id, "status": "ok"})


# ---------------------------------------------------------------------------
# Config view
# ---------------------------------------------------------------------------

class HarvestConfigView(HomeAssistantView):
    """GET /api/harvest/config  - return integration global config.
    PATCH /api/harvest/config - update config (reloads integration entry).
    """

    url = "/api/harvest/config"
    name = "api:harvest:config"
    requires_auth = True

    def __init__(self, hass: HomeAssistant, session_manager: SessionManager) -> None:
        self._hass = hass
        self._session_manager = session_manager

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        from .const import DOMAIN, DEFAULTS, PLATFORM_VERSION
        entries = self._hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return self.json({})
        entry = entries[0]
        # Deep-merge stored values over defaults so nested objects like
        # default_session are always fully populated even after partial saves.
        merged = _deep_merge(dict(DEFAULTS), _deep_merge(dict(entry.data), dict(entry.options)))
        merged["platform_version"] = PLATFORM_VERSION
        return self.json(merged)

    async def patch(self, request: web.Request) -> web.Response:
        """Update global config options in-place without reloading the integration.

        A full integration reload is intentionally avoided here because it
        tears down the panel registration and leaves the Settings screen blank.
        Settings take effect on the next relevant action (new connection, etc.).
        """
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        from .const import DOMAIN, DEFAULTS
        entries = self._hass.config_entries.async_entries(DOMAIN)
        if not entries:
            raise web.HTTPNotFound(reason="HArvest integration not loaded.")

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        entry = entries[0]
        # Strip unknown top-level keys so callers cannot inject arbitrary options.
        allowed_keys = set(DEFAULTS.keys())
        filtered = {k: v for k, v in body.items() if k in allowed_keys}
        if not filtered:
            raise web.HTTPBadRequest(reason="No valid config keys in body.")
        # Validate override_host when present: must be empty or a bare http(s) origin.
        if "override_host" in filtered:
            val = str(filtered.get("override_host", "") or "")
            if val:
                from urllib.parse import urlparse
                try:
                    parsed = urlparse(val)
                except Exception:
                    raise web.HTTPBadRequest(reason="override_host: invalid URL.")
                if parsed.scheme not in ("http", "https"):
                    raise web.HTTPBadRequest(reason="override_host: must use http or https scheme.")
                if not parsed.netloc:
                    raise web.HTTPBadRequest(reason="override_host: must include a host.")
                if parsed.path not in ("", "/"):
                    raise web.HTTPBadRequest(reason="override_host: must be a bare origin with no path.")
                if parsed.query or parsed.fragment:
                    raise web.HTTPBadRequest(reason="override_host: must be a bare origin with no query or fragment.")
                filtered["override_host"] = f"{parsed.scheme}://{parsed.netloc}"
        # Validate widget_script_url: empty, a path, or a full http(s) URL.
        if "widget_script_url" in filtered:
            val = str(filtered.get("widget_script_url", "") or "")
            if val and not val.startswith("/"):
                from urllib.parse import urlparse as _urlparse2
                try:
                    p2 = _urlparse2(val)
                    if p2.scheme not in ("http", "https") or not p2.netloc:
                        raise web.HTTPBadRequest(reason="widget_script_url: must be a path (e.g. /harvest.min.js) or full http(s) URL.")
                except web.HTTPBadRequest:
                    raise
                except Exception:
                    raise web.HTTPBadRequest(reason="widget_script_url: invalid value.")
        # Validate global display defaults when present.
        if "default_lang" in filtered:
            lang_val = str(filtered["default_lang"] or "auto").strip().lower()
            if len(lang_val) > 20 or not re.fullmatch(r"auto|[a-z]{2,3}(-[a-zA-Z0-9]{1,8})*", lang_val):
                raise web.HTTPBadRequest(reason="default_lang must be 'auto' or a BCP 47 tag.")
            filtered["default_lang"] = lang_val
        if "default_a11y" in filtered:
            if str(filtered["default_a11y"]) not in ("standard", "enhanced"):
                raise web.HTTPBadRequest(reason="default_a11y must be standard or enhanced.")
        if "default_on_offline" in filtered:
            if str(filtered["default_on_offline"]) not in {"dim", "hide", "message", "last-state"}:
                raise web.HTTPBadRequest(reason="default_on_offline must be dim, hide, message, or last-state.")
        if "default_on_error" in filtered:
            if str(filtered["default_on_error"]) not in {"dim", "hide", "message"}:
                raise web.HTTPBadRequest(reason="default_on_error must be dim, hide, or message.")
        if "default_offline_text" in filtered:
            filtered["default_offline_text"] = _validate_display_text(
                filtered["default_offline_text"], "default_offline_text",
            )
        if "default_error_text" in filtered:
            filtered["default_error_text"] = _validate_display_text(
                filtered["default_error_text"], "default_error_text",
            )

        # Deep-merge the incoming partial update over the current full config.
        current = _deep_merge(dict(DEFAULTS), _deep_merge(dict(entry.data), dict(entry.options)))
        updated = _deep_merge(current, filtered)
        self._hass.config_entries.async_update_entry(entry, options=updated)

        if filtered.get("kill_switch"):
            for session in self._session_manager.get_all():
                if not session.ws.closed:
                    asyncio.create_task(_close_ws_with_auth_failed(session.ws))

        from .const import PLATFORM_VERSION
        updated["platform_version"] = PLATFORM_VERSION
        return self.json(updated)


# ---------------------------------------------------------------------------
# Stats view
# ---------------------------------------------------------------------------

class HarvestStatsView(HomeAssistantView):
    """GET /api/harvest/stats - global stats for the panel home screen.

    Returns the flat PanelStats shape the frontend expects:
      active_sessions, active_tokens, commands_today, errors_today,
      db_size_bytes, is_running.
    """

    url = "/api/harvest/stats"
    name = "api:harvest:stats"
    requires_auth = True

    def __init__(
        self,
        sensors: DiagnosticSensors,
        activity_store: ActivityStore,
        session_manager: SessionManager,
        token_manager: TokenManager,
    ) -> None:
        self._sensors = sensors
        self._activity_store = activity_store
        self._session_manager = session_manager
        self._token_manager = token_manager

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        today = await self._activity_store.count_today()
        db_size = await self._activity_store.get_db_size_bytes()
        return self.json({
            "active_sessions": self._session_manager.count_active(),
            "active_tokens": len(self._token_manager.get_active()),
            "commands_today": today.get("commands", 0),
            "errors_today": today.get("auth_fail", 0),
            "db_size_bytes": db_size,
            "is_running": True,
        })


# ---------------------------------------------------------------------------
# Entity picker view
# ---------------------------------------------------------------------------

class HarvestEntitiesView(HomeAssistantView):
    """GET /api/harvest/entities - all HA entity states for the entity picker.

    Returns a flat list of all entities known to HA, used by the panel wizard
    to power the entity autocomplete dropdown in Step 1.
    """

    url = "/api/harvest/entities"
    name = "api:harvest:entities"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def get(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        from .entity_compatibility import get_support_tier
        return self.json([
            {
                "entity_id": s.entity_id,
                "friendly_name": s.attributes.get("friendly_name", s.entity_id),
                "domain": s.domain,
                "state": s.state,
            }
            for s in self._hass.states.async_all()
            if get_support_tier(s.domain) != 3
        ])


# ---------------------------------------------------------------------------
# Wizard helper views
# ---------------------------------------------------------------------------

class HarvestAliasView(HomeAssistantView):
    """POST /api/harvest/alias - generate a random alias for an entity.

    Called by the panel wizard (Step 1) when each entity is selected.
    The alias is stored in wizard session state and persisted on Generate.
    Returns {"alias": "aBcDeFgH"}.
    """

    url = "/api/harvest/alias"
    name = "api:harvest:alias"
    requires_auth = True

    def __init__(self, token_manager: TokenManager) -> None:
        self._token_manager = token_manager

    async def post(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()
        try:
            body = await request.json()
            entity_id = str(body.get("entity_id", ""))
        except Exception:
            entity_id = ""
        alias = self._token_manager.generate_alias()
        return self.json({"entity_id": entity_id, "alias": alias})


class HarvestPreviewTokenView(HomeAssistantView):
    """POST /api/harvest/tokens/preview - create a short-lived wizard preview token.

    Body: {"entity_id": "light.bedroom", "capabilities": "read-write"}
    Called when the wizard reaches Step 5 or Step 6 (appearance / code preview).
    Returns the preview token_id and expiry.
    """

    url = "/api/harvest/tokens/preview"
    name = "api:harvest:token_preview"
    requires_auth = True

    def __init__(self, token_manager: TokenManager) -> None:
        self._token_manager = token_manager

    async def post(self, request: web.Request) -> web.Response:
        user = request.get("hass_user")
        if user is None or not user.is_admin:
            raise web.HTTPForbidden()

        try:
            body = await request.json()
            entity_id = str(body["entity_id"])
            capabilities = str(body.get("capabilities", "read"))
        except (KeyError, TypeError, Exception):
            raise web.HTTPBadRequest(reason="Requires entity_id and optional capabilities.")

        token = await self._token_manager.create_preview(
            entity_id=entity_id,
            capabilities=capabilities,
            created_by=user.id,
        )
        return self.json({
            "token_id": token.token_id,
            "expires": token.expires.isoformat() if token.expires else None,
            "status": "preview",
        }, status_code=201)


class HarvestPanelJsView(HomeAssistantView):
    """GET /api/harvest/panel.js - serve panel bundle with no-store headers.

    Bypasses HA's static file caching so an updated panel.js is picked up
    immediately on the next page load without an integration reload or HA
    restart.
    """

    url = "/api/harvest/panel.js"
    name = "api:harvest:panel_js"
    requires_auth = False

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def get(self, _request: web.Request) -> web.Response:
        panel_path = Path(self._hass.config.path(
            "custom_components", "harvest", "panel", "panel.js"
        ))
        try:
            content = await self._hass.async_add_executor_job(panel_path.read_bytes)
        except OSError:
            raise web.HTTPNotFound()
        return web.Response(
            body=content,
            content_type="application/javascript",
            headers={"Cache-Control": "no-store"},
        )
