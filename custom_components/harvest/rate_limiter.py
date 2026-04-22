"""Token bucket rate limiter for the HArvest integration.

Handles per-entity push rate, per-session command rate, per-token auth rate,
and per-IP connection rate limiting.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

from .const import (
    CONF_MAX_AUTH_PER_IP,
    CONF_MAX_AUTH_PER_TOKEN,
    CONF_MAX_CONNECTIONS_PER_MINUTE,
    DEFAULTS,
)

# Fixed window duration for auth and IP counters (seconds).
_AUTH_WINDOW_SECONDS = 60.0
_IP_WINDOW_SECONDS = 60.0


@dataclass
class TokenBucket:
    capacity: int
    refill_rate: float                      # tokens per second
    tokens: float = field(init=False)
    last_refill: float = field(init=False)

    def __post_init__(self) -> None:
        self.tokens = float(self.capacity)
        self.last_refill = time.monotonic()

    def consume(self, count: int = 1) -> bool:
        """Attempt to consume count tokens. Returns True if allowed."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        if self.tokens >= count:
            self.tokens -= count
            return True
        return False

    def seconds_until_available(self, count: int = 1) -> int:
        """Return the number of whole seconds until count tokens are available.

        Only meaningful when consume() just returned False. Used by check_command()
        to populate the retry_after_seconds field in the response.
        """
        deficit = count - self.tokens
        if deficit <= 0:
            return 0
        return max(1, int(deficit / self.refill_rate) + 1)


class RateLimiter:
    """Manages all rate limiting for the integration. One instance per entry."""

    def __init__(self, config: dict) -> None:
        self._config = config
        # Keyed by (session_id, entity_id): per-entity push rate bucket.
        self._push_buckets: dict[tuple[str, str], TokenBucket] = {}
        # Keyed by session_id: per-session command rate bucket.
        self._command_buckets: dict[str, TokenBucket] = {}
        # Keyed by token_id: (attempt_count, window_start_monotonic).
        # Only failed auth attempts are counted.
        self._auth_token_counters: dict[str, tuple[int, float]] = {}
        # Keyed by IP string: (attempt_count, window_start_monotonic).
        self._ip_counters: dict[str, tuple[int, float]] = {}

    def check_push(self, session_id: str, entity_id: str, rate: int) -> bool:
        """Check and consume from the push bucket for a session/entity pair.

        Returns True if the push is allowed, False if rate limited.
        Creates a new bucket on first use for this pair.
        The bucket capacity is 1 burst token; refill_rate is `rate` tokens/second.
        """
        key = (session_id, entity_id)
        if key not in self._push_buckets:
            # Capacity of 1 allows an immediate first push; rate controls steady-state.
            self._push_buckets[key] = TokenBucket(capacity=1, refill_rate=float(rate))
        return self._push_buckets[key].consume()

    def check_command(self, session_id: str, max_per_minute: int) -> tuple[bool, int]:
        """Check and consume from the command bucket for a session.

        Returns (allowed, retry_after_seconds).
        retry_after_seconds is 0 when allowed.
        Bucket capacity equals max_per_minute; refill rate is max_per_minute / 60
        tokens per second (smooth refill over a minute window).
        """
        if session_id not in self._command_buckets:
            refill = max_per_minute / 60.0
            self._command_buckets[session_id] = TokenBucket(
                capacity=max_per_minute, refill_rate=refill
            )
        bucket = self._command_buckets[session_id]
        if bucket.consume():
            return True, 0
        return False, bucket.seconds_until_available()

    def check_auth_for_token(self, token_id: str) -> bool:
        """Return True if the token is under its auth attempt limit.

        Uses a fixed 60-second window. The counter is reset when the window expires.
        """
        limit: int = self._config.get(
            CONF_MAX_AUTH_PER_TOKEN, DEFAULTS[CONF_MAX_AUTH_PER_TOKEN]
        )
        now = time.monotonic()
        count, window_start = self._auth_token_counters.get(token_id, (0, now))

        if now - window_start >= _AUTH_WINDOW_SECONDS:
            # Window expired - reset.
            self._auth_token_counters[token_id] = (0, now)
            return True

        return count < limit

    def record_auth_attempt(self, token_id: str) -> None:
        """Record a failed auth attempt for a token.

        Only failed attempts count toward the limit.
        """
        now = time.monotonic()
        count, window_start = self._auth_token_counters.get(token_id, (0, now))

        if now - window_start >= _AUTH_WINDOW_SECONDS:
            # Window expired - start a fresh window with 1 attempt.
            self._auth_token_counters[token_id] = (1, now)
        else:
            self._auth_token_counters[token_id] = (count + 1, window_start)

    def check_ip(self, ip: str) -> bool:
        """Return True if the IP is under its connection attempt limit.

        Called before WebSocket upgrade is accepted.
        Uses a fixed 60-second window against CONF_MAX_CONNECTIONS_PER_MINUTE.
        """
        limit: int = self._config.get(
            CONF_MAX_CONNECTIONS_PER_MINUTE, DEFAULTS[CONF_MAX_CONNECTIONS_PER_MINUTE]
        )
        now = time.monotonic()
        count, window_start = self._ip_counters.get(ip, (0, now))

        if now - window_start >= _IP_WINDOW_SECONDS:
            # Window expired - reset and allow.
            self._ip_counters[ip] = (1, now)
            return True

        if count >= limit:
            return False

        self._ip_counters[ip] = (count + 1, window_start)
        return True

    def cleanup_session(self, session_id: str) -> None:
        """Remove all rate limit buckets for a closed session."""
        self._command_buckets.pop(session_id, None)
        # Remove all push buckets for this session (any entity_id).
        stale = [key for key in self._push_buckets if key[0] == session_id]
        for key in stale:
            del self._push_buckets[key]
