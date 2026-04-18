/**
 * ActivityLog.tsx - Global activity log screen.
 *
 * Expandable event rows with filtering by date range, event type, and token.
 * CSV export and pagination at 50 events per page.
 */

import { useState, useEffect } from "react";
import type { ActivityPage, Token, ActivityEventType } from "../types";
import { api } from "../api";
import { Spinner, ErrorBanner, EventRow, Card } from "./Shared";
import { Icon } from "./Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = "1h" | "24h" | "7d" | "30d" | "custom";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "1h",     label: "Last 1 hour"   },
  { value: "24h",    label: "Last 24 hours"  },
  { value: "7d",     label: "Last 7 days"   },
  { value: "30d",    label: "Last 30 days"  },
  { value: "custom", label: "Custom range"  },
];

const EVENT_TYPE_OPTIONS: (ActivityEventType | "all")[] = [
  "all", "AUTH_OK", "AUTH_FAIL", "COMMAND", "SESSION_END",
  "TOKEN_CREATED", "TOKEN_REVOKED", "TOKEN_DELETED", "RENEWAL",
  "SUSPICIOUS_ORIGIN", "FLOOD_PROTECTION", "RATE_LIMITED",
];

const PAGE_LIMIT = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sinceForRange(range: DateRange): string | undefined {
  if (range === "custom") return undefined;
  const ms: Record<Exclude<DateRange, "custom">, number> = {
    "1h":  60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d":  7  * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() - ms[range as Exclude<DateRange, "custom">]).toISOString();
}

function normalizeDt(val: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val) ? val + ":00" : val;
}

function isValidDt(val: string): boolean {
  if (!val) return false;
  return !isNaN(new Date(normalizeDt(val)).getTime());
}

// ---------------------------------------------------------------------------
// ActivityLog
// ---------------------------------------------------------------------------

interface ActivityLogProps {
  onSelectToken: (tokenId: string) => void;
  initialTypeFilter?: string;
}

export function ActivityLog({ onSelectToken, initialTypeFilter }: ActivityLogProps) {
  const [page,        setPage]        = useState<ActivityPage | null>(null);
  const [tokens,      setTokens]      = useState<Token[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [exporting,   setExporting]   = useState(false);
  const [offset,      setOffset]      = useState(0);
  const [range,       setRange]       = useState<DateRange>("24h");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [appliedSince, setAppliedSince] = useState("");
  const [appliedUntil, setAppliedUntil] = useState("");
  const [tokenFilter,  setTokenFilter]  = useState<string>("all");
  const [typeFilter,   setTypeFilter]   = useState<ActivityEventType | "all">((initialTypeFilter as ActivityEventType) || "all");
  const [loadTick,     setLoadTick]     = useState(0);

  const sinceOk = isValidDt(customSince);
  const untilOk = !customUntil || isValidDt(customUntil);
  const untilBeforeSince = sinceOk && isValidDt(customUntil)
    && new Date(normalizeDt(customUntil)) <= new Date(normalizeDt(customSince));

  const applyCustomRange = () => {
    if (!sinceOk) { setCustomSince(""); return; }
    if (!untilOk) { setCustomUntil(""); return; }
    if (untilBeforeSince) { setCustomUntil(""); return; }
    setAppliedSince(customSince);
    setAppliedUntil(customUntil);
    setOffset(0);
    setLoadTick(t => t + 1);
  };

  useEffect(() => {
    if (initialTypeFilter !== undefined) {
      setTypeFilter((initialTypeFilter as ActivityEventType) || "all");
      setOffset(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTypeFilter]);

  useEffect(() => {
    api.tokens.list().then(setTokens).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof api.activity.list>[0] = { offset, limit: PAGE_LIMIT };
    if (range === "custom") {
      if (appliedSince) {
        params.since = new Date(normalizeDt(appliedSince)).toISOString();
        if (appliedUntil) params.until = new Date(normalizeDt(appliedUntil)).toISOString();
      }
    } else {
      const s = sinceForRange(range);
      if (s) params.since = s;
    }
    if (tokenFilter !== "all") params.token_id = tokenFilter;
    if (typeFilter  !== "all") params.event_type = typeFilter;
    api.activity.list(params)
      .then(p => setPage(p))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  // loadTick ensures Refresh/Apply force a reload even without other dep changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, range, appliedSince, appliedUntil, tokenFilter, typeFilter, loadTick]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const p: Record<string, string> = {};
      const since = range === "custom" ? appliedSince : sinceForRange(range);
      if (since) p.since = since;
      if (range === "custom" && appliedUntil) p.until = appliedUntil;
      if (tokenFilter !== "all") p.token_id = tokenFilter;
      if (typeFilter  !== "all") p.event_type = typeFilter;
      await api.activity.exportCsv(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE_LIMIT)) : 1;
  const currentPage = Math.floor(offset / PAGE_LIMIT);

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Filter toolbar */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          value={range}
          onChange={e => { setRange(e.target.value as DateRange); setOffset(0); }}
          className="input"
          style={{ fontSize: 13 }}
          aria-label="Date range"
        >
          {DATE_RANGE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {range === "custom" && (
          <>
            <input
              type="datetime-local"
              value={customSince}
              onChange={e => setCustomSince(e.target.value)}
              className="input"
              style={{ fontSize: 13, borderColor: customSince && !sinceOk ? "var(--danger)" : undefined }}
              aria-label="From"
            />
            <input
              type="datetime-local"
              value={customUntil}
              onChange={e => setCustomUntil(e.target.value)}
              className="input"
              style={{ fontSize: 13, borderColor: (untilBeforeSince || (customUntil && !untilOk)) ? "var(--danger)" : undefined }}
              aria-label="To"
            />
            <button
              onClick={applyCustomRange}
              disabled={!sinceOk}
              className="btn btn-sm btn-primary"
            >
              Apply
            </button>
            {untilBeforeSince && (
              <span className="muted" style={{ fontSize: 12, color: "var(--danger)" }}>
                End must be after start.
              </span>
            )}
          </>
        )}

        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value as ActivityEventType | "all"); setOffset(0); }}
          className="input"
          style={{ fontSize: 13 }}
          aria-label="Event type"
        >
          {EVENT_TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>{t === "all" ? "All types" : t}</option>
          ))}
        </select>

        <select
          value={tokenFilter}
          onChange={e => { setTokenFilter(e.target.value); setOffset(0); }}
          className="input"
          style={{ fontSize: 13 }}
          aria-label="Widget"
        >
          <option value="all">All widgets</option>
          {tokens.map(t => (
            <option key={t.token_id} value={t.token_id}>{t.label}</option>
          ))}
        </select>

        <button
          onClick={() => setLoadTick(t => t + 1)}
          className="btn btn-sm btn-ghost"
          title="Refresh"
        >
          <Icon name="refresh" size={14} />
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn btn-sm btn-ghost"
        >
          <Icon name="download" size={14} />
          {exporting ? "Exporting..." : "CSV"}
        </button>
      </div>

      {/* Events */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner size={36} />
        </div>
      ) : !page || page.events.length === 0 ? (
        <Card>
          <div className="muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
            No events found for the selected filters.
          </div>
        </Card>
      ) : (
        <Card pad={false}>
          {page.events.map(ev => (
            <EventRow
              key={ev.id}
              ev={ev}
              onSelectToken={ev.token_id ? onSelectToken : undefined}
            />
          ))}
        </Card>
      )}

      {/* Pagination */}
      {page && page.total > PAGE_LIMIT && (
        <div className="row" style={{ fontSize: 13 }}>
          <span className="muted" style={{ flex: 1 }}>
            {offset + 1}-{Math.min(page.total, offset + PAGE_LIMIT)} of {page.total} events
          </span>
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
            className="btn btn-sm btn-ghost"
          >
            <Icon name="chevLeft" size={13} /> Prev
          </button>
          <span className="muted" style={{ margin: "0 4px" }}>
            {currentPage + 1} / {totalPages}
          </span>
          <button
            disabled={offset + PAGE_LIMIT >= page.total}
            onClick={() => setOffset(offset + PAGE_LIMIT)}
            className="btn btn-sm btn-ghost"
          >
            Next <Icon name="chevRight" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
