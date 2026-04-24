"""WebSocket proxy for the HArvest integration.

Registered with HA's HTTP server at WS_PATH. Manages connection lifecycle,
auth flow, message processing, state fan-out, and keepalive.
"""
from __future__ import annotations

import asyncio
import ipaddress
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Callable

import aiohttp
from aiohttp.web import Request, WebSocketResponse
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

from .activity_store import ActivityStore, AuthEvent, CommandEvent, ErrorEvent, SessionEvent
from .const import (
    CONF_AUTH_TIMEOUT,
    CONF_KILL_SWITCH,
    CONF_KEEPALIVE_INTERVAL,
    CONF_MAX_INBOUND_BYTES,
    DEFAULTS,
    DOMAIN,
    ERR_ENTITY_NOT_IN_TOKEN,
    ERR_ORIGIN_DENIED,
    ERR_PERMISSION_DENIED,
    ERR_RATE_LIMITED,
    ERR_SERVER_ERROR,
    ERR_SESSION_EXPIRED,
    ERR_SESSION_LIMIT_REACHED,
    ERR_TOKEN_INACTIVE,
    WS_PATH,
)
from .entity_compatibility import validate_action
from .entity_definition import build_entity_definition, get_blocked_data_keys, split_attributes
from .event_bus import EventBus
from .harvest_action import HarvestActionManager
from .rate_limiter import RateLimiter
from .session_manager import Session, SessionManager
from .theme_manager import ThemeManager, theme_url_to_id
from .token_manager import EntityAccess, Token, TokenManager

if TYPE_CHECKING:
    pass

_LOGGER = logging.getLogger(__name__)

# Flood protection: close connection after this many malformed messages in the window.
FLOOD_LIMIT = 10
FLOOD_WINDOW_SECONDS = 5


def _safe_json_value(val: object) -> object:
    """Convert a value to a JSON-safe type.

    HA entity attributes may contain datetime objects, sets, or other
    non-serializable types. This recursively converts them so
    ws.send_json (which uses stdlib json.dumps) does not raise TypeError.
    """
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, dict):
        return {k: _safe_json_value(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return [_safe_json_value(v) for v in val]
    if isinstance(val, (set, frozenset)):
        return [_safe_json_value(v) for v in sorted(val, key=str)]
    if isinstance(val, (str, int, float, bool)) or val is None:
        return val
    return str(val)

# Warn the client this many seconds before session expiry.
_SESSION_EXPIRING_WARN_BEFORE = 600  # 10 minutes

_background_tasks: set[asyncio.Task] = set()  # prevent GC of fire-and-forget tasks

def _fire(coro: object) -> None:
    """Schedule a coroutine as a fire-and-forget task, logging any exception."""
    async def _wrap(c: object) -> None:
        try:
            await c  # type: ignore[misc]
        except Exception:
            _LOGGER.warning("Fire-and-forget task raised an exception", exc_info=True)
    task = asyncio.create_task(_wrap(coro))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# Allowed data keys per domain for command forwarding.
# Unknown keys are stripped before the call reaches HA.
_ALLOWED_DATA_KEYS: dict[str, set[str]] = {
    "light": {
        "brightness", "brightness_pct", "color_temp", "color_temp_kelvin",
        "rgb_color", "rgbw_color", "rgbww_color", "hs_color", "xy_color",
        "color_mode", "effect", "flash", "transition",
    },
    "fan": {"percentage", "oscillating", "direction", "preset_mode"},
    "cover": {"position", "tilt_position"},
    "climate": {
        "temperature", "target_temp_low", "target_temp_high",
        "hvac_mode", "fan_mode", "preset_mode", "swing_mode", "aux_heat",
    },
    "input_number": {"value"},
    "input_select": {"option"},
    "media_player": {
        "volume_level", "media_content_id", "media_content_type",
        "source", "sound_mode",
    },
    "remote": {"command", "device", "num_repeats", "delay_secs", "hold_secs", "activity"},
    "harvest_action": set(),
}


class HarvestWsView(HomeAssistantView):
    """WebSocket endpoint. requires_auth = False (uses its own token-based auth)."""

    url = WS_PATH
    name = "api:harvest:ws"
    requires_auth = False

    def __init__(
        self,
        hass: HomeAssistant,
        token_manager: TokenManager,
        session_manager: SessionManager,
        rate_limiter: RateLimiter,
        activity_store: ActivityStore,
        event_bus: EventBus,
        action_manager: HarvestActionManager,
        config: dict,
        sensors: object = None,
        theme_manager: ThemeManager | None = None,
    ) -> None:
        self._hass = hass
        self._token_manager = token_manager
        self._session_manager = session_manager
        self._rate_limiter = rate_limiter
        self._activity_store = activity_store
        self._event_bus = event_bus
        self._action_manager = action_manager
        self._config = config
        self._sensors = sensors
        self._theme_manager = theme_manager

    async def get(self, request: Request) -> WebSocketResponse:
        """Handle incoming WebSocket upgrade.

        Checks per-IP rate limit before accepting. Returns HTTP 429 if limited.
        Accepts the WebSocket upgrade and delegates to _handle_connection().
        """
        source_ip = self._get_source_ip(request)

        if not self._rate_limiter.check_ip(source_ip):
            raise aiohttp.web.HTTPTooManyRequests(
                reason="Too many connection attempts from this IP."
            )

        keepalive = self._config.get(CONF_KEEPALIVE_INTERVAL, DEFAULTS[CONF_KEEPALIVE_INTERVAL])

        # heartbeat handles ping/pong liveness at the WS protocol level.
        # Do NOT set receive_timeout here; it would close the connection when
        # no application-level message arrives within the timeout, even though
        # the client is still alive (pong frames do not count as messages).
        ws = WebSocketResponse(heartbeat=keepalive)
        await ws.prepare(request)
        await self._handle_connection(ws, request)
        return ws

    async def _handle_connection(
        self,
        ws: WebSocketResponse,
        request: Request,
    ) -> None:
        """Manage the full lifecycle of a single WebSocket connection.

        1. Wait for auth message within auth_timeout_seconds. Close silently if none.
        2. Validate auth via token_manager.validate_auth().
        3. On success: call session_manager.create() to establish the session.
           If session_manager.create() raises ValueError (token.max_sessions reached),
           catch it and send auth_failed with HRV_SESSION_LIMIT_REACHED before closing.
        4. Send auth_ok, send interleaved entity_definition + state_update pairs,
           register state_changed listeners.
        5. On auth failure: send auth_failed and close.
        6. Enter message loop.
        7. On exit: clean up session, unregister listeners, free rate buckets.
        """
        source_ip = self._get_source_ip(request)
        auth_timeout = self._config.get(CONF_AUTH_TIMEOUT, DEFAULTS[CONF_AUTH_TIMEOUT])

        # --- Step 0: Kill switch ---
        if self._is_kill_switch_active():
            await ws.send_json({"type": "auth_failed", "code": ERR_TOKEN_INACTIVE, "msg_id": None})
            await ws.close()
            return

        # --- Step 1: Wait for auth message ---
        try:
            raw = await asyncio.wait_for(ws.receive(), timeout=auth_timeout)
        except asyncio.TimeoutError:
            await ws.close()
            return

        if raw.type != aiohttp.WSMsgType.TEXT:
            await ws.close()
            return

        # --- Step 2: Parse and validate auth ---
        try:
            msg = json.loads(raw.data)
        except (json.JSONDecodeError, ValueError):
            await ws.close()
            return

        if not isinstance(msg, dict) or msg.get("type") != "auth":
            await ws.close()
            return

        token_id = msg.get("token_id", "")
        raw_entity_refs = msg.get("entity_ids", [])
        if not isinstance(raw_entity_refs, list):
            await ws.close()
            return
        entity_refs: list[str] = raw_entity_refs
        origin: str = request.headers.get("Origin", "")
        page_path: str | None = msg.get("page_path")
        msg_id = msg.get("msg_id")

        # Per-token auth rate limit check (brute-force protection).
        if not self._rate_limiter.check_auth_for_token(token_id):
            self._rate_limiter.record_auth_attempt(token_id)
            await ws.send_json({"type": "auth_failed", "code": ERR_RATE_LIMITED, "msg_id": msg_id})
            await ws.close()
            return

        # Validate auth (checks all 10 conditions in spec order).
        token, error_code = self._token_manager.validate_auth(
            token_id=token_id,
            origin=origin,
            page_path=page_path,
            source_ip=source_ip,
            entity_refs=entity_refs,
            timestamp=msg.get("timestamp"),
            nonce=msg.get("nonce"),
            signature=msg.get("signature"),
        )

        if error_code is not None:
            # Record failed auth attempt and fire events.
            self._rate_limiter.record_auth_attempt(token_id)
            self._activity_store.record_auth(AuthEvent(
                token_id=token_id,
                origin=origin,
                source_ip=source_ip,
                result="failed",
                error_code=error_code,
                timestamp=datetime.now(tz=timezone.utc),
                referer=page_path,
            ))
            self._event_bus.auth_failure(token_id or None, origin, error_code)
            if error_code == ERR_ORIGIN_DENIED:
                self._event_bus.suspicious_origin(token_id, origin, source_ip)
                self._activity_store.record_error(ErrorEvent(
                    session_id=None,
                    code="SUSPICIOUS_ORIGIN",
                    message=f"Origin denied: {origin}",
                    timestamp=datetime.now(tz=timezone.utc),
                ))
            await ws.send_json({"type": "auth_failed", "code": error_code, "msg_id": msg_id})
            await ws.close()
            return

        # --- Step 3: Create session ---
        # Build the real entity_id list and outgoing_ids map (alias -> outgoing entity_id).
        # outgoing_ids maps real_entity_id -> what to put in entity_id field of outgoing messages.
        real_entity_ids: list[str] = []
        outgoing_ids: dict[str, str] = {}  # real_entity_id -> outgoing id (alias or real)

        for ref in entity_refs:
            ea = self._resolve_entity_ref(ref, token)
            if ea is not None and ea.entity_id not in outgoing_ids:
                real_entity_ids.append(ea.entity_id)
                outgoing_ids[ea.entity_id] = ref  # echo back whatever the client sent

        session_id = self._token_manager.generate_session_id()

        try:
            session = self._session_manager.create(
                session_id=session_id,
                token=token,
                origin=origin,
                referer=page_path,
                source_ip=source_ip,
                ws=ws,
                entity_ids=real_entity_ids,
            )
        except ValueError:
            # max_sessions reached.
            self._event_bus.session_limit_reached(token.token_id, token.label)
            await ws.send_json({
                "type": "auth_failed",
                "code": ERR_SESSION_LIMIT_REACHED,
                "msg_id": msg_id,
            })
            await ws.close()
            return

        # --- Step 4: Send auth_ok ---
        await ws.send_json({
            "type": "auth_ok",
            "session_id": session.session_id,
            "expires_at": session.expires_at.isoformat(),
            "absolute_expires_at": session.absolute_expires_at.isoformat(),
            "entity_ids": entity_refs,  # echo back exactly as received
            "msg_id": msg_id,
        })

        # Record successful auth.
        self._activity_store.record_auth(AuthEvent(
            token_id=token.token_id,
            origin=origin,
            source_ip=source_ip,
            result="ok",
            error_code=None,
            timestamp=datetime.now(tz=timezone.utc),
            referer=page_path,
        ))
        self._event_bus.session_connected(session.session_id, token.token_id, origin)
        self._activity_store.record_session(SessionEvent(
            session_id=session.session_id,
            token_id=token.token_id,
            origin=origin,
            source_ip=source_ip,
            event_type="connected",
            timestamp=datetime.now(tz=timezone.utc),
            referer=page_path,
        ))
        if self._sensors is not None:
            self._sensors.push_token_update(token.token_id)

        # Register HA state listeners. listener_unsubs maps real_entity_id -> unsub callable.
        listener_unsubs: dict[str, Callable] = {}

        # Schedule session_expiring warning.
        expiry_warning_task = asyncio.create_task(
            self._send_session_expiring(ws, session)
        )

        # Send application-level keepalive messages so the JS client's
        # heartbeat watchdog stays satisfied (WS ping/pong frames do not
        # trigger the browser's onmessage event).
        keepalive_interval = self._config.get(
            CONF_KEEPALIVE_INTERVAL, DEFAULTS[CONF_KEEPALIVE_INTERVAL]
        )
        keepalive_task = asyncio.create_task(
            self._send_keepalive(ws, keepalive_interval, session)
        )

        # Track which entities have already had history sent (debounce per session).
        history_sent: set[str] = set()

        # --- Step 4a: Send theme data if token has a theme ---
        if self._theme_manager and token.theme_url:
            theme_id = theme_url_to_id(token.theme_url)
            theme_def = self._theme_manager.get(theme_id)
            if theme_def:
                await ws.send_json({
                    "type": "theme",
                    "variables": theme_def.variables,
                    "dark_variables": theme_def.dark_variables,
                })

        # --- Steps 4b/6/7: Initial state, message loop, and cleanup ---
        # _send_initial_state and _register_listeners are inside the try block so
        # that a dropped connection during initial state push still triggers cleanup.
        try:
            await self._send_initial_state(ws, session, real_entity_ids, token, outgoing_ids)
            self._register_listeners(ws, session, token, outgoing_ids, listener_unsubs, real_entity_ids)
            await self._message_loop(ws, session, token, outgoing_ids, listener_unsubs, history_sent)
        finally:
            # --- Step 7: Cleanup ---
            expiry_warning_task.cancel()
            keepalive_task.cancel()
            for unsub in listener_unsubs.values():
                unsub()
            self._session_manager.terminate(session.session_id)
            self._rate_limiter.cleanup_session(session.session_id)
            self._activity_store.record_session(SessionEvent(
                session_id=session.session_id,
                token_id=token.token_id,
                origin=origin,
                source_ip=source_ip,
                event_type="disconnected",
                timestamp=datetime.now(tz=timezone.utc),
                referer=page_path,
            ))
            if self._sensors is not None:
                self._sensors.push_token_update(token.token_id)

    async def _send_initial_state(
        self,
        ws: WebSocketResponse,
        session: Session,
        entity_ids: list[str],
        token: Token,
        outgoing_ids: dict[str, str],
    ) -> None:
        """Send interleaved entity_definition and state_update for each entity.

        For each entity_id:
        1. Build and send entity_definition
        2. Fetch current state from hass.states.get()
        3. Build and send state_update (full attributes, initial=True)
        If entity does not exist, send entity_removed instead.
        """
        for real_id in entity_ids:
            ea = _find_entity_access(real_id, token)
            outgoing_id = outgoing_ids.get(real_id, real_id)

            state = self._hass.states.get(real_id)
            if state is None:
                await ws.send_json({"type": "entity_removed", "entity_id": outgoing_id, "msg_id": None})
                continue

            # entity_definition
            defn = build_entity_definition(self._hass, real_id, ea)
            if defn is not None:
                defn = dict(defn)
                defn["type"] = "entity_definition"
                defn["entity_id"] = outgoing_id
                defn["capabilities"] = ea.capabilities if ea else "read"
                defn["msg_id"] = None
                await ws.send_json(defn)

            # state_update (initial = full attributes)
            update = self._build_state_update_message(
                real_id=real_id,
                outgoing_id=outgoing_id,
                state=state,
                token=token,
                is_initial=True,
                session=session,
            )
            await ws.send_json(update)

    async def _message_loop(
        self,
        ws: WebSocketResponse,
        session: Session,
        token: Token,
        outgoing_ids: dict[str, str],
        listener_unsubs: dict[str, Callable],
        history_sent: set[str],
    ) -> None:
        """Process incoming messages until the connection closes.

        Validates message size (close if exceeded).
        Parses JSON (log warn and continue on parse error).
        Tracks flood protection counter.
        Dispatches to appropriate handler by message type.
        Note: unsubscribe is fire-and-forget - no ack or response is sent.
        Touches session and resets heartbeat on every message.
        """
        max_bytes = self._config.get(CONF_MAX_INBOUND_BYTES, DEFAULTS[CONF_MAX_INBOUND_BYTES])
        flood_count = 0
        flood_window_start = time.monotonic()

        async for raw in ws:
            if raw.type == aiohttp.WSMsgType.TEXT:
                # Size check before parsing.
                if len(raw.data) > max_bytes:
                    _LOGGER.warning(
                        "HArvest: inbound message from session %s exceeds %d bytes. Closing.",
                        session.session_id, max_bytes,
                    )
                    await ws.close()
                    return

                self._session_manager.touch(session.session_id)

                try:
                    msg = json.loads(raw.data)
                except (json.JSONDecodeError, ValueError):
                    _LOGGER.warning("HArvest: unparseable JSON from session %s.", session.session_id)
                    flood_count, flood_window_start = _track_flood(
                        flood_count, flood_window_start
                    )
                    if flood_count > FLOOD_LIMIT:
                        self._event_bus.flood_protection(session.session_id, session.origin_validated)
                        self._activity_store.record_error(ErrorEvent(
                            session_id=session.session_id,
                            code="FLOOD_PROTECTION",
                            message="Connection closed: message flood detected.",
                            timestamp=datetime.now(tz=timezone.utc),
                        ))
                        await ws.close()
                        return
                    continue

                if not isinstance(msg, dict):
                    flood_count, flood_window_start = _track_flood(flood_count, flood_window_start)
                    if flood_count > FLOOD_LIMIT:
                        self._event_bus.flood_protection(session.session_id, session.origin_validated)
                        self._activity_store.record_error(ErrorEvent(
                            session_id=session.session_id,
                            code="FLOOD_PROTECTION",
                            message="Connection closed: message flood detected.",
                            timestamp=datetime.now(tz=timezone.utc),
                        ))
                        await ws.close()
                        return
                    continue

                msg_type = msg.get("type")

                if msg_type == "command":
                    await self._handle_command(ws, msg, session, token)
                elif msg_type == "subscribe":
                    await self._handle_subscribe(ws, msg, session, token, outgoing_ids, listener_unsubs)
                elif msg_type == "unsubscribe":
                    await self._handle_unsubscribe(ws, msg, session, listener_unsubs)
                elif msg_type == "renew":
                    await self._handle_renew(ws, msg, session, token, outgoing_ids, listener_unsubs)
                elif msg_type == "history_request":
                    await self._handle_history_request(ws, msg, session, token, outgoing_ids, history_sent)
                elif msg_type is None:
                    _LOGGER.debug("HArvest: message missing 'type' from session %s.", session.session_id)
                    flood_count, flood_window_start = _track_flood(flood_count, flood_window_start)
                else:
                    _LOGGER.debug("HArvest: unknown message type '%s' from session %s.", msg_type, session.session_id)

            elif raw.type in (aiohttp.WSMsgType.CLOSE, aiohttp.WSMsgType.ERROR):
                break

    async def _handle_command(
        self,
        ws: WebSocketResponse,
        msg: dict,
        session: Session,
        token: Token,
    ) -> None:
        """Process a command message.

        Validates session_id, entity_id scope, capability (read-write required),
        action against ALLOWED_SERVICES, and command rate limit.
        Strips unknown keys from data payload before forwarding.
        Calls hass.services.async_call() or action_manager.trigger().
        Sends ack. Records command in activity_store.
        """
        msg_id = msg.get("msg_id")
        entity_ref: str = msg.get("entity_id", "")
        action: str = msg.get("action", "")
        raw_data = msg.get("data")
        data: dict = raw_data if isinstance(raw_data, dict) else {}

        async def ack_error(code: str, message: str) -> None:
            await ws.send_json({
                "type": "ack",
                "success": False,
                "error_code": code,
                "error_message": message,
                "msg_id": msg_id,
            })

        # Resolve entity_ref (alias or real ID) to EntityAccess.
        ea = self._resolve_entity_ref(entity_ref, token)
        if ea is None:
            await ack_error(ERR_ENTITY_NOT_IN_TOKEN, f"Entity not in token: {entity_ref}")
            return

        real_id = ea.entity_id
        domain = real_id.split(".")[0]

        # Capability check: must be read-write.
        if ea.capabilities != "read-write":
            await ack_error(ERR_PERMISSION_DENIED, f"Write not permitted for entity {entity_ref}")
            return

        # Companions with read capability are never allowed to send commands.
        # (Checked above by capability check - read-only entities are blocked.)

        # Validate action against ALLOWED_SERVICES.
        err = validate_action(domain, action)
        if err is not None:
            await ack_error(err, f"Action '{action}' not permitted for domain '{domain}'")
            return

        # Command rate limit check.
        max_cmds = token.rate_limits.max_commands_per_minute
        allowed, retry_after = self._rate_limiter.check_command(session.session_id, max_cmds)
        if not allowed:
            await ws.send_json({
                "type": "ack",
                "success": False,
                "error_code": ERR_RATE_LIMITED,
                "error_message": f"Rate limit exceeded. Retry after {retry_after}s.",
                "retry_after": retry_after,
                "msg_id": msg_id,
            })
            return

        # Strip unknown data keys, then strip keys blocked by exclude_attributes.
        allowed_keys = _ALLOWED_DATA_KEYS.get(domain, set())
        blocked_keys = get_blocked_data_keys(ea.exclude_attributes) if ea.exclude_attributes else set()
        clean_data = {k: v for k, v in data.items() if k in allowed_keys and k not in blocked_keys}

        # Execute.
        success = True
        try:
            if domain == "harvest_action":
                action_id = real_id.split(".", 1)[1]
                await self._action_manager.trigger(action_id, session)
            else:
                await self._hass.services.async_call(
                    domain, action, clean_data,
                    target={"entity_id": real_id},
                    blocking=True,
                )
        except Exception:
            _LOGGER.exception(
                "HArvest: error executing %s.%s for session %s.", domain, action, session.session_id
            )
            success = False

        await ws.send_json({
            "type": "ack",
            "success": success,
            "entity_id": entity_ref,
            "error_code": ERR_SERVER_ERROR if not success else None,
            "error_message": "Internal error executing command." if not success else None,
            "msg_id": msg_id,
        })

        self._activity_store.record_command(CommandEvent(
            session_id=session.session_id,
            token_id=token.token_id,
            entity_id=real_id,
            action=action,
            success=success,
            timestamp=datetime.now(tz=timezone.utc),
        ))
        if self._sensors is not None:
            self._sensors.push_token_update(token.token_id)

    async def _handle_subscribe(
        self,
        ws: WebSocketResponse,
        msg: dict,
        session: Session,
        token: Token,
        outgoing_ids: dict[str, str],
        listener_unsubs: dict[str, Callable],
    ) -> None:
        """Process a subscribe message.

        Validates entity_ids against token. Adds to session subscriptions.
        Registers state_changed listeners. Sends subscribe_ok.
        Sends interleaved entity_definition + state_update for each new entity.
        """
        msg_id = msg.get("msg_id")
        raw_refs = msg.get("entity_ids", [])
        if not isinstance(raw_refs, list):
            await ws.send_json({"type": "error", "code": "ERR_BAD_REQUEST", "msg_id": msg_id})
            return
        refs: list[str] = raw_refs

        accepted_refs: list[str] = []
        new_real_ids: list[str] = []

        for ref in refs:
            ea = self._resolve_entity_ref(ref, token)
            if ea is None:
                continue
            if ea.entity_id in session.subscribed_entity_ids:
                continue  # already subscribed
            accepted_refs.append(ref)
            new_real_ids.append(ea.entity_id)
            outgoing_ids[ea.entity_id] = ref

        if not accepted_refs:
            await ws.send_json({"type": "subscribe_ok", "entity_ids": [], "msg_id": msg_id})
            return

        self._session_manager.add_subscription(session.session_id, new_real_ids)

        await ws.send_json({"type": "subscribe_ok", "entity_ids": accepted_refs, "msg_id": msg_id})

        # Send interleaved entity_definition + state_update for each new entity.
        await self._send_initial_state(ws, session, new_real_ids, token, outgoing_ids)

        # Register new listeners.
        self._register_listeners(ws, session, token, outgoing_ids, listener_unsubs, new_real_ids)

    async def _handle_unsubscribe(
        self,
        ws: WebSocketResponse,
        msg: dict,
        session: Session,
        listener_unsubs: dict[str, Callable],
    ) -> None:
        """Process an unsubscribe message.

        Removes entity_ids from session subscriptions.
        Unregisters state_changed listeners if no other session needs them.
        No response is sent.
        """
        refs: list[str] = msg.get("entity_ids", [])
        real_ids: list[str] = []

        for ref in refs:
            # Map ref back to real entity_id via the reverse of outgoing_ids.
            real_id = self._ref_to_real_id(ref, session)
            if real_id:
                real_ids.append(real_id)

        self._session_manager.remove_subscription(session.session_id, real_ids)

        for real_id in real_ids:
            unsub = listener_unsubs.pop(real_id, None)
            if unsub is not None:
                unsub()

    async def _handle_renew(
        self,
        ws: WebSocketResponse,
        msg: dict,
        session: Session,
        token: Token,
        outgoing_ids: dict[str, str],
        listener_unsubs: dict[str, Callable],
    ) -> None:
        """Process a renew message.

        Checks max_renewals before calling session_manager.renew().
        Sends new auth_ok. Resends interleaved entity_definition + state_update
        for all subscribed entities. On error: send auth_failed and close.
        """
        msg_id = msg.get("msg_id")

        # Check max_renewals before calling renew() (session_manager doesn't have token context).
        if (
            token.session.max_renewals is not None
            and session.renewal_count >= token.session.max_renewals
        ):
            await ws.send_json({
                "type": "auth_failed",
                "code": ERR_SESSION_LIMIT_REACHED,
                "msg_id": msg_id,
            })
            await ws.close()
            return

        old_session_id = session.session_id

        try:
            session = self._session_manager.renew(session)
        except ValueError as exc:
            _LOGGER.warning("HArvest: renew failed for session %s: %s", old_session_id, exc)
            await ws.send_json({
                "type": "auth_failed",
                "code": ERR_SESSION_LIMIT_REACHED,
                "msg_id": msg_id,
            })
            await ws.close()
            return

        # Send new auth_ok with new session_id.
        # entity_ids echoes the outgoing_ids values (what the client originally sent).
        outgoing_entity_ids = [outgoing_ids.get(eid, eid) for eid in session.subscribed_entity_ids]
        await ws.send_json({
            "type": "auth_ok",
            "session_id": session.session_id,
            "expires_at": session.expires_at.isoformat(),
            "absolute_expires_at": session.absolute_expires_at.isoformat(),
            "entity_ids": outgoing_entity_ids,
            "msg_id": msg_id,
        })

        # Resend interleaved entity_definition + state_update for all subscribed entities.
        await self._send_initial_state(
            ws, session, list(session.subscribed_entity_ids), token, outgoing_ids
        )

    # ------------------------------------------------------------------
    # History
    # ------------------------------------------------------------------

    async def _handle_history_request(
        self,
        ws: WebSocketResponse,
        msg: dict,
        session: Session,
        token: Token,
        outgoing_ids: dict[str, str],
        history_sent: set[str],
    ) -> None:
        """Fetch entity state history from HA's recorder and send history_data.

        Debounces: each (session, entity) pair gets history at most once.
        If recorder is not loaded, sends empty points array.
        """
        msg_id = msg.get("msg_id")
        entity_ref = msg.get("entity_id", "")
        hours = msg.get("hours", 24)
        if not isinstance(hours, (int, float)) or hours < 1:
            hours = 24
        hours = min(hours, 168)  # cap at 7 days

        period = msg.get("period", 10)
        if not isinstance(period, (int, float)) or period < 1:
            period = 10
        period = int(period)
        hours_in_minutes = int(hours) * 60
        if period >= hours_in_minutes:
            period = 10

        real_id = self._ref_to_real_id(entity_ref, session)
        if real_id is None:
            await ws.send_json({
                "type": "error",
                "code": ERR_ENTITY_NOT_IN_TOKEN,
                "message": f"Entity {entity_ref} not in session.",
                "msg_id": msg_id,
            })
            return

        outgoing_id = outgoing_ids.get(real_id, real_id)

        if real_id in history_sent:
            return
        history_sent.add(real_id)

        points: list[dict[str, str]] = []

        if "recorder" in self._hass.config.components:
            try:
                from homeassistant.components.recorder import get_instance, history

                end = datetime.now(tz=timezone.utc)
                start = end - timedelta(hours=int(hours))
                instance = get_instance(self._hass)
                states_dict = await instance.async_add_executor_job(
                    history.state_changes_during_period,
                    self._hass,
                    start,
                    end,
                    real_id,
                    True,  # no_attributes - we only need state values
                )
                raw_points: list[tuple[float, float]] = []
                for state_obj in states_dict.get(real_id, []):
                    s = state_obj.state
                    if s in ("unavailable", "unknown", ""):
                        continue
                    try:
                        raw_points.append((
                            state_obj.last_changed.timestamp(),
                            float(s),
                        ))
                    except (ValueError, TypeError):
                        continue

                if raw_points:
                    points = _aggregate_points(raw_points, start.timestamp(), end.timestamp(), period)

            except Exception:
                _LOGGER.warning("HArvest: failed to fetch history for %s", real_id, exc_info=True)

        await ws.send_json({
            "type": "history_data",
            "entity_id": outgoing_id,
            "hours": hours,
            "period": period,
            "points": points,
            "msg_id": msg_id,
        })

    # ------------------------------------------------------------------
    # State fan-out
    # ------------------------------------------------------------------

    def _register_listeners(
        self,
        ws: WebSocketResponse,
        session: Session,
        token: Token,
        outgoing_ids: dict[str, str],
        listener_unsubs: dict[str, Callable],
        entity_ids: list[str],
    ) -> None:
        """Register HA state_changed listeners for a set of entity IDs.

        One listener per entity per session. Stored in listener_unsubs for cleanup.
        """
        for real_id in entity_ids:
            if real_id in listener_unsubs:
                continue  # already listening

            @callback
            def _make_callback(eid: str) -> Callable:
                @callback
                def on_state_changed(event) -> None:
                    self._on_state_changed(event, eid, ws, session, token, outgoing_ids)
                return on_state_changed

            unsub = async_track_state_change_event(
                self._hass, [real_id], _make_callback(real_id)
            )
            listener_unsubs[real_id] = unsub

    @callback
    def _on_state_changed(
        self,
        event,
        entity_id: str,
        ws: WebSocketResponse,
        session: Session,
        token: Token,
        outgoing_ids: dict[str, str],
    ) -> None:
        """HA event callback for state_changed events.

        Finds all sessions subscribed to this entity.
        Checks push rate limit, builds state_update delta,
        enqueues send via asyncio.create_task() to avoid blocking the event loop.
        """
        if entity_id not in session.subscribed_entity_ids:
            return

        new_state = event.data.get("new_state")

        # Entity was removed from HA entirely (new_state is None).
        if new_state is None:
            outgoing_id = outgoing_ids.get(entity_id, entity_id)
            _fire(ws.send_json({"type": "entity_removed", "entity_id": outgoing_id, "msg_id": None}))
            return

        # Push rate limit per (session, entity).
        push_rate = token.rate_limits.max_push_per_second
        if not self._rate_limiter.check_push(session.session_id, entity_id, push_rate):
            outgoing_id = outgoing_ids.get(entity_id, entity_id)
            self._hass.async_create_task(
                self._deferred_state_push(ws, entity_id, outgoing_id, token, session)
            )
            return

        outgoing_id = outgoing_ids.get(entity_id, entity_id)
        update = self._build_state_update_message(
            real_id=entity_id,
            outgoing_id=outgoing_id,
            state=new_state,
            token=token,
            is_initial=False,
            session=session,
        )
        _fire(ws.send_json(update))

    async def _deferred_state_push(
        self,
        ws: WebSocketResponse,
        entity_id: str,
        outgoing_id: str,
        token: Token,
        session: Session,
    ) -> None:
        """Push the current HA state for entity_id after a 1-second delay.

        Called when a state update was rate-limited. Ensures the widget
        converges to the final state even when intermediate updates are dropped.
        """
        await asyncio.sleep(1.0)
        if ws.closed:
            return
        if entity_id not in session.subscribed_entity_ids:
            return
        state = self._hass.states.get(entity_id)
        if state is None:
            return
        update = self._build_state_update_message(
            real_id=entity_id,
            outgoing_id=outgoing_id,
            state=state,
            token=token,
            is_initial=False,
            session=session,
        )
        try:
            await ws.send_json(update)
        except Exception:
            pass

    # ------------------------------------------------------------------
    # Message builders
    # ------------------------------------------------------------------

    def _build_state_update_message(
        self,
        real_id: str,
        outgoing_id: str,
        state,
        token: Token,
        is_initial: bool,
        session: Session | None = None,
    ) -> dict:
        """Build a state_update message dict.

        For initial=True: full attributes and extended_attributes.
        For initial=False: computes attributes_delta by comparing to
        session.last_sent_attributes[entity_id]. Omits attributes_delta
        if only state changed and no attributes changed.
        Applies token_manager.filter_attributes() before building.
        Updates session.last_sent_attributes after building.
        """
        domain = real_id.split(".")[0]
        raw_attrs = dict(state.attributes)

        # Filter via token denylist and per-entity exclusions.
        filtered_attrs = self._token_manager.filter_attributes(real_id, token, raw_attrs)

        # Split into standard and extended, then sanitize for JSON.
        standard, extended = split_attributes(domain, filtered_attrs)
        standard = _safe_json_value(standard)
        extended = _safe_json_value(extended)

        last_changed = state.last_changed.isoformat() if hasattr(state, "last_changed") else None
        last_updated = state.last_updated.isoformat() if hasattr(state, "last_updated") else None

        if is_initial:
            msg = {
                "type": "state_update",
                "entity_id": outgoing_id,
                "state": state.state,
                "attributes": standard,
                "extended_attributes": extended,
                "last_changed": last_changed,
                "last_updated": last_updated,
                "initial": True,
                "msg_id": None,
            }
            if session is not None:
                session.last_sent_attributes[real_id] = standard
            return msg

        # Delta mode.
        prev = session.last_sent_attributes.get(real_id, {}) if session is not None else {}

        changed = {k: v for k, v in standard.items() if prev.get(k) != v}
        removed = [k for k in prev if k not in standard]

        if session is not None:
            session.last_sent_attributes[real_id] = standard

        msg = {
            "type": "state_update",
            "entity_id": outgoing_id,
            "state": state.state,
            "last_changed": last_changed,
            "last_updated": last_updated,
            "initial": False,
            "msg_id": None,
        }

        if changed or removed:
            msg["attributes_delta"] = {"changed": changed, "removed": removed}
        # If neither changed nor removed, attributes_delta is omitted entirely per spec.

        return msg

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _send_keepalive(self, ws: WebSocketResponse, interval: int, session: Session | None = None) -> None:
        """Send periodic keepalive data messages to the client.

        Also checks the kill switch and session expiry each tick; if either
        condition is met, sends auth_failed and closes the WebSocket from
        within the handler context so the message loop exits cleanly.
        """
        try:
            while not ws.closed:
                await asyncio.sleep(interval)
                if ws.closed:
                    break
                if self._is_kill_switch_active():
                    await ws.send_json({"type": "auth_failed", "code": ERR_TOKEN_INACTIVE, "msg_id": None})
                    await ws.close()
                    break
                if session is not None and self._session_manager.is_expired(session):
                    await ws.send_json({"type": "auth_failed", "code": ERR_SESSION_EXPIRED, "msg_id": None})
                    await ws.close()
                    break
                await ws.send_json({"type": "keepalive", "msg_id": None})
        except (asyncio.CancelledError, ConnectionResetError):
            pass
        except Exception:
            pass

    async def _send_session_expiring(self, ws: WebSocketResponse, session: Session) -> None:
        """Send session_expiring warning 10 minutes before expiry."""
        now = datetime.now(tz=timezone.utc)
        warn_at = session.expires_at - timedelta(seconds=_SESSION_EXPIRING_WARN_BEFORE)
        delay = (warn_at - now).total_seconds()
        if delay > 0:
            await asyncio.sleep(delay)
        try:
            if not ws.closed:
                await ws.send_json({
                    "type": "session_expiring",
                    "expires_at": session.expires_at.isoformat(),
                    "msg_id": None,
                })
        except Exception:
            pass

    def _resolve_entity_ref(self, ref: str, token: Token) -> EntityAccess | None:
        """Resolve an entity ref (alias or real entity_id) to its EntityAccess.

        Alias lookup first, then real entity_id lookup. Returns None if not found.
        """
        for ea in token.entities:
            if ea.alias is not None and ea.alias == ref:
                return ea
        for ea in token.entities:
            if ea.entity_id == ref:
                return ea
        return None

    def _ref_to_real_id(self, ref: str, session: Session) -> str | None:
        """Map an outgoing entity_id or alias back to a real entity_id via the session."""
        # ref may be a real entity_id directly in subscribed_entity_ids.
        if ref in session.subscribed_entity_ids:
            return ref
        # ref may be an alias - scan allowed_entities for a match.
        for ea in session.allowed_entities:
            if ea.alias == ref and ea.entity_id in session.subscribed_entity_ids:
                return ea.entity_id
        return None

    def _is_kill_switch_active(self) -> bool:
        """Read kill_switch from the live config entry (not the init-time snapshot)."""
        entries = self._hass.config_entries.async_entries(DOMAIN)
        if not entries:
            return False
        entry = entries[0]
        merged = {**entry.data, **entry.options}
        return bool(merged.get(CONF_KILL_SWITCH, False))

    def _get_source_ip(self, request: Request) -> str:
        """Extract the real client IP.

        Reads X-Forwarded-For if connection is from a trusted proxy.
        Falls back to connection peer name otherwise.
        """
        trusted_proxies: list[str] = self._config.get("trusted_proxies", [])
        peer = request.transport.get_extra_info("peername")
        peer_ip = peer[0] if peer else ""

        if trusted_proxies and peer_ip and _ip_in_trusted(peer_ip, trusted_proxies):
            forwarded = request.headers.get("X-Forwarded-For", "")
            if forwarded:
                return forwarded.split(",")[0].strip()

        return peer_ip


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------

def _ip_in_trusted(peer_ip: str, trusted: list[str]) -> bool:
    """Check whether peer_ip falls within any trusted proxy entry.

    Each entry may be a bare IP or a CIDR network (e.g. "10.0.0.0/8").
    """
    try:
        addr = ipaddress.ip_address(peer_ip)
    except ValueError:
        return False
    for entry in trusted:
        try:
            if "/" in entry:
                if addr in ipaddress.ip_network(entry, strict=False):
                    return True
            elif addr == ipaddress.ip_address(entry):
                return True
        except ValueError:
            continue
    return False


def _aggregate_points(
    raw: list[tuple[float, float]],
    start_ts: float,
    end_ts: float,
    period_minutes: int,
) -> list[dict[str, str]]:
    """Aggregate raw (timestamp, value) pairs into period-sized buckets.

    Each bucket spans period_minutes and contains the average value of all
    raw points that fall within it. Empty buckets are skipped.
    Returns list of dicts with ISO timestamp midpoint and string value.
    """
    from datetime import datetime, timezone

    period_secs = period_minutes * 60
    bucket_start = start_ts
    result: list[dict[str, str]] = []
    idx = 0
    raw.sort(key=lambda p: p[0])

    while bucket_start < end_ts:
        bucket_end = bucket_start + period_secs
        total = 0.0
        count = 0
        while idx < len(raw) and raw[idx][0] < bucket_end:
            if raw[idx][0] >= bucket_start:
                total += raw[idx][1]
                count += 1
            idx += 1

        if count > 0:
            mid_ts = bucket_start + period_secs / 2
            result.append({
                "t": datetime.fromtimestamp(mid_ts, tz=timezone.utc).isoformat(),
                "s": str(round(total / count, 2)),
            })

        bucket_start = bucket_end

    return result


def _find_entity_access(entity_id: str, token: Token) -> EntityAccess | None:
    """Return the EntityAccess for a real entity_id in a token, or None."""
    for ea in token.entities:
        if ea.entity_id == entity_id:
            return ea
    return None


def _track_flood(count: int, window_start: float) -> tuple[int, float]:
    """Update and return the flood counter, resetting the window if expired."""
    now = time.monotonic()
    if now - window_start >= FLOOD_WINDOW_SECONDS:
        return 1, now
    return count + 1, window_start
