/**
 * ActivityLog.tsx - Global activity log screen.
 *
 * 24-hour activity chart at the top, segmented type filter, time range select,
 * and expandable event rows. CSV export button.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ActivityPage, ActivityEventType, HourlyBucket } from "../types";
import { api } from "../api";
import { Spinner, ErrorBanner, EventRow, Card, ActivityGraph } from "./Shared";
import { Icon } from "./Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TypeTab = "all" | "commands" | "auth_ok" | "auth_fail" | "suspicious";

const TYPE_TABS: { value: TypeTab; label: string; types: ActivityEventType[]; filterParam?: string }[] = [
  { value: "all",        label: "All",        types: [] },
  { value: "commands",   label: "Commands",   types: ["COMMAND"] },
  { value: "auth_ok",    label: "Auth OK",    types: ["AUTH_OK"] },
  { value: "auth_fail",  label: "Auth fail",  types: ["AUTH_FAIL"] },
  { value: "suspicious", label: "Suspicious", types: ["SUSPICIOUS_ORIGIN", "FLOOD_PROTECTION", "RATE_LIMITED"], filterParam: "SUSPICIOUS" },
];

type TimeRange = "5m" | "1h" | "6h" | "1d" | "1w" | "1mo" | "all";

const TIME_RANGES: { value: TimeRange; label: string; hours: number; sinceMs: number | null }[] = [
  { value: "5m",  label: "5 minutes", hours: 1,    sinceMs: 5 * 60 * 1000 },
  { value: "1h",  label: "1 hour",    hours: 1,    sinceMs: 60 * 60 * 1000 },
  { value: "6h",  label: "6 hours",   hours: 6,    sinceMs: 6 * 60 * 60 * 1000 },
  { value: "1d",  label: "1 day",     hours: 24,   sinceMs: 24 * 60 * 60 * 1000 },
  { value: "1w",  label: "1 week",    hours: 168,  sinceMs: 7 * 24 * 60 * 60 * 1000 },
  { value: "1mo", label: "1 month",   hours: 720,  sinceMs: 30 * 24 * 60 * 60 * 1000 },
  { value: "all", label: "All time",  hours: 8760, sinceMs: null },
];

const PAGE_LIMIT = 50;

// ---------------------------------------------------------------------------
// ActivityLog
// ---------------------------------------------------------------------------

interface ActivityLogProps {
  onSelectToken: (tokenId: string) => void;
  initialTypeFilter?: string;
}

export function ActivityLog({ onSelectToken, initialTypeFilter }: ActivityLogProps) {
  const [page,      setPage]      = useState<ActivityPage | null>(null);
  const [buckets,   setBuckets]   = useState<HourlyBucket[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [offset,    setOffset]    = useState(0);
  const [tab,       setTab]       = useState<TypeTab>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("1d");
  const [loadTick,  setLoadTick]  = useState(0);
  const [search,    setSearch]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setOffset(0);
    }, 300);
  };

  const activeTab  = TYPE_TABS.find(t => t.value === tab) ?? TYPE_TABS[0];
  const activeTime = TIME_RANGES.find(t => t.value === timeRange) ?? TIME_RANGES[3];

  const sinceIso = activeTime.sinceMs !== null
    ? new Date(Date.now() - activeTime.sinceMs).toISOString()
    : undefined;

  // Map initialTypeFilter to a tab
  useEffect(() => {
    if (!initialTypeFilter) return;
    const match = TYPE_TABS.find(t => t.types.includes(initialTypeFilter as ActivityEventType));
    if (match) { setTab(match.value); setOffset(0); }
  }, [initialTypeFilter]);

  // Fetch aggregates for the chart
  useEffect(() => {
    let cancelled = false;
    setBuckets([]);
    api.activity.aggregates(activeTime.hours)
      .then(b => { if (!cancelled) setBuckets(b); })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, loadTick]);

  // Fetch events
  useEffect(() => {
    let cancelled = false;
    setPage(null);
    setLoading(true);
    setError(null);
    const params: Parameters<typeof api.activity.list>[0] = { offset, limit: PAGE_LIMIT };
    if (sinceIso) params.since = sinceIso;
    if (activeTab.filterParam) {
      params.event_type = activeTab.filterParam as ActivityEventType;
    } else if (activeTab.types.length === 1) {
      params.event_type = activeTab.types[0];
    }
    const trimmed = debouncedSearch.trim();
    if (trimmed) params.search = trimmed;
    api.activity.list(params)
      .then(p => { if (!cancelled) setPage(p); })
      .catch(e => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, tab, timeRange, loadTick, debouncedSearch]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const p: Record<string, string> = {};
      if (sinceIso) p.since = sinceIso;
      if (activeTab.filterParam) {
        p.event_type = activeTab.filterParam;
      } else if (activeTab.types.length === 1) {
        p.event_type = activeTab.types[0];
      }
      const trimmed = debouncedSearch.trim();
      if (trimmed) p.search = trimmed;
      await api.activity.exportCsv(p);
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(false);
    }
  }, [activeTab, sinceIso, debouncedSearch]);

  const chartTitle = timeRange === "all"
    ? "Activity - all time"
    : `Activity - last ${activeTime.label}`;

  const hasChartData = buckets.length >= 2 &&
    buckets.some(b => b.commands > 0 || b.sessions > 0 || b.auth_failures > 0);

  const totalPages = page ? Math.max(1, Math.ceil(page.total / PAGE_LIMIT)) : 1;
  const currentPage = Math.floor(offset / PAGE_LIMIT);

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Activity chart */}
      <Card>
        <div className="card-header">
          <h3>{chartTitle}</h3>
        </div>
        <div className="card-body">
          {hasChartData ? (
            <ActivityGraph buckets={buckets} height={140} />
          ) : (
            <div className="muted" style={{ textAlign: "center", padding: "18px 0", fontSize: 13 }}>
              No activity data for this period.
            </div>
          )}
        </div>
      </Card>

      {/* Filter bar */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="search" style={{ flex: "0 1 220px", minWidth: 140 }}>
          <Icon name="search" size={15} />
          <input
            className="input"
            type="search"
            placeholder="Search entity, token, origin..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            aria-label="Search activity events"
          />
        </div>
        <div className="segmented" role="group" aria-label="Filter by event type">
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              aria-pressed={tab === t.value}
              onClick={() => { setTab(t.value); setOffset(0); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={timeRange}
          onChange={e => { setTimeRange(e.target.value as TimeRange); setOffset(0); }}
          className="input"
          style={{ fontSize: 13, padding: "4px 8px", width: 120, flexShrink: 0 }}
          aria-label="Time range"
        >
          {TIME_RANGES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setLoadTick(n => n + 1)}
          className="icon-btn"
          aria-label="Refresh"
          title="Refresh"
        >
          <Icon name="refresh" size={14} />
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn"
        >
          <Icon name="download" size={14} />
          {exporting ? "Exporting..." : "Export CSV"}
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
            {debouncedSearch.trim() ? "No events match your search." : "No activity data for this period."}
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
      {hasChartData && page && page.total > PAGE_LIMIT && (
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
