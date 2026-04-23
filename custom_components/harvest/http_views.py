"""HTTP API views for the HArvest panel.

This is an internal API between the bundled panel JS and the integration.
It is not a public protocol. All endpoints require HA authentication.
All endpoints are prefixed with /api/harvest/.
"""
from __future__ import annotations

import asyncio
import dataclasses
import re
from datetime import datetime, timezone
from typing import Any

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .activity_store import ActivityStore, TokenLifecycleEvent
from .diagnostic_sensors import DiagnosticSensors
from .event_bus import EventBus
from .harvest_action import HarvestActionManager, ServiceCall
from .session_manager import SessionManager
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


def register_views(
    hass: HomeAssistant,
    token_manager: TokenManager,
    session_manager: SessionManager,
    activity_store: ActivityStore,
    action_manager: HarvestActionManager,
    sensors: DiagnosticSensors,
    event_bus: EventBus | None = None,
) -> None:
    """Register all HTTP API views with HA's HTTP server.

    All views are prefixed with /api/harvest/.
    All views require HA authentication (panel runs in authenticated context).
    """
    hass.http.register_view(HarvestTokensView(token_manager, session_manager, activity_store))
    hass.http.register_view(HarvestTokenDetailView(hass, token_manager, session_manager, activity_store, event_bus))
    hass.http.register_view(HarvestSessionsView(session_manager))
    hass.http.register_view(HarvestSessionTerminateView(session_manager))
    hass.http.register_view(HarvestActivityView(activity_store, token_manager))
    hass.http.register_view(HarvestActionsView(action_manager))
    hass.http.register_view(HarvestActionDetailView(action_manager))
    hass.http.register_view(HarvestConfigView(hass, session_manager))
    hass.http.register_view(HarvestStatsView(sensors, activity_store, session_manager, token_manager))
    # Additional views needed by the wizard flow.
    hass.http.register_view(HarvestAliasView(token_manager))
    hass.http.register_view(HarvestPreviewTokenView(token_manager))
    hass.http.register_view(HarvestActivityExportView(activity_store))
    hass.http.register_view(HarvestAggregatesView(activity_store))
    hass.http.register_view(HarvestEntitiesView(hass))


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
        entities.append(EntityAccess(
            entity_id=entity_id,
            capabilities=cap,
            alias=e.get("alias") or None,
            exclude_attributes=list(e.get("exclude_attributes", [])),
            companion_of=e.get("companion_of") or None,
            graph=e.get("graph") or None,
            hours=int(e.get("hours", 24)),
            period=int(e.get("period", 10)),
            animate=bool(e.get("animate", False)),
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

    def __init__(self, token_manager: TokenManager, session_manager: SessionManager, activity_store: ActivityStore) -> None:
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._activity_store = activity_store

    async def get(self, request: web.Request) -> web.Response:
        """Return all tokens with their active session counts."""
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
                token_secret=body.get("token_secret") or None,
                rate_limits=rate_limits,
                session=session_cfg,
                max_sessions=body.get("max_sessions"),
                active_schedule=schedule,
                allowed_ips=list(body.get("allowed_ips", [])),
                embed_mode=str(body.get("embed_mode", "single")),
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
        return self.json(_token_to_dict(token), status_code=201)


class HarvestTokenDetailView(HomeAssistantView):
    """GET /api/harvest/tokens/{token_id}   - fetch one token.
    PATCH /api/harvest/tokens/{token_id}  - update token fields.
    DELETE /api/harvest/tokens/{token_id} - revoke or delete a token.
    """

    url = "/api/harvest/tokens/{token_id}"
    name = "api:harvest:token_detail"
    requires_auth = True

    def __init__(self, hass: HomeAssistant, token_manager: TokenManager, session_manager: SessionManager, activity_store: ActivityStore, event_bus: EventBus) -> None:
        self._hass = hass
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._activity_store = activity_store
        self._event_bus = event_bus

    async def get(self, request: web.Request, token_id: str) -> web.Response:
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
            ms = body["max_sessions"]
            if ms is not None and not isinstance(ms, int):
                raise web.HTTPBadRequest(reason="max_sessions must be an integer or null.")
            updates["max_sessions"] = ms
        if "allowed_ips" in body:
            if not isinstance(body["allowed_ips"], list):
                raise web.HTTPBadRequest(reason="allowed_ips must be a list.")
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

        try:
            token = await self._token_manager.update(token_id, updates)
        except (ValueError, KeyError) as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        if token.paused and updates.get("paused"):
            ws_list = self._session_manager.terminate_all_for_token(token_id)
            for ws in ws_list:
                if not ws.closed:
                    asyncio.create_task(ws.close())

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
        token_id = request.query.get("token_id")
        if token_id:
            sessions = self._session_manager.get_all_for_token(token_id)
        else:
            sessions = self._session_manager.get_all()
        return self.json([_session_to_dict(s) for s in sessions])

    async def delete(self, request: web.Request) -> web.Response:
        """Terminate all sessions, optionally filtered to one token."""
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
        try:
            await self._action_manager.delete(action_id)
        except KeyError:
            raise web.HTTPNotFound(reason=f"Action not found: {action_id}")
        return web.Response(status=204)


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
        from .const import DOMAIN, DEFAULTS
        entries = self._hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return self.json({})
        entry = entries[0]
        # Deep-merge stored values over defaults so nested objects like
        # default_session are always fully populated even after partial saves.
        merged = _deep_merge(dict(DEFAULTS), _deep_merge(dict(entry.data), dict(entry.options)))
        return self.json(merged)

    async def patch(self, request: web.Request) -> web.Response:
        """Update global config options in-place without reloading the integration.

        A full integration reload is intentionally avoided here because it
        tears down the panel registration and leaves the Settings screen blank.
        Settings take effect on the next relevant action (new connection, etc.).
        """
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
        # Deep-merge the incoming partial update over the current full config.
        current = _deep_merge(dict(DEFAULTS), _deep_merge(dict(entry.data), dict(entry.options)))
        updated = _deep_merge(current, filtered)
        self._hass.config_entries.async_update_entry(entry, options=updated)

        if filtered.get("kill_switch"):
            for session in self._session_manager.get_all():
                if not session.ws.closed:
                    asyncio.create_task(session.ws.close())

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

    async def get(self, _request: web.Request) -> web.Response:
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
        if user is None:
            raise web.HTTPUnauthorized()

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
