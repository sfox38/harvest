/**
 * Dashboard.tsx - HArvest panel home screen.
 *
 * Stat grid with sparklines, needs-attention section for expiring/paused
 * widgets, activity graph, and recent activity feed.
 */

import { useState, useEffect, useCallback } from "react";
import type { Screen, PanelStats, HourlyBucket, ActivityEvent, Token } from "../types";
import { api } from "../api";
import { Spinner, ErrorBanner, Card, Sparkline, ActivityGraph, StatusBadge, EventRow, fmtBytes, fmtRel } from "./Shared";
import { Icon } from "./Icon";
import buildVersion from "../buildVersion.json";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardProps {
  onOpenWizard: () => void;
  onNavigate: (screen: Screen) => void;
  onNavigateActivity?: (typeFilter?: string) => void;
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatProps {
  label: string;
  value: number | string;
  spark?: number[];
  sparkColor?: string;
  icon?: string;
}

function Stat({ label, value, spark, sparkColor, icon }: StatProps) {
  return (
    <div className="stat">
      <div className="stat-label">
        {icon && <Icon name={icon} size={13} />}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {spark && (
        <div className="stat-spark">
          <Sparkline data={spark} color={sparkColor} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard({ onOpenWizard, onNavigate, onNavigateActivity }: DashboardProps) {
  const [stats,   setStats]   = useState<PanelStats | null>(null);
  const [buckets, setBuckets] = useState<HourlyBucket[]>([]);
  const [events,  setEvents]  = useState<ActivityEvent[]>([]);
  const [tokens,  setTokens]  = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api.stats.get(),
      api.activity.aggregates(24),
      api.activity.list({ limit: 7, offset: 0 }),
      api.tokens.list(),
    ]).then(([s, b, a, t]) => {
      setStats(s);
      setBuckets(b);
      setEvents(a.events);
      setTokens(t);
    }).catch(e => {
      setError(String(e));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 60_000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const needsAttention = tokens.filter(t =>
    t.status === "expiring_soon" || t.status === "inactive"
  );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <Spinner size={40} label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="content-narrow col" style={{ gap: 22 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Stat grid */}
      {stats && (
        <section className="stat-grid" aria-label="Statistics">
          <Stat
            label="Active sessions"
            value={stats.active_sessions}
            spark={buckets.map(b => b.sessions)}
            sparkColor="var(--accent)"
            icon="plug"
          />
          <Stat
            label="Commands today"
            value={stats.commands_today}
            spark={buckets.map(b => b.commands)}
            sparkColor="#2563c2"
            icon="bolt"
          />
          <Stat
            label="Active widgets"
            value={stats.active_tokens}
            icon="grid"
          />
          <Stat
            label="Errors today"
            value={stats.errors_today}
            spark={buckets.map(b => b.auth_failures)}
            sparkColor="#b3261e"
            icon="alert"
          />
        </section>
      )}

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <Card
          title="Needs attention"
          action={
            <span className="muted" style={{ fontSize: 12 }}>
              {needsAttention.length} item{needsAttention.length === 1 ? "" : "s"}
            </span>
          }
        >
          <div className="col" style={{ gap: 10 }}>
            {needsAttention.map(w => (
              <div key={w.token_id} className="row" style={{ justifyContent: "space-between" }}>
                <div className="row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{w.label}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {w.expires ? `Expires ${fmtRel(w.expires)}` : "Inactive"}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <StatusBadge status={w.status} />
                  <button
                    className="btn btn-sm"
                    onClick={() => onNavigate("widgets")}
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity graph + recent activity */}
      <div className="dash-split" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <Card
          title="Activity - last 24 hours"
          action={
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => (onNavigateActivity ? onNavigateActivity() : onNavigate("activity"))}
            >
              View all <Icon name="chevRight" size={12} />
            </button>
          }
        >
          <ActivityGraph buckets={buckets} height={160} />
        </Card>

        <Card
          title="Recent activity"
          pad={false}
          action={
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => (onNavigateActivity ? onNavigateActivity() : onNavigate("activity"))}
            >
              View all <Icon name="chevRight" size={12} />
            </button>
          }
        >
          {events.length === 0 ? (
            <div className="card-body muted" style={{ textAlign: "center", fontSize: 13 }}>
              No recent activity
            </div>
          ) : (
            <div>
              {events.map(ev => (
                <EventRow
                  key={ev.id}
                  ev={ev}
                  onSelectToken={id => { onNavigate("widgets"); }}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      {stats && (
        <div className="row muted" style={{ fontSize: 12, justifyContent: "space-between", padding: "0 4px 18px" }}>
          <span>
            {stats.is_running ? "Running" : "Stopped"} -
            DB {fmtBytes(stats.db_size_bytes)}
          </span>
          <span>build #{buildVersion.build}</span>
        </div>
      )}
    </div>
  );
}
