/**
 * Dashboard.tsx - HArvest panel home screen.
 *
 * Shows:
 *   - Global stat cards (sessions, tokens, commands, errors, DB size)
 *   - 24-hour activity graph (pure SVG - commands, sessions, auth failures)
 *   - Recent activity feed (last 10 events)
 *   - Quick-action shortcuts (Create Widget, Go to Tokens, Go to Activity)
 */

import { useState, useEffect, useCallback } from "react";
import type { Screen, PanelStats, HourlyBucket, ActivityEvent } from "../types";
import { api } from "../api";
import { Spinner, ErrorBanner } from "./Shared";
import buildVersion from "../buildVersion.json";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardProps {
  onOpenWizard: () => void;
  onNavigate: (screen: Screen) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today ${fmtTime(iso)}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + fmtTime(iso);
}

const EVENT_COLORS: Record<string, string> = {
  AUTH_OK:            "#43a047",
  AUTH_FAIL:          "#e53935",
  COMMAND:            "#1e88e5",
  SESSION_END:        "#757575",
  TOKEN_REVOKED:      "#8e24aa",
  RENEWAL:            "#00897b",
  SUSPICIOUS_ORIGIN:  "#fb8c00",
  FLOOD_PROTECTION:   "#e53935",
  RATE_LIMITED:       "#f4511e",
};

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  accent?: string;
  onClick?: () => void;
}

function StatCard({ title, value, sub, accent = "var(--primary-color,#6200ea)", onClick }: StatCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      style={{
        background: "var(--primary-background-color,#fff)",
        borderRadius: 12,
        padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        cursor: onClick ? "pointer" : "default",
        borderTop: `3px solid ${accent}`,
        minWidth: 140,
        flex: "1 1 140px",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--secondary-text-color,#616161)", marginBottom: 6, fontWeight: 500 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary-text-color,#212121)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--secondary-text-color,#616161)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActivityGraph (pure SVG)
// ---------------------------------------------------------------------------

interface ActivityGraphProps {
  buckets: HourlyBucket[];
}

function ActivityGraph({ buckets }: ActivityGraphProps) {
  const W = 560;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 24, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (buckets.length === 0) {
    return (
      <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-text-color,#616161)", fontSize: 13 }}>
        No data yet
      </div>
    );
  }

  const maxVal = Math.max(1, ...buckets.flatMap(b => [b.commands, b.sessions, b.auth_failures]));

  const xStep = innerW / Math.max(1, buckets.length - 1);

  function polyline(series: number[], color: string) {
    if (buckets.length < 2) return null;
    const pts = series.map((v, i) => {
      const x = PAD.left + i * xStep;
      const y = PAD.top + innerH - (v / maxVal) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return <polyline key={color} points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />;
  }

  // X-axis labels: first and last hour only to avoid crowding
  const xLabels = [0, buckets.length - 1].filter(i => i >= 0 && i < buckets.length).map(i => {
    const b = buckets[i];
    const label = new Date(b.hour).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const x = PAD.left + i * xStep;
    return <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--secondary-text-color,#9e9e9e)">{label}</text>;
  });

  // Y-axis gridlines
  const gridLines = [0, 0.5, 1].map(frac => {
    const y = PAD.top + innerH * (1 - frac);
    const label = Math.round(maxVal * frac);
    return (
      <g key={frac}>
        <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--divider-color,#e0e0e0)" strokeDasharray="3 3" strokeWidth={1} />
        <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize={9} fill="var(--secondary-text-color,#9e9e9e)">{label}</text>
      </g>
    );
  });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }} aria-label="24-hour activity graph">
        {gridLines}
        {polyline(buckets.map(b => b.commands),     "#1e88e5")}
        {polyline(buckets.map(b => b.sessions),      "#43a047")}
        {polyline(buckets.map(b => b.auth_failures), "#e53935")}
        {xLabels}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
        {[
          { color: "#1e88e5", label: "Commands" },
          { color: "#43a047", label: "Sessions" },
          { color: "#e53935", label: "Auth failures" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--secondary-text-color,#616161)" }}>
            <span style={{ width: 16, height: 2, background: color, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>

      {/* Build version - testing aid */}
      <div style={{ textAlign: "right", fontSize: 11, color: "var(--secondary-text-color,#9e9e9e)", paddingTop: 8 }}>
        build #{buildVersion.build}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentActivity
// ---------------------------------------------------------------------------

function eventLabel(ev: ActivityEvent): string {
  switch (ev.type) {
    case "AUTH_OK":           return `Auth OK - ${ev.token_label ?? ev.token_id ?? "unknown"}`;
    case "AUTH_FAIL":         return `Auth failed - ${ev.token_label ?? ev.token_id ?? "unknown"}`;
    case "COMMAND":           return `Command: ${ev.action ?? "?"} on ${ev.entity_id ?? "?"}`;
    case "SESSION_END":       return `Session ended`;
    case "TOKEN_REVOKED":     return `Token revoked - ${ev.token_label ?? ev.token_id ?? "unknown"}`;
    case "RENEWAL":           return `Session renewed`;
    case "SUSPICIOUS_ORIGIN": return `Suspicious origin: ${ev.origin ?? "unknown"}`;
    case "FLOOD_PROTECTION":  return `Flood protection triggered`;
    case "RATE_LIMITED":      return `Rate limited`;
    default:                  return ev.type;
  }
}

interface RecentActivityProps {
  events: ActivityEvent[];
  onViewAll: () => void;
}

function RecentActivity({ events, onViewAll }: RecentActivityProps) {
  if (events.length === 0) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center", color: "var(--secondary-text-color,#616161)", fontSize: 13 }}>
        No recent activity
      </div>
    );
  }
  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {events.map(ev => (
          <li
            key={ev.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
              borderBottom: "1px solid var(--divider-color,#f0f0f0)",
              fontSize: 13,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: EVENT_COLORS[ev.type] ?? "#9e9e9e",
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span style={{ flex: 1, color: "var(--primary-text-color,#212121)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {eventLabel(ev)}
            </span>
            <span style={{ color: "var(--secondary-text-color,#9e9e9e)", fontSize: 11, whiteSpace: "nowrap" }}>
              {fmtDate(ev.timestamp)}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={onViewAll}
        style={{
          marginTop: 12,
          background: "none",
          border: "none",
          color: "var(--primary-color,#6200ea)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          padding: 0,
        }}
      >
        View all activity
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard({ onOpenWizard, onNavigate }: DashboardProps) {
  const [stats,   setStats]   = useState<PanelStats | null>(null);
  const [buckets, setBuckets] = useState<HourlyBucket[]>([]);
  const [events,  setEvents]  = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      api.stats.get(),
      api.activity.aggregates(24),
      api.activity.list({ limit: 10, offset: 0 }),
    ]).then(([s, b, a]) => {
      setStats(s);
      setBuckets(b);
      setEvents(a.events);
    }).catch(e => {
      setError(String(e));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 32 }}>
        <Spinner size={40} label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Stat cards row */}
      {stats && (
        <section aria-label="Statistics">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <StatCard
              title="Active sessions"
              value={stats.active_sessions}
              accent="#1e88e5"
              onClick={() => onNavigate("tokens")}
            />
            <StatCard
              title="Active tokens"
              value={stats.active_tokens}
              accent="#43a047"
              onClick={() => onNavigate("tokens")}
            />
            <StatCard
              title="Commands today"
              value={stats.commands_today}
              accent="#fb8c00"
              onClick={() => onNavigate("activity")}
            />
            <StatCard
              title="Errors today"
              value={stats.errors_today}
              accent={stats.errors_today > 0 ? "#e53935" : "#9e9e9e"}
              onClick={() => onNavigate("activity")}
            />
            <StatCard
              title="Database size"
              value={fmtBytes(stats.db_size_bytes)}
              accent="#8e24aa"
            />
            <StatCard
              title="Status"
              value={stats.is_running ? "Running" : "Stopped"}
              accent={stats.is_running ? "#43a047" : "#e53935"}
            />
          </div>
        </section>
      )}

      {/* 24-hour graph */}
      <section
        aria-label="24-hour activity"
        style={{
          background: "var(--primary-background-color,#fff)",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-text-color,#212121)", marginBottom: 16 }}>
          Activity - last 24 hours
        </h2>
        <ActivityGraph buckets={buckets} />
      </section>

      {/* Recent activity + quick actions */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Recent activity */}
        <section
          aria-label="Recent activity"
          style={{
            flex: "2 1 320px",
            background: "var(--primary-background-color,#fff)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-text-color,#212121)", marginBottom: 12 }}>
            Recent activity
          </h2>
          <RecentActivity events={events} onViewAll={() => onNavigate("activity")} />
        </section>

        {/* Quick actions */}
        <section
          aria-label="Quick actions"
          style={{
            flex: "1 1 200px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-text-color,#212121)" }}>
            Quick actions
          </h2>
          {[
            { label: "Create Widget", onClick: onOpenWizard, primary: true },
            { label: "Manage Tokens", onClick: () => onNavigate("tokens"), primary: false },
            { label: "View Activity",  onClick: () => onNavigate("activity"), primary: false },
            { label: "Settings",       onClick: () => onNavigate("settings"), primary: false },
          ].map(({ label, onClick, primary }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                padding: "12px 16px",
                border: primary ? "none" : "1px solid var(--divider-color,#e0e0e0)",
                borderRadius: 8,
                background: primary ? "var(--primary-color,#6200ea)" : "var(--primary-background-color,#fff)",
                color: primary ? "#fff" : "var(--primary-text-color,#212121)",
                fontSize: 14,
                fontWeight: primary ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {label}
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
