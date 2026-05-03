"""Token lifecycle management for the HArvest integration.

Responsible for all token lifecycle operations: creation, retrieval, validation,
revocation, and deletion. Tokens are stored in HA's storage via
homeassistant.helpers.storage.Store. No direct database access - that is
activity_store.py's responsibility.
"""
from __future__ import annotations

import dataclasses
import hashlib
import hmac
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from ipaddress import AddressValueError, ip_address, ip_network
from typing import TYPE_CHECKING
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import (
    ALIAS_LENGTH,
    ATTRIBUTE_DENYLIST_SUBSTRINGS,
    BASE62_ALPHABET,
    CONF_ABSOLUTE_SESSION_LIFETIME,
    CONF_MAX_ENTITIES_HARD_CAP,
    CONF_MAX_ENTITIES_PER_TOKEN,
    DEFAULTS,
    ERR_ENTITY_NOT_IN_TOKEN,
    ERR_IP_DENIED,
    ERR_ORIGIN_DENIED,
    ERR_SIGNATURE_INVALID,
    ERR_TOKEN_EXPIRED,
    ERR_TOKEN_INACTIVE,
    ERR_TOKEN_INVALID,
    ERR_TOKEN_REVOKED,
    SESSION_PREFIX,
    SESSION_ID_LENGTH,
    TOKEN_ID_LENGTH,
    TOKEN_PREFIX,
)

if TYPE_CHECKING:
    from .session_manager import SessionManager

STORAGE_KEY = "harvest_tokens"
STORAGE_VERSION = 1

# Preview token lifetime in minutes
_PREVIEW_LIFETIME_MINUTES = 5

# Maximum length for allow_paths entries
_ALLOW_PATH_MAX_LEN = 512


@dataclass
class EntityAccess:
    entity_id: str
    capabilities: str                       # "read" or "read-write"
    alias: str | None = None                # 8-char base62 alias; None means entity_id is used directly.
                                            # Generated at entity selection time in the wizard UI (Step 1),
                                            # stored in wizard session state, persisted to the token on Generate.
                                            # Random base62, not derived from entity_id. entity= takes
                                            # priority over alias= on the client; the server stores both.
    exclude_attributes: list[str] = field(default_factory=list)
    companion_of: str | None = None         # entity_id of the primary entity this is a companion of.
                                            # None means this is a primary entity.
    gesture_config: dict = field(default_factory=dict)  # per-gesture action configs
    name_override: str | None = None        # custom display name; None means use HA friendly_name
    icon_override: str | None = None        # custom MDI icon key; None means use auto-detected icon
    color_scheme: str = "auto"              # per-entity: "auto" | "light" | "dark"
    display_hints: dict = field(default_factory=dict)  # domain-specific display overrides


@dataclass
class OriginConfig:
    allow_any: bool = False
    allowed: list[str] = field(default_factory=list)
    allow_paths: list[str] = field(default_factory=list)


@dataclass
class RateLimitConfig:
    max_push_per_second: int = 1
    max_commands_per_minute: int = 30
    override_defaults: bool = False         # False = merge with global DEFAULTS (token values cap global values).
                                            # True = use token values exclusively, ignoring global defaults.
                                            # The token-level values always cap the global defaults when override_defaults
                                            # is False - a token cannot grant more permissive limits than the global config.


@dataclass
class SessionConfig:
    lifetime_minutes: int = 60
    max_lifetime_minutes: int = 1440
    max_renewals: int | None = None         # None = unlimited renewals
    absolute_lifetime_hours: int | None = None  # None = defer to global CONF_ABSOLUTE_SESSION_LIFETIME (72h)


@dataclass
class ActiveScheduleWindow:
    days: list[str]                         # "mon", "tue", etc.
    start: str                              # "HH:MM" 24-hour local time
    end: str                                # "HH:MM" 24-hour local time


@dataclass
class ActiveSchedule:
    timezone: str                           # IANA timezone string
    windows: list[ActiveScheduleWindow]


@dataclass
class Token:
    token_id: str
    token_version: int
    created_at: datetime
    created_by: str                         # HA user ID
    label: str
    expires: datetime | None               # None means never expires
    token_secret: str | None               # None means HMAC disabled.
                                            # When set, the plaintext secret is stored in HA's .storage/
                                            # harvest_tokens file (local filesystem only, included in HA
                                            # backups). The secret is NOT hashed - it must be retrievable
                                            # for HMAC verification. Security claim: the secret is not
                                            # embedded in public HTML, not that it is never stored.
    origins: OriginConfig
    entities: list[EntityAccess]
    rate_limits: RateLimitConfig
    session: SessionConfig
    max_sessions: int | None               # None means unlimited
    active_schedule: ActiveSchedule | None
    allowed_ips: list[str]                 # CIDR notation, empty means all IPs
    status: str                            # "active", "revoked", "expired", "preview"
    revoked_at: datetime | None
    revoke_reason: str | None
    paused: bool = False
    embed_mode: str = "single"             # "single", "group", or "page"
    theme_url: str = ""                    # bundled theme URL or custom theme URL; empty means default
    renderer_pack: str = ""                # "" = none; derived from theme_id when theme has a pack
    lang: str = "auto"                     # BCP 47 language tag or "auto"
    a11y: str = "standard"                 # "standard" or "enhanced"
    color_scheme: str = "auto"             # "auto" | "light" | "dark"
    custom_messages: bool = False           # when False, widget uses global defaults for error/offline
    on_offline: str = "last-state"         # "dim" | "hide" | "message" | "last-state"
    on_error: str = "message"              # "dim" | "hide" | "message"
    offline_text: str = ""
    error_text: str = ""


_VALID_COLOR_SCHEMES = {"auto", "light", "dark"}


def _migrate_display_hints(e: dict) -> dict:
    """Build display_hints from a stored entity dict.

    If display_hints already exists, return it. Otherwise migrate legacy
    top-level graph/hours/period/animate fields into the new dict.
    """
    if "display_hints" in e:
        return dict(e["display_hints"])
    hints: dict = {}
    graph = e.get("graph")
    if graph:
        hints["graph"] = graph
    hours = e.get("hours")
    if hours is not None and hours != 24:
        hints["hours"] = hours
    period = e.get("period")
    if period is not None and period != 10:
        hints["period"] = period
    if e.get("animate"):
        hints["animate"] = True
    return hints


class TokenManager:
    """Manages token persistence and lifecycle. One instance per integration entry."""

    def __init__(self, hass: HomeAssistant, config: dict) -> None:
        self._hass = hass
        self._config = config
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._tokens: dict[str, Token] = {}
        self._preview_tokens: dict[str, Token] = {}

    # ------------------------------------------------------------------
    # ID and alias generation
    # ------------------------------------------------------------------

    def generate_token_id(self) -> str:
        """Generate a unique base62 token ID with hwt_ prefix.

        Uses secrets.choice for cryptographic randomness.
        Checks for collision against existing tokens before returning.
        """
        while True:
            candidate = TOKEN_PREFIX + "".join(
                secrets.choice(BASE62_ALPHABET) for _ in range(TOKEN_ID_LENGTH)
            )
            if candidate not in self._tokens and candidate not in self._preview_tokens:
                return candidate

    def generate_session_id(self) -> str:
        """Generate a unique base62 session ID with hrs_ prefix."""
        return SESSION_PREFIX + "".join(
            secrets.choice(BASE62_ALPHABET) for _ in range(SESSION_ID_LENGTH)
        )

    def generate_alias(self) -> str:
        """Generate a random 8-character base62 alias for an entity.

        Called by the panel HTTP views when an entity is selected in the wizard
        (Step 1). The alias is stored in wizard session state and persisted to
        the token on Generate. Aliases are random base62, not derived from
        entity_id.
        """
        return "".join(secrets.choice(BASE62_ALPHABET) for _ in range(ALIAS_LENGTH))

    # ------------------------------------------------------------------
    # Storage
    # ------------------------------------------------------------------

    async def load(self) -> None:
        """Load all tokens from HA storage into the in-memory cache.

        Called once during integration setup. Marks tokens as expired if
        their expires datetime has passed.
        """
        raw = await self._store.async_load()
        if not raw:
            return
        now = datetime.now(tz=timezone.utc)
        for token_dict in raw.get("tokens", []):
            try:
                token = self._token_from_dict(token_dict)
            except (KeyError, TypeError, ValueError):
                continue
            if (
                token.status == "active"
                and token.expires is not None
                and token.expires < now
            ):
                token.status = "expired"
            self._tokens[token.token_id] = token

    async def save(self) -> None:
        """Persist the current in-memory token cache to HA storage."""
        await self._store.async_save(
            {"tokens": [self._token_to_dict(t) for t in self._tokens.values()]}
        )

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create(
        self,
        label: str,
        created_by: str,
        origins: OriginConfig,
        entities: list[EntityAccess],
        expires: datetime | None,
        token_secret: str | None,
        rate_limits: RateLimitConfig,
        session: SessionConfig,
        max_sessions: int | None,
        active_schedule: ActiveSchedule | None,
        allowed_ips: list[str],
        embed_mode: str = "single",
        theme_url: str = "",
    ) -> Token:
        """Create, persist, and return a new token.

        Validates entity count against hard cap before creating.
        Raises ValueError if entity count exceeds max_entities_hard_cap.
        Validates allow_paths entries (must start with /, no .., no query string or
        fragment, max 512 chars). Query strings in allow_paths entries are rejected
        at save time since they would never match after page_path normalisation.
        Raises ValueError for invalid path entries.
        """
        soft_limit = self._config.get(
            CONF_MAX_ENTITIES_PER_TOKEN, DEFAULTS[CONF_MAX_ENTITIES_PER_TOKEN]
        )
        hard_cap = self._config.get(
            CONF_MAX_ENTITIES_HARD_CAP, DEFAULTS[CONF_MAX_ENTITIES_HARD_CAP]
        )
        if len(entities) > hard_cap:
            raise ValueError(
                f"Entity count {len(entities)} exceeds hard cap {hard_cap}."
            )
        if len(entities) > soft_limit:
            raise ValueError(
                f"Entity count {len(entities)} exceeds the configured limit {soft_limit}."
            )

        self._validate_allow_paths(origins.allow_paths)

        token = Token(
            token_id=self.generate_token_id(),
            token_version=1,
            created_at=datetime.now(tz=timezone.utc),
            created_by=created_by,
            label=label,
            expires=expires,
            token_secret=token_secret,
            origins=origins,
            entities=entities,
            rate_limits=rate_limits,
            session=session,
            max_sessions=max_sessions,
            active_schedule=active_schedule,
            allowed_ips=allowed_ips,
            status="active",
            revoked_at=None,
            revoke_reason=None,
            embed_mode=embed_mode,
            theme_url=theme_url,
        )
        self._tokens[token.token_id] = token
        await self.save()
        return token

    def get(self, token_id: str) -> Token | None:
        """Return a token by ID from the in-memory cache, or None if not found.

        Does not distinguish between not-found and malformed token_id.
        Both return None, mapping to HRV_TOKEN_INVALID at the call site.
        Also checks preview tokens.
        """
        return self._tokens.get(token_id) or self._preview_tokens.get(token_id)

    def get_all(self) -> list[Token]:
        """Return all tokens, including expired and revoked. Excludes preview tokens."""
        return list(self._tokens.values())

    def get_active(self) -> list[Token]:
        """Return only tokens with status 'active' and not past their expiry."""
        now = datetime.now(tz=timezone.utc)
        return [
            t for t in self._tokens.values()
            if t.status == "active"
            and (t.expires is None or t.expires > now)
        ]

    async def create_preview(
        self,
        entity_id: str,
        capabilities: str,
        created_by: str,
    ) -> Token:
        """Create a short-lived preview token for the wizard appearance step.

        Preview tokens have status 'preview', expire after 5 minutes, allow
        any origin (allow_any: True), are read-write or read-only matching the
        capabilities of the token being created, and are scoped to a single entity.

        Preview tokens do NOT appear in the token list returned by get_all() or
        get_active(). They are stored in a separate in-memory dict and are never
        persisted to HA storage. They are cleaned up automatically on expiry via
        a scheduled task. Revoking a preview token removes it immediately.

        Called by the panel HTTP views when the wizard reaches Step 5 or Step 6.
        """
        now = datetime.now(tz=timezone.utc)
        token = Token(
            token_id=self.generate_token_id(),
            token_version=1,
            created_at=now,
            created_by=created_by,
            label="[preview]",
            expires=now + timedelta(minutes=_PREVIEW_LIFETIME_MINUTES),
            token_secret=None,
            origins=OriginConfig(allow_any=True),
            entities=[EntityAccess(entity_id=entity_id, capabilities=capabilities)],
            rate_limits=RateLimitConfig(),
            session=SessionConfig(),
            max_sessions=1,
            active_schedule=None,
            allowed_ips=[],
            status="preview",
            revoked_at=None,
            revoke_reason=None,
        )
        self._preview_tokens[token.token_id] = token
        return token

    async def cleanup_expired_previews(self) -> None:
        """Remove all preview tokens that have passed their 5-minute expiry.

        Called by a scheduled task every 60 seconds. Preview tokens are
        in-memory only so no storage write is needed.
        """
        now = datetime.now(tz=timezone.utc)
        expired_ids = [
            tid for tid, t in self._preview_tokens.items()
            if t.expires is not None and t.expires < now
        ]
        for tid in expired_ids:
            del self._preview_tokens[tid]

    async def revoke(self, token_id: str, reason: str | None = None) -> Token:
        """Mark a token as revoked and persist.

        Sets status to 'revoked', revoked_at to now, revoke_reason to reason.
        Raises KeyError if token_id not found.
        Does not terminate active sessions - caller handles that via SessionManager.
        """
        # Also handle preview token revocation (remove immediately).
        if token_id in self._preview_tokens:
            return self._preview_tokens.pop(token_id)

        token = self._tokens.get(token_id)
        if token is None:
            raise KeyError(f"Token not found: {token_id}")
        token.status = "revoked"
        token.revoked_at = datetime.now(tz=timezone.utc)
        token.revoke_reason = reason
        await self.save()
        return token

    async def delete(self, token_id: str) -> None:
        """Permanently remove a token from storage.

        Only callable on tokens with status 'expired' or 'revoked'.
        Raises ValueError if token is active.
        Raises KeyError if token_id not found.
        """
        token = self._tokens.get(token_id)
        if token is None:
            raise KeyError(f"Token not found: {token_id}")
        if token.status == "active":
            raise ValueError(
                f"Cannot delete an active token ({token_id}). Revoke it first."
            )
        del self._tokens[token_id]
        await self.save()

    async def update(self, token_id: str, updates: dict) -> Token:
        """Apply field updates to an existing token and persist.

        Accepts a dict of field names to new values. Only fields present
        in the dict are updated. Validates updated fields using the same
        rules as create(). Returns the updated Token.
        """
        token = self._tokens.get(token_id)
        if token is None:
            raise KeyError(f"Token not found: {token_id}")

        # Validate allow_paths if origins are being updated.
        if "origins" in updates:
            new_origins: OriginConfig = updates["origins"]
            self._validate_allow_paths(new_origins.allow_paths)

        # Validate entity count if entities are being updated.
        if "entities" in updates:
            soft_limit = self._config.get(
                CONF_MAX_ENTITIES_PER_TOKEN, DEFAULTS[CONF_MAX_ENTITIES_PER_TOKEN]
            )
            hard_cap = self._config.get(
                CONF_MAX_ENTITIES_HARD_CAP, DEFAULTS[CONF_MAX_ENTITIES_HARD_CAP]
            )
            new_entities: list[EntityAccess] = updates["entities"]
            if len(new_entities) > hard_cap:
                raise ValueError(
                    f"Entity count {len(new_entities)} exceeds hard cap {hard_cap}."
                )
            if len(new_entities) > soft_limit:
                raise ValueError(
                    f"Entity count {len(new_entities)} exceeds the configured limit {soft_limit}."
                )

        _UPDATABLE_FIELDS = {
            "label", "origins", "entities", "expires", "token_secret",
            "rate_limits", "session", "max_sessions", "allowed_ips",
            "active_schedule", "paused", "embed_mode", "theme_url",
            "renderer_pack", "lang", "a11y", "color_scheme", "custom_messages",
            "on_offline", "on_error", "offline_text", "error_text",
        }
        for field_name, value in updates.items():
            if field_name in _UPDATABLE_FIELDS:
                setattr(token, field_name, value)

        token.token_version += 1
        await self.save()
        return token

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_auth(
        self,
        token_id: str,
        origin: str,
        page_path: str | None,
        source_ip: str,
        entity_refs: list[str],             # real entity IDs, aliases, or a mix
        timestamp: int | None,
        nonce: str | None,
        signature: str | None,
    ) -> tuple[Token, str | None]:
        """Validate an incoming auth request against a token.

        Returns (token, error_code). If error_code is None, auth succeeded.

        entity_refs contains whatever strings the client sent. Each value is
        either a real entity ID (sent from a card using entity=) or an alias
        (sent from a card using alias=). A page with mixed cards produces a
        mixed list - this is valid. Companion entity references in the auth
        message are included in entity_refs alongside primary entity refs, and
        follow the same entity/alias convention as the card they belong to.

        Resolution for each ref: check alias lookup first (EntityAccess.alias == ref),
        then real entity ID lookup (EntityAccess.entity_id == ref). Unknown refs
        return HRV_ENTITY_NOT_IN_TOKEN.

        page_path is sent by the widget from window.location.pathname. Browsers
        do not send a Referer header on WebSocket upgrades, so the client
        includes the path explicitly.

        Checks in order:
        1. Token exists (HRV_TOKEN_INVALID if not)
        2. Token status is active (HRV_TOKEN_REVOKED or HRV_TOKEN_EXPIRED)
        3. Token not past expires datetime (HRV_TOKEN_EXPIRED)
        4. active_schedule permits current time (HRV_TOKEN_INACTIVE)
        5. source_ip in allowed_ips if set (HRV_IP_DENIED)
        6. Origin in allowed list if allow_any is False (HRV_ORIGIN_DENIED)
        7. page_path matches allow_paths if set and page_path present (HRV_ORIGIN_DENIED)
        8. All entity_refs resolve to known entities (HRV_ENTITY_NOT_IN_TOKEN)
        9. All resolved entities compatible (not Tier 3) (HRV_ENTITY_INCOMPATIBLE)
        10. HMAC signature valid if token_secret set (HRV_SIGNATURE_INVALID)

        Does not check session count - caller checks via SessionManager.
        """
        # 1. Token exists (check both regular and preview tokens).
        token = self._tokens.get(token_id) or self._preview_tokens.get(token_id)
        if token is None:
            return _DUMMY_TOKEN, ERR_TOKEN_INVALID

        # 2. Token status.
        if token.status == "revoked":
            return token, ERR_TOKEN_REVOKED
        if token.status == "expired":
            return token, ERR_TOKEN_EXPIRED

        # 2b. Paused check.
        if token.paused:
            return token, ERR_TOKEN_INACTIVE

        # 3. Expiry datetime.
        now = datetime.now(tz=timezone.utc)
        if token.expires is not None and token.expires < now:
            return token, ERR_TOKEN_EXPIRED

        # 4. Active schedule.
        if not self.is_schedule_active(token):
            return token, ERR_TOKEN_INACTIVE

        # 5. IP allowlist.
        if token.allowed_ips:
            if not self._ip_is_allowed(source_ip, token.allowed_ips):
                return token, ERR_IP_DENIED

        # 6. Origin.
        if not token.origins.allow_any:
            if origin not in token.origins.allowed:
                return token, ERR_ORIGIN_DENIED

            # 7. Page path matching (widget sends window.location.pathname in auth message).
            # Only enforced when allow_any is False - paths are tied to a specific origin.
            if token.origins.allow_paths and page_path:
                normalised = _normalise_page_path(page_path)
                if normalised not in token.origins.allow_paths:
                    return token, ERR_ORIGIN_DENIED

        # 8. Resolve entity refs - skip unresolvable or incompatible refs
        # instead of rejecting the entire auth. Only fail if zero refs resolve.
        from .entity_compatibility import get_support_tier  # local import to avoid circular dep
        valid_count = 0
        for ref in entity_refs:
            resolved = self._resolve_entity_ref(ref, token)
            if resolved is None:
                continue
            domain = resolved.entity_id.split(".")[0]
            if get_support_tier(domain) == 3:
                continue
            valid_count += 1

        if valid_count == 0 and len(entity_refs) > 0:
            return token, ERR_ENTITY_NOT_IN_TOKEN

        # 10. HMAC signature.
        if token.token_secret is not None:
            if timestamp is None or nonce is None or signature is None:
                return token, ERR_SIGNATURE_INVALID
            if not self.verify_hmac(token.token_secret, token_id, timestamp, nonce, signature):
                return token, ERR_SIGNATURE_INVALID

        return token, None

    def is_schedule_active(self, token: Token) -> bool:
        """Return True if the token's active_schedule permits the current time.

        Always returns True if active_schedule is None.
        Uses the schedule's timezone for local time comparison.
        """
        if token.active_schedule is None:
            return True

        try:
            tz = ZoneInfo(token.active_schedule.timezone)
        except ZoneInfoNotFoundError:
            # Unknown timezone - fail safe by denying access.
            return False

        now_local = datetime.now(tz=tz)
        day_abbr = now_local.strftime("%a").lower()  # "mon", "tue", etc.
        current_time = now_local.strftime("%H:%M")

        for window in token.active_schedule.windows:
            if window.start <= window.end:
                # Same-day window (e.g. 09:00-17:00).
                if day_abbr in window.days and window.start <= current_time <= window.end:
                    return True
            else:
                # Midnight-crossing window (e.g. 22:00-06:00).
                # The start day owns the window. Check if we are in the
                # late portion (start..23:59) on the start day, or the
                # early portion (00:00..end) on the following day.
                if day_abbr in window.days and current_time >= window.start:
                    return True
                prev_day = _prev_day_abbr(day_abbr)
                if prev_day in window.days and current_time <= window.end:
                    return True

        return False

    def filter_attributes(
        self,
        entity_id: str,
        token: Token,
        attributes: dict,
    ) -> dict:
        """Filter entity attributes before sending in state_update.

        Applies ATTRIBUTE_DENYLIST_SUBSTRINGS first (key-level substring matching),
        then per-entity exclude_attributes from the token (exact key matching).
        """
        # Find the EntityAccess for this entity_id (match by entity_id only - not alias).
        entity_access: EntityAccess | None = None
        for ea in token.entities:
            if ea.entity_id == entity_id:
                entity_access = ea
                break

        exclude_exact: set[str] = set(entity_access.exclude_attributes) if entity_access else set()

        filtered: dict = {}
        for key, value in attributes.items():
            # Denylist: substring match on key name.
            if any(sub in key for sub in ATTRIBUTE_DENYLIST_SUBSTRINGS):
                continue
            # Per-entity exact exclusions.
            if key in exclude_exact:
                continue
            filtered[key] = value

        return filtered

    def verify_hmac(
        self,
        token_secret: str,
        token_id: str,
        timestamp: int,
        nonce: str,
        signature: str,
    ) -> bool:
        """Verify an HMAC-SHA256 signature.

        Computes HMAC-SHA256 of '{token_id}:{timestamp}:{nonce}' using
        token_secret as the key. The token_secret passed here is the stored
        plaintext secret retrieved from HA's storage. The widget also uses
        the plaintext to sign. Comparison uses hmac.compare_digest to prevent
        timing attacks. Validates that timestamp is within 60 seconds of
        server time to prevent replay attacks.

        Note: the secret is stored as plaintext in HA's local .storage/ file.
        Previous documentation claiming it was stored as a hash was incorrect -
        HMAC verification is impossible without the original secret.
        """
        if not isinstance(timestamp, int):
            return False
        now_ts = int(datetime.now(tz=timezone.utc).timestamp())
        if abs(now_ts - timestamp) > 60:
            return False

        message = f"{token_id}:{timestamp}:{nonce}".encode()
        expected = hmac.new(
            token_secret.encode(), message, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_entity_ref(self, ref: str, token: Token) -> EntityAccess | None:
        """Resolve an entity ref (alias or real entity_id) to an EntityAccess.

        Checks alias lookup first, then real entity_id lookup.
        Returns None if not found.
        """
        for ea in token.entities:
            if ea.alias is not None and ea.alias == ref:
                return ea
        for ea in token.entities:
            if ea.entity_id == ref:
                return ea
        return None

    def _ip_is_allowed(self, source_ip: str, allowed_ips: list[str]) -> bool:
        """Return True if source_ip falls within any of the allowed CIDR ranges."""
        try:
            addr = ip_address(source_ip)
        except AddressValueError:
            return False
        for cidr in allowed_ips:
            try:
                if addr in ip_network(cidr, strict=False):
                    return True
            except ValueError:
                continue
        return False

    def _validate_allow_paths(self, allow_paths: list[str]) -> None:
        """Validate allow_paths entries.

        Each entry must:
        - Start with /
        - Not contain ..
        - Have no query string or fragment
        - Be at most 512 characters

        Raises ValueError on the first invalid entry.
        """
        for path in allow_paths:
            if len(path) > _ALLOW_PATH_MAX_LEN:
                raise ValueError(
                    f"allow_paths entry exceeds {_ALLOW_PATH_MAX_LEN} characters: {path!r}"
                )
            if not path.startswith("/"):
                raise ValueError(
                    f"allow_paths entry must start with /: {path!r}"
                )
            if ".." in path:
                raise ValueError(
                    f"allow_paths entry must not contain '..': {path!r}"
                )
            parsed = urlparse(path)
            if parsed.query or parsed.fragment:
                raise ValueError(
                    f"allow_paths entry must not contain a query string or fragment: {path!r}"
                )

    @staticmethod
    def _migrate_entity_dict(e: dict) -> dict:
        """Strip legacy top-level fields that moved into display_hints."""
        for key in ("graph", "hours", "period", "animate"):
            e.pop(key, None)
        return e

    def _token_to_dict(self, token: Token) -> dict:
        """Serialise a Token to a JSON-compatible dict for HA storage."""
        d = dataclasses.asdict(token)
        # dataclasses.asdict recurses into nested dataclasses producing plain dicts.
        # Datetime fields must be converted to ISO 8601 strings for JSON serialisation.
        d["created_at"] = token.created_at.isoformat()
        d["expires"] = token.expires.isoformat() if token.expires is not None else None
        d["revoked_at"] = token.revoked_at.isoformat() if token.revoked_at is not None else None
        return d

    def _token_from_dict(self, d: dict) -> Token:
        """Deserialise a Token from a JSON-compatible dict loaded from HA storage."""
        entities = [
            EntityAccess(
                entity_id=e["entity_id"],
                capabilities=e["capabilities"],
                alias=e.get("alias"),
                exclude_attributes=e.get("exclude_attributes", []),
                companion_of=e.get("companion_of"),
                gesture_config=e.get("gesture_config", {}),
                name_override=e.get("name_override"),
                color_scheme=e.get("color_scheme", "auto"),
                display_hints=_migrate_display_hints(e),
            )
            for e in d.get("entities", [])
        ]

        origins_raw = d["origins"]
        origins = OriginConfig(
            allow_any=origins_raw.get("allow_any", False),
            allowed=origins_raw.get("allowed", []),
            allow_paths=origins_raw.get("allow_paths", []),
        )

        rl_raw = d["rate_limits"]
        rate_limits = RateLimitConfig(
            max_push_per_second=rl_raw.get("max_push_per_second", 1),
            max_commands_per_minute=rl_raw.get("max_commands_per_minute", 30),
            override_defaults=rl_raw.get("override_defaults", False),
        )

        sess_raw = d["session"]
        session = SessionConfig(
            lifetime_minutes=sess_raw.get("lifetime_minutes", 60),
            max_lifetime_minutes=sess_raw.get("max_lifetime_minutes", 1440),
            max_renewals=sess_raw.get("max_renewals"),
            absolute_lifetime_hours=sess_raw.get("absolute_lifetime_hours"),
        )

        active_schedule: ActiveSchedule | None = None
        if d.get("active_schedule"):
            sched_raw = d["active_schedule"]
            windows = [
                ActiveScheduleWindow(
                    days=w["days"],
                    start=w["start"],
                    end=w["end"],
                )
                for w in sched_raw.get("windows", [])
            ]
            active_schedule = ActiveSchedule(
                timezone=sched_raw["timezone"],
                windows=windows,
            )

        return Token(
            token_id=d["token_id"],
            token_version=d.get("token_version", 1),
            created_at=datetime.fromisoformat(d["created_at"]),
            created_by=d["created_by"],
            label=d["label"],
            expires=datetime.fromisoformat(d["expires"]) if d.get("expires") else None,
            token_secret=d.get("token_secret"),
            origins=origins,
            entities=entities,
            rate_limits=rate_limits,
            session=session,
            max_sessions=d.get("max_sessions"),
            active_schedule=active_schedule,
            allowed_ips=d.get("allowed_ips", []),
            status=d["status"],
            revoked_at=datetime.fromisoformat(d["revoked_at"]) if d.get("revoked_at") else None,
            revoke_reason=d.get("revoke_reason"),
            paused=d.get("paused", False),
            embed_mode=d.get("embed_mode", "single"),
            theme_url=d.get("theme_url", ""),
            renderer_pack=d.get("renderer_pack", ""),
            lang=d.get("lang", "auto"),
            a11y=d.get("a11y", "standard"),
            color_scheme=d.get("color_scheme", "auto"),
            custom_messages=d.get("custom_messages", False),
            on_offline=d.get("on_offline", "last-state"),
            on_error=d.get("on_error", "message"),
            offline_text=d.get("offline_text", ""),
            error_text=d.get("error_text", ""),
        )


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------

_DAY_ORDER = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
_PREV_DAY = {_DAY_ORDER[i]: _DAY_ORDER[i - 1] for i in range(7)}


def _prev_day_abbr(day: str) -> str:
    """Return the previous day abbreviation (e.g. 'tue' -> 'mon', 'mon' -> 'sun')."""
    return _PREV_DAY.get(day, day)


def _normalise_page_path(page_path: str) -> str:
    """Normalise a page path sent by the widget (window.location.pathname).

    Strips any query string or fragment that might have been appended.
    Returns just the path portion.

    Examples:
        /embed/lights?foo=bar  ->  /embed/lights
        /                      ->  /
    """
    try:
        parsed = urlparse(page_path)
        return parsed.path or "/"
    except Exception:
        return "/"


# Sentinel used internally so validate_auth always returns a 2-tuple even when
# the token cannot be found. Callers check error_code first and never use the
# token value when it is not None.
_DUMMY_TOKEN: Token = Token(
    token_id="",
    token_version=0,
    created_at=datetime(1970, 1, 1, tzinfo=timezone.utc),
    created_by="",
    label="",
    expires=None,
    token_secret=None,
    origins=OriginConfig(),
    entities=[],
    rate_limits=RateLimitConfig(),
    session=SessionConfig(),
    max_sessions=None,
    active_schedule=None,
    allowed_ips=[],
    status="",
    revoked_at=None,
    revoke_reason=None,
)
