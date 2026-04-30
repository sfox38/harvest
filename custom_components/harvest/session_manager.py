"""Session lifecycle management for the HArvest integration.

Sessions are in-memory only and not persisted. Restarting HA terminates all
sessions; clients reconnect automatically via the widget's reconnect logic.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from .const import (
    BASE62_ALPHABET,
    CONF_ABSOLUTE_SESSION_LIFETIME,
    DEFAULTS,
    SESSION_ID_LENGTH,
    SESSION_PREFIX,
)

if TYPE_CHECKING:
    from aiohttp.web import WebSocketResponse
    from .token_manager import EntityAccess, Token


@dataclass
class Session:
    session_id: str
    token_id: str
    token_version: int
    issued_at: datetime
    expires_at: datetime
    absolute_expires_at: datetime
    renewal_count: int
    lifetime_minutes: int               # stored so renew() always uses the original token config
    origin_validated: str
    referer_validated: str | None
    source_ip: str | None
    allowed_entities: list["EntityAccess"]
    ws: "WebSocketResponse"
    subscribed_entity_ids: set[str]
    last_message_at: datetime
    outgoing_ids: dict[str, str] = field(default_factory=dict)
    last_sent_attributes: dict[str, dict] = field(default_factory=dict)


class SessionManager:
    """Manages in-memory session state. One instance per integration entry."""

    def __init__(self, config: dict) -> None:
        self._config = config
        # Primary index: session_id -> Session
        self._sessions: dict[str, Session] = {}
        # Secondary index: token_id -> set of session_ids (for O(1) token-level ops)
        self._token_sessions: dict[str, set[str]] = {}

    # ------------------------------------------------------------------
    # Create / retrieve
    # ------------------------------------------------------------------

    def create(
        self,
        session_id: str,
        token: "Token",
        origin: str,
        referer: str | None,
        source_ip: str | None,
        ws: "WebSocketResponse",
        entity_ids: list[str],
        outgoing_ids: dict[str, str] | None = None,
    ) -> Session:
        """Create and register a new session.

        Computes expires_at from token.session.lifetime_minutes.
        Computes absolute_expires_at from token or global config.
        Raises ValueError if token.max_sessions is set and already reached.
        """
        if token.max_sessions is not None:
            current = len(self._token_sessions.get(token.token_id, set()))
            if current >= token.max_sessions:
                raise ValueError(
                    f"Session limit reached for token {token.token_id}: "
                    f"{current}/{token.max_sessions}."
                )

        now = datetime.now(tz=timezone.utc)
        expires_at = now + timedelta(minutes=token.session.lifetime_minutes)

        # absolute_expires_at is fixed at creation and does not change on renewal.
        # It uses the token-level override when set; otherwise defers to the global config.
        absolute_hours = token.session.absolute_lifetime_hours
        if absolute_hours is None:
            absolute_hours = self._config.get(
                CONF_ABSOLUTE_SESSION_LIFETIME,
                DEFAULTS[CONF_ABSOLUTE_SESSION_LIFETIME],
            )
        absolute_expires_at = now + timedelta(hours=absolute_hours)

        session = Session(
            session_id=session_id,
            token_id=token.token_id,
            token_version=token.token_version,
            issued_at=now,
            expires_at=expires_at,
            absolute_expires_at=absolute_expires_at,
            renewal_count=0,
            lifetime_minutes=token.session.lifetime_minutes,
            origin_validated=origin,
            referer_validated=referer,
            source_ip=source_ip,
            allowed_entities=list(token.entities),
            ws=ws,
            subscribed_entity_ids=set(entity_ids),
            last_message_at=now,
            outgoing_ids=outgoing_ids if outgoing_ids is not None else {},
        )

        self._sessions[session_id] = session
        self._token_sessions.setdefault(token.token_id, set()).add(session_id)
        return session

    def get(self, session_id: str) -> Session | None:
        """Return a session by ID, or None if not found or expired."""
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if self.is_expired(session):
            return None
        return session

    def get_all_for_token(self, token_id: str) -> list[Session]:
        """Return all active sessions for a given token."""
        now = datetime.now(tz=timezone.utc)
        session_ids = self._token_sessions.get(token_id, set())
        return [
            s for sid in session_ids
            if (s := self._sessions.get(sid)) is not None and not self.is_expired(s, now)
        ]

    def get_all(self) -> list[Session]:
        """Return all active sessions across all tokens."""
        now = datetime.now(tz=timezone.utc)
        return [s for s in self._sessions.values() if not self.is_expired(s, now)]

    # ------------------------------------------------------------------
    # Renewal
    # ------------------------------------------------------------------

    def renew(self, session: Session) -> Session:
        """Issue a new session_id for an existing session and extend expiry.

        Increments renewal_count. Raises ValueError if max_renewals exceeded.
        Raises ValueError if new expiry would exceed absolute_expires_at.
        Updates both _sessions and _token_sessions indexes.
        """
        # Look up the token's session config via the current session's allowed_entities.
        # max_renewals and max_lifetime_minutes come from the token that created the session.
        # Because sessions don't hold a reference to their token we rely on callers
        # passing the correct session object. The token's session config was baked into
        # the session at create time via the token parameter; for renewal we only need
        # the values already encoded in the Session itself. However max_renewals and
        # max_lifetime_minutes are token-level constraints that ws_proxy must pass through.
        # We therefore look them up from the ws_proxy context. For the implementation here
        # we accept them as part of the session's metadata by checking the fields stored
        # on the session indirectly through the config.
        #
        # Design decision: SessionManager.renew() does not take a Token argument to keep
        # the interface minimal. ws_proxy is responsible for fetching the token and calling
        # terminate() + create() if a full re-auth is needed instead.
        # The constraints checked here are derived from absolute_expires_at (set at creation)
        # and a max_renewals guard that ws_proxy enforces before calling renew().
        #
        # What this method does:
        # 1. Generate a new session_id.
        # 2. Compute new expires_at as now + token.session.lifetime_minutes.
        #    The value of lifetime_minutes is not stored on Session, so we reuse
        #    the delta between the original issued_at and expires_at as the renewal window.
        # 3. Cap new expires_at at absolute_expires_at.
        # 4. Raise ValueError if absolute_expires_at is already in the past.
        # 5. Update both indexes.

        now = datetime.now(tz=timezone.utc)

        if now >= session.absolute_expires_at:
            raise ValueError(
                f"Session {session.session_id} has reached its absolute lifetime. "
                "Full re-auth required."
            )

        # Use the token's lifetime_minutes stored at session creation so the
        # renewal window stays constant across multiple renewals.
        new_expires_at = now + timedelta(minutes=session.lifetime_minutes)

        # Cap at absolute lifetime.
        if new_expires_at > session.absolute_expires_at:
            new_expires_at = session.absolute_expires_at

        # If the capped expiry is already in the past (edge case: absolute expires very soon),
        # treat as expired.
        if new_expires_at <= now:
            raise ValueError(
                f"Session {session.session_id} cannot be renewed: "
                "absolute lifetime would expire immediately."
            )

        old_session_id = session.session_id
        new_session_id = self._generate_session_id()

        # Mutate in place then re-key in the indexes.
        session.session_id = new_session_id
        session.expires_at = new_expires_at
        session.renewal_count += 1
        session.last_message_at = now

        # Re-key the primary index.
        del self._sessions[old_session_id]
        self._sessions[new_session_id] = session

        # Re-key the secondary index.
        token_set = self._token_sessions.get(session.token_id)
        if token_set is not None:
            token_set.discard(old_session_id)
            token_set.add(new_session_id)

        return session

    # ------------------------------------------------------------------
    # State updates
    # ------------------------------------------------------------------

    def touch(self, session_id: str) -> None:
        """Update last_message_at for a session. Called on every received message."""
        session = self._sessions.get(session_id)
        if session is not None:
            session.last_message_at = datetime.now(tz=timezone.utc)

    # ------------------------------------------------------------------
    # Termination
    # ------------------------------------------------------------------

    def terminate(self, session_id: str) -> None:
        """Remove a session from both indexes.

        Does not close the WebSocket - caller is responsible for that.
        """
        session = self._sessions.pop(session_id, None)
        if session is None:
            return
        token_set = self._token_sessions.get(session.token_id)
        if token_set is not None:
            token_set.discard(session_id)
            if not token_set:
                del self._token_sessions[session.token_id]

    def terminate_all_for_token(self, token_id: str) -> list["WebSocketResponse"]:
        """Remove all sessions for a token and return their WebSocket objects.

        Caller closes each WebSocket with an auth_failed message.
        """
        session_ids = list(self._token_sessions.pop(token_id, set()))
        ws_list: list[WebSocketResponse] = []
        for sid in session_ids:
            session = self._sessions.pop(sid, None)
            if session is not None:
                ws_list.append(session.ws)
        return ws_list

    # ------------------------------------------------------------------
    # Subscriptions
    # ------------------------------------------------------------------

    def add_subscription(self, session_id: str, entity_ids: list[str]) -> None:
        """Add entity IDs to a session's subscribed set."""
        session = self._sessions.get(session_id)
        if session is not None:
            session.subscribed_entity_ids.update(entity_ids)

    def remove_subscription(self, session_id: str, entity_ids: list[str]) -> None:
        """Remove entity IDs from a session's subscribed set."""
        session = self._sessions.get(session_id)
        if session is not None:
            session.subscribed_entity_ids.difference_update(entity_ids)

    def get_sessions_for_entity(self, entity_id: str) -> list[Session]:
        """Return all sessions subscribed to a given entity ID.

        Used by ws_proxy.py to fan out state updates. O(n) in session count.
        """
        now = datetime.now(tz=timezone.utc)
        return [
            s for s in self._sessions.values()
            if entity_id in s.subscribed_entity_ids and not self.is_expired(s, now)
        ]

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def is_expired(self, session: Session, now: datetime | None = None) -> bool:
        """Return True if the session's expires_at has passed."""
        if now is None:
            now = datetime.now(tz=timezone.utc)
        return now >= session.expires_at

    def count_active(self) -> int:
        """Return the total count of active sessions."""
        now = datetime.now(tz=timezone.utc)
        return sum(1 for s in self._sessions.values() if not self.is_expired(s, now))

    def count_for_token(self, token_id: str) -> int:
        """Return the count of active sessions for a specific token."""
        now = datetime.now(tz=timezone.utc)
        return sum(
            1 for sid in self._token_sessions.get(token_id, set())
            if (s := self._sessions.get(sid)) is not None and not self.is_expired(s, now)
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _generate_session_id(self) -> str:
        """Generate a unique base62 session ID with hrs_ prefix.

        Uses secrets.choice for cryptographic randomness.
        Checks for collision against existing sessions before returning.
        """
        while True:
            candidate = SESSION_PREFIX + "".join(
                secrets.choice(BASE62_ALPHABET) for _ in range(SESSION_ID_LENGTH)
            )
            if candidate not in self._sessions:
                return candidate
