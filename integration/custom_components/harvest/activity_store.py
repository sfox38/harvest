"""SQLite activity log for the HArvest integration.

Manages the activity log with batched writes, WAL mode, crash recovery, and
scheduled purge. Up to 5 seconds of writes may be lost in a crash - this is
acceptable for an activity log.
"""
from __future__ import annotations

import asyncio
import csv
import io
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import NamedTuple

import aiosqlite
from homeassistant.core import HomeAssistant

from .const import ACTIVITY_DB_FILENAME, CONF_ACTIVITY_RETENTION_DAYS, DEFAULTS

_LOGGER = logging.getLogger(__name__)
DB_SCHEMA_VERSION = 1

# Flush interval in seconds. Up to this many seconds of writes may be lost on crash.
_FLUSH_INTERVAL = 5.0


class AuthEvent(NamedTuple):
    token_id: str
    origin: str
    source_ip: str
    result: str                             # "ok", "failed", "rate_limited"
    error_code: str | None
    timestamp: datetime
    referer: str | None = None


class TokenLifecycleEvent(NamedTuple):
    token_id: str
    display_type: str                       # "TOKEN_REVOKED", "TOKEN_DELETED"
    reason: str | None
    timestamp: datetime


class CommandEvent(NamedTuple):
    session_id: str
    token_id: str
    entity_id: str
    action: str
    success: bool
    timestamp: datetime


class SessionEvent(NamedTuple):
    session_id: str
    token_id: str
    origin: str
    source_ip: str
    event_type: str                         # "connected", "disconnected", "terminated"
    timestamp: datetime
    referer: str | None = None


class ErrorEvent(NamedTuple):
    session_id: str | None
    code: str
    message: str
    timestamp: datetime


class ActivityStore:
    """Async SQLite activity log with batched writes. One instance per entry."""

    def __init__(self, hass: HomeAssistant, config: dict) -> None:
        self._hass = hass
        self._config = config
        self._db_path: Path = Path(hass.config.config_dir) / ACTIVITY_DB_FILENAME
        self._db: aiosqlite.Connection | None = None
        self._write_queue: asyncio.Queue = asyncio.Queue()
        self._flush_task: asyncio.Task | None = None
        self._retention_days: int = config.get(
            CONF_ACTIVITY_RETENTION_DAYS, DEFAULTS[CONF_ACTIVITY_RETENTION_DAYS]
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def open(self) -> None:
        """Open the database, run integrity check, apply schema, start flush loop.

        Enables WAL mode and NORMAL synchronous.
        On integrity_check failure: renames corrupt file to
        harvest_activity.corrupt.{timestamp}.db and creates fresh database.
        """
        db_path = self._db_path

        # If a database file exists, check integrity before opening normally.
        if db_path.exists():
            try:
                async with aiosqlite.connect(db_path) as probe:
                    cursor = await probe.execute("PRAGMA integrity_check")
                    row = await cursor.fetchone()
                    if row is None or row[0] != "ok":
                        raise RuntimeError(f"integrity_check returned: {row}")
            except Exception as exc:
                ts = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%S")
                corrupt_path = db_path.parent / f"harvest_activity.corrupt.{ts}.db"
                _LOGGER.error(
                    "HArvest activity database is corrupt (%s). "
                    "Renaming to %s and starting fresh.",
                    exc,
                    corrupt_path,
                )
                db_path.rename(corrupt_path)

        self._db = await aiosqlite.connect(db_path)
        await self._db.execute("PRAGMA journal_mode=WAL")
        await self._db.execute("PRAGMA synchronous=NORMAL")
        await self._apply_schema()
        await self._db.commit()

        self._flush_task = asyncio.create_task(self._flush_loop())

    async def close(self) -> None:
        """Flush all pending writes and close the database connection."""
        if self._flush_task is not None:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None

        await self._flush()

        if self._db is not None:
            await self._db.close()
            self._db = None

    # ------------------------------------------------------------------
    # Record methods - synchronous and non-blocking
    # ------------------------------------------------------------------

    def record_auth(self, event: AuthEvent) -> None:
        """Enqueue an auth event. Non-blocking."""
        self._write_queue.put_nowait(("auth", event))

    def record_command(self, event: CommandEvent) -> None:
        """Enqueue a command event. Non-blocking."""
        self._write_queue.put_nowait(("command", event))

    def record_session(self, event: SessionEvent) -> None:
        """Enqueue a session event. Non-blocking."""
        self._write_queue.put_nowait(("session", event))

    def record_error(self, event: ErrorEvent) -> None:
        """Enqueue an error event. Non-blocking."""
        self._write_queue.put_nowait(("error", event))

    def record_token_lifecycle(self, event: TokenLifecycleEvent) -> None:
        """Enqueue a token lifecycle event (revoked, deleted). Non-blocking."""
        self._write_queue.put_nowait(("lifecycle", event))

    # ------------------------------------------------------------------
    # Query methods
    # ------------------------------------------------------------------

    async def query_activity(
        self,
        token_id: str | None = None,
        display_type_filter: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        """Query the activity log with optional filters.

        Returns (events, total_count) for pagination support.
        total_count reflects the full matching set regardless of limit/offset.

        Events are returned as dicts matching the ActivityEvent interface:
        id, type, timestamp, token_id, session_id, origin, entity_id, action,
        code, message. Fields absent for a given event type are null.
        """
        if self._db is None:
            return [], 0

        # Determine which tables to include based on the display type filter.
        # Each mapping entry: (include_table, extra_where_clause, extra_params)
        include_auth    = display_type_filter in (None, "AUTH_OK", "AUTH_FAIL", "RATE_LIMITED")
        include_command = display_type_filter in (None, "COMMAND")
        include_session = display_type_filter in (None, "SESSION_END", "RENEWAL")
        # errors table has no token_id column - exclude it when filtering by token.
        include_error   = display_type_filter is None and token_id is None
        include_lifecycle = display_type_filter in (None, "TOKEN_CREATED", "TOKEN_REVOKED", "TOKEN_DELETED")

        # Extra WHERE for fine-grained auth result filtering.
        auth_extra = ""
        if display_type_filter == "AUTH_OK":
            auth_extra = " AND result = 'ok'"
        elif display_type_filter == "AUTH_FAIL":
            auth_extra = " AND result = 'failed'"
        elif display_type_filter == "RATE_LIMITED":
            auth_extra = " AND result = 'rate_limited'"

        # Extra WHERE for session event type filtering.
        session_extra = ""
        if display_type_filter == "SESSION_END":
            session_extra = " AND event_type IN ('disconnected', 'terminated')"
        elif display_type_filter == "RENEWAL":
            session_extra = " AND event_type = 'renewal'"

        # Extra WHERE for lifecycle type filtering.
        lifecycle_extra = ""
        if display_type_filter in ("TOKEN_CREATED", "TOKEN_REVOKED", "TOKEN_DELETED"):
            lifecycle_extra = f" AND display_type = '{display_type_filter}'"

        union_parts: list[str] = []
        params: list = []

        since_ts = since.isoformat() if since else None
        until_ts = until.isoformat() if until else None

        if include_auth:
            clause, p = _build_auth_clause(token_id, since_ts, until_ts)
            union_parts.append(
                "SELECT 'auth' AS raw_type, token_id, origin, source_ip, "
                "NULL AS entity_id, NULL AS action, result, error_code, NULL AS session_id, timestamp, referer "
                f"FROM auth_events{clause}{auth_extra}"
            )
            params.extend(p)

        if include_command:
            clause, p = _build_command_clause(token_id, since_ts, until_ts)
            union_parts.append(
                "SELECT 'command' AS raw_type, token_id, NULL AS origin, NULL AS source_ip, "
                "entity_id, action, NULL AS result, NULL AS error_code, session_id, timestamp, NULL AS referer "
                f"FROM commands{clause}"
            )
            params.extend(p)

        if include_session:
            clause, p = _build_session_clause(token_id, since_ts, until_ts)
            union_parts.append(
                "SELECT 'session' AS raw_type, token_id, origin, source_ip, "
                "NULL AS entity_id, NULL AS action, event_type AS result, "
                "NULL AS error_code, session_id, timestamp, referer "
                f"FROM session_events{clause}{session_extra}"
            )
            params.extend(p)

        if include_error:
            clause, p = _build_error_clause(since_ts, until_ts)
            union_parts.append(
                "SELECT 'error' AS raw_type, NULL AS token_id, NULL AS origin, NULL AS source_ip, "
                "NULL AS entity_id, code AS action, message AS result, "
                "NULL AS error_code, session_id, timestamp, NULL AS referer "
                f"FROM errors{clause}"
            )
            params.extend(p)

        if include_lifecycle:
            clause, p = _build_lifecycle_clause(token_id, since_ts, until_ts)
            union_parts.append(
                "SELECT 'lifecycle' AS raw_type, token_id, NULL AS origin, NULL AS source_ip, "
                "NULL AS entity_id, NULL AS action, display_type AS result, "
                "reason AS error_code, NULL AS session_id, timestamp, NULL AS referer "
                f"FROM token_lifecycle{clause}{lifecycle_extra}"
            )
            params.extend(p)

        if not union_parts:
            return [], 0

        union_sql = " UNION ALL ".join(union_parts)
        count_sql = f"SELECT COUNT(*) FROM ({union_sql})"
        page_sql = (
            f"SELECT * FROM ({union_sql}) "
            f"ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        )

        cursor = await self._db.execute(count_sql, params)
        row = await cursor.fetchone()
        total = row[0] if row else 0

        cursor = await self._db.execute(page_sql, params + [limit, offset])
        rows = await cursor.fetchall()

        events = [
            {
                "id": i,
                "type": _map_display_type(r[0], r[6] or ""),
                "timestamp": r[9],
                "token_id":  r[1] or None,
                "token_label": None,  # no join available; frontend shows token_id
                "session_id": r[8] or None,
                "origin":    r[2] or None,
                "referer":   r[10] or None,
                "entity_id": r[4] or None,
                "action":    r[5] or None,
                "code":      r[7] or None,
                "message":   r[6] if r[0] == "error" else None,
            }
            for i, r in enumerate(rows)
        ]
        return events, total

    async def query_aggregates(
        self,
        hours: int = 24,
        token_id: str | None = None,
    ) -> list:
        """Return hourly aggregate counts for dashboard graphs.

        Returns hourly buckets for the past `hours` hours covering:
        auth_ok_count, auth_fail_count, command_count, and session_connected_count
        (used as a proxy for peak sessions per hour).
        """
        if self._db is None:
            return []

        since = _hours_ago_iso(hours)
        token_filter = "AND token_id = ?" if token_id else ""
        token_params = [token_id] if token_id else []

        # Aggregate auth events by hour.
        auth_sql = (
            "SELECT strftime('%Y-%m-%dT%H:00:00', timestamp) AS hour, "
            "SUM(CASE WHEN result='ok' THEN 1 ELSE 0 END) AS auth_ok, "
            "SUM(CASE WHEN result!='ok' THEN 1 ELSE 0 END) AS auth_fail "
            f"FROM auth_events WHERE timestamp >= ? {token_filter} "
            "GROUP BY hour"
        )
        cursor = await self._db.execute(auth_sql, [since] + token_params)
        auth_rows = {r[0]: (r[1], r[2]) for r in await cursor.fetchall()}

        # Aggregate commands by hour.
        cmd_sql = (
            "SELECT strftime('%Y-%m-%dT%H:00:00', timestamp) AS hour, COUNT(*) "
            f"FROM commands WHERE timestamp >= ? {token_filter} "
            "GROUP BY hour"
        )
        cursor = await self._db.execute(cmd_sql, [since] + token_params)
        cmd_rows = {r[0]: r[1] for r in await cursor.fetchall()}

        # Count connected sessions per hour as peak_sessions proxy.
        sess_sql = (
            "SELECT strftime('%Y-%m-%dT%H:00:00', timestamp) AS hour, COUNT(*) "
            f"FROM session_events WHERE timestamp >= ? AND event_type='connected' {token_filter} "
            "GROUP BY hour"
        )
        cursor = await self._db.execute(sess_sql, [since] + token_params)
        sess_rows = {r[0]: r[1] for r in await cursor.fetchall()}

        # Build all hour buckets in the requested window.
        all_hours = _hour_buckets(hours)
        result = []
        for hour_str in all_hours:
            auth_ok, auth_fail = auth_rows.get(hour_str, (0, 0))
            result.append({
                "hour": hour_str,
                "commands": cmd_rows.get(hour_str, 0),
                "sessions": sess_rows.get(hour_str, 0),
                "auth_failures": auth_fail or 0,
            })

        return result

    async def count_today(self) -> dict[str, int]:
        """Return today's totals for diagnostic sensors.

        Returns: commands, errors, auth_ok, auth_fail counts.
        'Today' is midnight in HA's configured timezone.
        """
        if self._db is None:
            return {"commands": 0, "errors": 0, "auth_ok": 0, "auth_fail": 0}

        import zoneinfo
        try:
            tz = zoneinfo.ZoneInfo(self._hass.config.time_zone)
        except Exception:
            tz = timezone.utc

        now_local = datetime.now(tz=tz)
        midnight_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        midnight_utc = midnight_local.astimezone(timezone.utc).isoformat()

        cursor = await self._db.execute(
            "SELECT COUNT(*) FROM commands WHERE timestamp >= ?", [midnight_utc]
        )
        commands = (await cursor.fetchone())[0]

        cursor = await self._db.execute(
            "SELECT COUNT(*) FROM errors WHERE timestamp >= ?", [midnight_utc]
        )
        errors = (await cursor.fetchone())[0]

        cursor = await self._db.execute(
            "SELECT "
            "SUM(CASE WHEN result='ok' THEN 1 ELSE 0 END), "
            "SUM(CASE WHEN result!='ok' THEN 1 ELSE 0 END) "
            "FROM auth_events WHERE timestamp >= ?",
            [midnight_utc],
        )
        row = await cursor.fetchone()
        auth_ok = row[0] or 0
        auth_fail = row[1] or 0

        return {
            "commands": commands,
            "errors": errors,
            "auth_ok": auth_ok,
            "auth_fail": auth_fail,
        }

    async def purge_old_records(self) -> int:
        """Delete records older than retention_days. Returns count deleted.

        Runs PRAGMA wal_checkpoint(PASSIVE) after purge.
        """
        if self._db is None:
            return 0

        cutoff = _days_ago_iso(self._retention_days)
        total = 0

        for table, col in [
            ("auth_events", "timestamp"),
            ("commands", "timestamp"),
            ("session_events", "timestamp"),
            ("errors", "timestamp"),
            ("token_lifecycle", "timestamp"),
        ]:
            cursor = await self._db.execute(
                f"DELETE FROM {table} WHERE {col} < ?", [cutoff]
            )
            total += cursor.rowcount

        await self._db.commit()
        await self._db.execute("PRAGMA wal_checkpoint(PASSIVE)")
        _LOGGER.debug("HArvest purged %d old activity records.", total)
        return total

    async def get_db_size_bytes(self) -> int:
        """Return the current database file size in bytes."""
        try:
            return self._db_path.stat().st_size
        except OSError:
            return 0

    async def export_csv(
        self,
        token_id: str | None = None,
        display_type_filter: str | None = None,
        since: datetime | None = None,
        until: datetime | None = None,
    ) -> str:
        """Export activity log entries as a CSV string.

        Accepts the same filter parameters as query_activity() but returns
        all matching rows (no pagination limit) formatted as CSV with a
        header row.
        """
        # Use a single query with a large limit to fetch all matching rows.
        events, _ = await self.query_activity(
            token_id=token_id,
            display_type_filter=display_type_filter,
            since=since,
            until=until,
            limit=100_000,
            offset=0,
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "timestamp", "type", "token_id", "session_id",
            "origin", "referer", "entity_id", "action", "code", "message",
        ])
        for e in events:
            writer.writerow([
                e["timestamp"],
                e["type"],
                e["token_id"] or "",
                e["session_id"] or "",
                e["origin"] or "",
                e["referer"] or "",
                e["entity_id"] or "",
                e["action"] or "",
                e["code"] or "",
                e["message"] or "",
            ])
        return output.getvalue()

    # ------------------------------------------------------------------
    # Background flush loop
    # ------------------------------------------------------------------

    async def _flush_loop(self) -> None:
        """Background task flushing the write queue every 5 seconds."""
        while True:
            await asyncio.sleep(_FLUSH_INTERVAL)
            try:
                await self._flush()
            except Exception:
                _LOGGER.exception("HArvest activity flush error.")

    async def _flush(self) -> None:
        """Drain the write queue and commit all pending writes in one transaction."""
        if self._db is None or self._write_queue.empty():
            return

        items: list[tuple[str, NamedTuple]] = []
        while not self._write_queue.empty():
            try:
                items.append(self._write_queue.get_nowait())
            except asyncio.QueueEmpty:
                break

        if not items:
            return

        for event_type, event in items:
            if event_type == "auth":
                e: AuthEvent = event  # type: ignore[assignment]
                await self._db.execute(
                    "INSERT INTO auth_events (token_id, origin, source_ip, result, error_code, timestamp, referer) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [e.token_id, e.origin, e.source_ip, e.result, e.error_code,
                     _ts(e.timestamp), e.referer],
                )
            elif event_type == "command":
                e2: CommandEvent = event  # type: ignore[assignment]
                await self._db.execute(
                    "INSERT INTO commands (session_id, token_id, entity_id, action, success, timestamp) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    [e2.session_id, e2.token_id, e2.entity_id, e2.action,
                     1 if e2.success else 0, _ts(e2.timestamp)],
                )
            elif event_type == "session":
                e3: SessionEvent = event  # type: ignore[assignment]
                await self._db.execute(
                    "INSERT INTO session_events (session_id, token_id, origin, source_ip, event_type, timestamp, referer) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [e3.session_id, e3.token_id, e3.origin, e3.source_ip,
                     e3.event_type, _ts(e3.timestamp), e3.referer],
                )
            elif event_type == "error":
                e4: ErrorEvent = event  # type: ignore[assignment]
                await self._db.execute(
                    "INSERT INTO errors (session_id, code, message, timestamp) VALUES (?, ?, ?, ?)",
                    [e4.session_id, e4.code, e4.message, _ts(e4.timestamp)],
                )
            elif event_type == "lifecycle":
                e5: TokenLifecycleEvent = event  # type: ignore[assignment]
                await self._db.execute(
                    "INSERT INTO token_lifecycle (token_id, display_type, reason, timestamp) "
                    "VALUES (?, ?, ?, ?)",
                    [e5.token_id, e5.display_type, e5.reason, _ts(e5.timestamp)],
                )

        await self._db.commit()

    async def _apply_schema(self) -> None:
        """Create tables and indexes if they do not exist. Idempotent.

        Schema migrations are handled by attempting ALTER TABLE ADD COLUMN for
        new columns. SQLite does not support ADD COLUMN IF NOT EXISTS, so the
        attempt is wrapped in a try/except to silently skip existing columns.
        """
        await self._db.executescript("""
            CREATE TABLE IF NOT EXISTS auth_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_id TEXT NOT NULL,
                origin TEXT NOT NULL,
                source_ip TEXT NOT NULL,
                result TEXT NOT NULL,
                error_code TEXT,
                timestamp TEXT NOT NULL,
                referer TEXT
            );
            CREATE TABLE IF NOT EXISTS commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                token_id TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                success INTEGER NOT NULL,
                timestamp TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS session_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                token_id TEXT NOT NULL,
                origin TEXT NOT NULL,
                source_ip TEXT NOT NULL,
                event_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                referer TEXT
            );
            CREATE TABLE IF NOT EXISTS errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                code TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_auth_token ON auth_events(token_id);
            CREATE INDEX IF NOT EXISTS idx_auth_timestamp ON auth_events(timestamp);
            CREATE INDEX IF NOT EXISTS idx_commands_token ON commands(token_id);
            CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp);
            CREATE INDEX IF NOT EXISTS idx_session_token ON session_events(token_id);
            CREATE TABLE IF NOT EXISTS token_lifecycle (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_id TEXT NOT NULL,
                display_type TEXT NOT NULL,
                reason TEXT,
                timestamp TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_lifecycle_token ON token_lifecycle(token_id);
            CREATE INDEX IF NOT EXISTS idx_lifecycle_timestamp ON token_lifecycle(timestamp);
        """)

        # Migration: add referer column to existing databases (v1 -> v2).
        # SQLite does not support ADD COLUMN IF NOT EXISTS; swallow OperationalError
        # when the column already exists (fresh installs won't hit this).
        for stmt in (
            "ALTER TABLE auth_events ADD COLUMN referer TEXT",
            "ALTER TABLE session_events ADD COLUMN referer TEXT",
        ):
            try:
                await self._db.execute(stmt)
            except Exception:
                pass  # Column already exists on fresh installs or re-runs.


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------

def _ts(dt: datetime) -> str:
    """Return a UTC ISO 8601 string for a datetime, ensuring UTC timezone."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _hours_ago_iso(hours: int) -> str:
    """Return an ISO 8601 UTC string for `hours` ago."""
    from datetime import timedelta
    return (datetime.now(tz=timezone.utc) - timedelta(hours=hours)).isoformat()


def _days_ago_iso(days: int) -> str:
    """Return an ISO 8601 UTC string for `days` ago."""
    from datetime import timedelta
    return (datetime.now(tz=timezone.utc) - timedelta(days=days)).isoformat()


def _hour_buckets(hours: int) -> list[str]:
    """Return a list of ISO 8601 hour strings (truncated to the hour) for the past N hours."""
    from datetime import timedelta
    now = datetime.now(tz=timezone.utc).replace(minute=0, second=0, microsecond=0)
    return [
        (now - timedelta(hours=i)).strftime("%Y-%m-%dT%H:00:00")
        for i in range(hours - 1, -1, -1)
    ]


def _where(conditions: list[str]) -> str:
    """Build a WHERE clause from a list of condition strings."""
    return (" WHERE " + " AND ".join(conditions)) if conditions else ""


def _build_auth_clause(
    token_id: str | None, since: str | None, until: str | None
) -> tuple[str, list]:
    conds, params = [], []
    if token_id:
        conds.append("token_id = ?")
        params.append(token_id)
    if since:
        conds.append("timestamp >= ?")
        params.append(since)
    if until:
        conds.append("timestamp <= ?")
        params.append(until)
    return _where(conds), params


def _build_command_clause(
    token_id: str | None, since: str | None, until: str | None
) -> tuple[str, list]:
    return _build_auth_clause(token_id, since, until)


def _build_session_clause(
    token_id: str | None, since: str | None, until: str | None
) -> tuple[str, list]:
    return _build_auth_clause(token_id, since, until)


def _build_error_clause(since: str | None, until: str | None) -> tuple[str, list]:
    return _build_auth_clause(None, since, until)


def _build_lifecycle_clause(
    token_id: str | None, since: str | None, until: str | None
) -> tuple[str, list]:
    return _build_auth_clause(token_id, since, until)


def _map_display_type(raw_type: str, result: str) -> str:
    """Map internal table type + result value to a display event type for the panel."""
    if raw_type == "auth":
        if result == "ok":
            return "AUTH_OK"
        if result == "rate_limited":
            return "RATE_LIMITED"
        return "AUTH_FAIL"
    if raw_type == "command":
        return "COMMAND"
    if raw_type == "session":
        if result in ("disconnected", "terminated"):
            return "SESSION_END"
        if result == "renewal":
            return "RENEWAL"
        return "AUTH_OK"  # "connected" - session established after successful auth
    if raw_type == "lifecycle":
        return result   # display_type stored directly: TOKEN_REVOKED, TOKEN_DELETED
    if raw_type == "error":
        return "ERROR"
    return raw_type.upper()  # unknown types pass through as-is
