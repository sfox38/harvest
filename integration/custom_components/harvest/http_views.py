"""HTTP API views for the HArvest panel.

This is an internal API between the bundled panel JS and the integration.
It is not a public protocol. All endpoints require HA authentication.
All endpoints are prefixed with /api/harvest/.
"""
from __future__ import annotations

import dataclasses
from datetime import datetime, timezone
from typing import Any

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .activity_store import ActivityStore
from .diagnostic_sensors import DiagnosticSensors
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
) -> None:
    """Register all HTTP API views with HA's HTTP server.

    All views are prefixed with /api/harvest/.
    All views require HA authentication (panel runs in authenticated context).
    """
    hass.http.register_view(HarvestTokensView(token_manager, session_manager))
    hass.http.register_view(HarvestTokenDetailView(token_manager, session_manager))
    hass.http.register_view(HarvestSessionsView(session_manager))
    hass.http.register_view(HarvestActivityView(activity_store))
    hass.http.register_view(HarvestActionsView(action_manager))
    hass.http.register_view(HarvestConfigView(hass))
    hass.http.register_view(HarvestStatsView(sensors, activity_store, session_manager, token_manager))
    # Additional views needed by the wizard flow.
    hass.http.register_view(HarvestAliasView(token_manager))
    hass.http.register_view(HarvestPreviewTokenView(token_manager))
    hass.http.register_view(HarvestActivityExportView(activity_store))
    hass.http.register_view(HarvestAggregatesView(activity_store))


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
        "origin_validated": session.origin_validated,
        "referer_validated": session.referer_validated,
        "subscribed_entity_ids": list(session.subscribed_entity_ids),
        "last_message_at": session.last_message_at.isoformat(),
    }


def _parse_dt(value: Any) -> datetime | None:
    """Parse an ISO 8601 datetime string to a datetime, or None."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except (ValueError, TypeError):
        return None


def _parse_origins(raw: dict) -> OriginConfig:
    return OriginConfig(
        allow_any=bool(raw.get("allow_any", False)),
        allowed=list(raw.get("allowed", [])),
        allow_paths=list(raw.get("allow_paths", [])),
    )


def _parse_rate_limits(raw: dict) -> RateLimitConfig:
    return RateLimitConfig(
        max_push_per_second=int(raw.get("max_push_per_second", 1)),
        max_commands_per_minute=int(raw.get("max_commands_per_minute", 30)),
        override_defaults=bool(raw.get("override_defaults", False)),
    )


def _parse_session_config(raw: dict) -> SessionConfig:
    return SessionConfig(
        lifetime_minutes=int(raw.get("lifetime_minutes", 60)),
        max_lifetime_minutes=int(raw.get("max_lifetime_minutes", 1440)),
        max_renewals=raw.get("max_renewals"),
        absolute_lifetime_hours=raw.get("absolute_lifetime_hours"),
    )


def _parse_entities(raw_list: list) -> list[EntityAccess]:
    entities = []
    for e in raw_list:
        entities.append(EntityAccess(
            entity_id=str(e["entity_id"]),
            capabilities=str(e.get("capabilities", "read")),
            alias=e.get("alias") or None,
            exclude_attributes=list(e.get("exclude_attributes", [])),
        ))
    return entities


def _parse_schedule(raw: dict | None) -> ActiveSchedule | None:
    if not raw:
        return None
    windows = [
        ActiveScheduleWindow(
            days=list(w["days"]),
            start=str(w["start"]),
            end=str(w["end"]),
        )
        for w in raw.get("windows", [])
    ]
    return ActiveSchedule(timezone=str(raw["timezone"]), windows=windows)


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

    def __init__(self, token_manager: TokenManager, session_manager: SessionManager) -> None:
        self._token_manager = token_manager
        self._session_manager = session_manager

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

        try:
            token = await self._token_manager.create(
                label=str(body.get("label", "Unnamed")),
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
            )
        except ValueError as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        return self.json(_token_to_dict(token), status_code=201)


class HarvestTokenDetailView(HomeAssistantView):
    """GET /api/harvest/tokens/{token_id}   - fetch one token.
    PATCH /api/harvest/tokens/{token_id}  - update token fields.
    DELETE /api/harvest/tokens/{token_id} - revoke or delete a token.
    """

    url = "/api/harvest/tokens/{token_id}"
    name = "api:harvest:token_detail"
    requires_auth = True

    def __init__(self, token_manager: TokenManager, session_manager: SessionManager) -> None:
        self._token_manager = token_manager
        self._session_manager = session_manager

    async def get(self, request: web.Request, token_id: str) -> web.Response:
        token = self._token_manager.get(token_id)
        if token is None:
            raise web.HTTPNotFound(reason=f"Token not found: {token_id}")
        d = _token_to_dict(token)
        d["active_sessions"] = self._session_manager.count_for_token(token_id)
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
            updates["label"] = str(body["label"])
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
            updates["max_sessions"] = body["max_sessions"]
        if "allowed_ips" in body:
            updates["allowed_ips"] = list(body["allowed_ips"])
        if "active_schedule" in body:
            updates["active_schedule"] = _parse_schedule(body["active_schedule"])

        try:
            token = await self._token_manager.update(token_id, updates)
        except (ValueError, KeyError) as exc:
            raise web.HTTPBadRequest(reason=str(exc))

        return self.json(_token_to_dict(token))

    async def delete(self, request: web.Request, token_id: str) -> web.Response:
        """Revoke a token (POST ?action=revoke) or delete it (DELETE when revoked).

        Query param action=revoke: revokes an active token.
        No action param: deletes a revoked/expired token permanently.
        """
        action = request.query.get("action")

        if action == "revoke":
            try:
                reason = request.query.get("reason")
                token = await self._token_manager.revoke(token_id, reason)
                # Terminate all active sessions for this token.
                ws_list = self._session_manager.terminate_all_for_token(token_id)
                for ws in ws_list:
                    if not ws.closed:
                        import asyncio
                        asyncio.ensure_future(ws.close())
            except KeyError:
                raise web.HTTPNotFound(reason=f"Token not found: {token_id}")
            return self.json(_token_to_dict(token))

        # Permanent delete.
        try:
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
    """GET /api/harvest/sessions - list active sessions, optionally filtered by token_id."""

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

    def __init__(self, activity_store: ActivityStore) -> None:
        self._activity_store = activity_store

    async def get(self, request: web.Request) -> web.Response:
        token_id = request.query.get("token_id") or None
        event_types_raw = request.query.get("event_types")
        event_types = event_types_raw.split(",") if event_types_raw else None
        since = _parse_dt(request.query.get("since"))
        until = _parse_dt(request.query.get("until"))
        limit = int(request.query.get("limit", "50"))
        offset = int(request.query.get("offset", "0"))

        events, total = await self._activity_store.query_activity(
            token_id=token_id,
            event_types=event_types,
            since=since,
            until=until,
            limit=limit,
            offset=offset,
        )
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
        event_types_raw = request.query.get("event_types")
        event_types = event_types_raw.split(",") if event_types_raw else None
        since = _parse_dt(request.query.get("since"))
        until = _parse_dt(request.query.get("until"))

        csv_data = await self._activity_store.export_csv(
            token_id=token_id,
            event_types=event_types,
            since=since,
            until=until,
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
        hours = int(request.query.get("hours", "24"))
        token_id = request.query.get("token_id") or None
        data = await self._activity_store.query_aggregates(hours=hours, token_id=token_id)
        return self.json(data)


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

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        try:
            service_calls = [
                ServiceCall(domain=str(sc["domain"]), service=str(sc["service"]), data=sc.get("data", {}))
                for sc in body.get("service_calls", [])
            ]
        except (KeyError, TypeError) as exc:
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
    """DELETE /api/harvest/actions/{action_id} - delete a harvest_action."""

    url = "/api/harvest/actions/{action_id}"
    name = "api:harvest:action_detail"
    requires_auth = True

    def __init__(self, action_manager: HarvestActionManager) -> None:
        self._action_manager = action_manager

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

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass

    async def get(self, request: web.Request) -> web.Response:
        from .const import DOMAIN, DEFAULTS
        entries = self._hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return self.json(DEFAULTS)
        entry = entries[0]
        # Merge stored values over defaults so a fresh install returns
        # all fields the Settings screen expects, not a partial object.
        merged = dict(DEFAULTS) | dict(entry.data) | dict(entry.options)
        return self.json(merged)

    async def patch(self, request: web.Request) -> web.Response:
        """Update global config options. Triggers integration reload."""
        from .const import DOMAIN
        entries = self._hass.config_entries.async_entries(DOMAIN)
        if not entries:
            raise web.HTTPNotFound(reason="HArvest integration not loaded.")

        try:
            body = await request.json()
        except Exception:
            raise web.HTTPBadRequest(reason="Invalid JSON body.")

        entry = entries[0]
        self._hass.config_entries.async_update_entry(entry, options=body)
        await self._hass.config_entries.async_reload(entry.entry_id)
        return self.json({"status": "reloading"})


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
        auth_failures = today.get("auth_fail", 0) + today.get("errors", 0)
        return self.json({
            "active_sessions": self._session_manager.count_active(),
            "active_tokens": len(self._token_manager.get_active()),
            "commands_today": today.get("commands", 0),
            "errors_today": auth_failures,
            "db_size_bytes": db_size,
            "is_running": True,
        })


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
        alias = self._token_manager.generate_alias()
        return self.json({"alias": alias})


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
