/**
 * Shared.tsx - Reusable UI primitives for the HArvest panel.
 *
 * Exports: StatusBadge, Hint, Badge, Card, CopyButton, CopyablePre,
 *          ConfirmDialog, Spinner, EmptyState, ErrorBanner,
 *          Sparkline, ActivityGraph, EventRow, fmtRel, fmtBytes
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { TokenStatus, ActivityEvent, HAEntity, ThemeDefinition } from "../types";
import { Icon } from "./Icon";
import { api } from "../api";
import { getEntityCache, loadEntityCache } from "../entityCache";

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<TokenStatus, { kind: string; label: string }> = {
  active:        { kind: "ok",      label: "Active"        },
  expiring_soon: { kind: "warn",    label: "Expiring soon" },
  inactive:      { kind: "neutral", label: "Inactive"      },
  expired:       { kind: "neutral", label: "Ended"         },
  revoked:       { kind: "danger",  label: "Revoked"       },
};

interface StatusBadgeProps {
  status: TokenStatus;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { kind, label: defaultLabel } = STATUS_BADGE[status] ?? { kind: "neutral", label: status };
  return (
    <span className={`badge badge-${kind}`}>
      <span className="dot" aria-hidden="true" />
      {label ?? defaultLabel}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Badge (generic)
// ---------------------------------------------------------------------------

interface BadgeProps {
  kind?: "ok" | "warn" | "danger" | "neutral" | "info";
  children: React.ReactNode;
}

export function Badge({ kind = "neutral", children }: BadgeProps) {
  return (
    <span className={`badge badge-${kind}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hint (contextual tooltip)
// ---------------------------------------------------------------------------

export function Hint({ text }: { text: string }) {
  return <span className="hint-icon" data-hint={text} tabIndex={0} role="note" aria-label={text}>?</span>;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  pad?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, action, pad = true, children, className }: CardProps) {
  return (
    <div className={`card${className ? ` ${className}` : ""}`}>
      {title && (
        <div className="card-header">
          <h3>{title}</h3>
          <div className="spacer" />
          {action}
        </div>
      )}
      <div className={pad ? "card-body" : ""}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md";
}

export function CopyButton({ text, label = "Copy", size = "md" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    const markCopied = () => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    };

    // execCommand fallback for non-secure (HTTP) contexts where clipboard API is unavailable.
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
      markCopied();
    };

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(markCopied).catch(fallback);
    } else {
      fallback();
    }
  }, [text]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      <button
        onClick={handleCopy}
        className={`copy-btn${size === "sm" ? " copy-btn-sm" : ""}${copied ? " copied" : ""}`}
        aria-label={copied ? "Copied to clipboard" : `Copy ${label}`}
      >
        {copied ? "Copied!" : label}
      </button>
      <span aria-live="polite" className="sr-only">{copied ? "Copied to clipboard" : ""}</span>
    </>
  );
}

// ---------------------------------------------------------------------------
// CopyablePre
// ---------------------------------------------------------------------------

interface CopyablePreProps {
  text: string;
  label?: string;
}

export function CopyablePre({ text, label = "Copy" }: CopyablePreProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doCopy = useCallback(() => {
    const markCopied = () => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
      markCopied();
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(markCopied).catch(fallback);
    } else {
      fallback();
    }
  }, [text]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="code-wrap">
      <pre className="code" onClick={doCopy} title="Click to copy">{text}</pre>
      <button
        onClick={doCopy}
        className={`copy-btn${copied ? " copied" : ""}`}
        aria-label={copied ? "Copied to clipboard" : `Copy ${label}`}
      >
        {copied ? "Copied!" : label}
      </button>
      <span aria-live="polite" className="sr-only">{copied ? "Copied to clipboard" : ""}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmDialog
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  confirmDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const sel = 'button:not([disabled]), input:not([disabled])';
    el.querySelector<HTMLElement>(sel)?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onCancelRef.current(); return; }
      if (e.key !== "Tab") return;
      const els = Array.from(el.querySelectorAll<HTMLElement>(sel));
      if (els.length === 0) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  return (
    <div className="overlay" onClick={onCancel} role="presentation">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        className="dialog"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="dialog-title">{title}</h3>
        <p id="confirm-msg" className="dialog-body">{message}</p>
        <div className="dialog-actions">
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
          <button
            onClick={onConfirm}
            className={`btn ${confirmDestructive ? "btn-danger" : "btn-primary"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

interface SpinnerProps {
  size?: number;
  label?: string;
}

export function Spinner({ size = 32, label = "Loading..." }: SpinnerProps) {
  const r = size * 0.38;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={label}
      role="status"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); transform-origin: ${cx}px ${cx}px; } }`}</style>
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="var(--divider)"
        strokeWidth={size * 0.08}
      />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={size * 0.08}
        strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = "grid", title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <Icon name={icon} size={44} />
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary" style={{ marginTop: 8 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorBanner
// ---------------------------------------------------------------------------

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  if (!onDismiss) {
    return (
      <div role="alert" className="error-banner">
        <span style={{ flex: 1 }}>{message}</span>
        {onRetry && <button className="btn btn-sm" onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Error" onClick={onDismiss}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div role="alert" style={{ fontSize: 14, lineHeight: 1.5 }}>{message}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {onRetry && <button className="btn btn-sm btn-primary" onClick={() => { onDismiss(); onRetry(); }}>Retry</button>}
            <button className="btn btn-sm" onClick={onDismiss} autoFocus>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

interface SparklineProps {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
}

export function Sparkline({ data, color = "var(--accent)", w = 160, h = 28 }: SparklineProps) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const stepX = w / (data.length - 1 || 1);
  const pts = data.map((v, i) => [i * stepX, h - (v / max) * h * 0.85 - 2]);
  const d = "M " + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");
  const dFill = d + ` L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <path d={dFill} style={{ fill: color }} opacity="0.14" />
      <path d={d} fill="none" style={{ stroke: color }} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ActivityGraph (24h multi-line)
// ---------------------------------------------------------------------------

interface ActivityGraphProps {
  buckets: { hour: string; commands: number; sessions: number; auth_failures: number }[];
  height?: number;
}

export function ActivityGraph({ buckets, height = 180 }: ActivityGraphProps) {
  if (buckets.length < 2) return null;
  const total = buckets.reduce((s, b) => s + b.commands + b.sessions + b.auth_failures, 0);
  if (total === 0) return null;
  const W = 800;
  const H = height;
  const PAD = { top: 12, right: 12, bottom: 24, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...buckets.flatMap(b => [b.commands, b.sessions, b.auth_failures]));
  const xStep = innerW / Math.max(1, buckets.length - 1);

  const makeLine = (series: number[], color: string, filled = true) => {
    const pts = series.map((v, i) => {
      const x = PAD.left + i * xStep;
      const y = PAD.top + innerH - (v / max) * innerH;
      return [x, y];
    });
    const d = "M " + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L ");
    const dFill = d + ` L ${PAD.left + innerW},${PAD.top + innerH} L ${PAD.left},${PAD.top + innerH} Z`;
    return (
      <g key={color}>
        {filled && <path d={dFill} style={{ fill: color }} opacity="0.08" />}
        <path d={d} fill="none" style={{ stroke: color }} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </g>
    );
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = PAD.top + innerH * (1 - f);
    return (
      <g key={f}>
        <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--divider)" strokeDasharray="3 4" />
        <text x={PAD.left - 6} y={y + 3} fontSize="10" textAnchor="end" fill="var(--ink-4)">
          {Math.round(max * f)}
        </text>
      </g>
    );
  });

  const xLabels = [0, 6, 12, 18, 23].filter(i => i < buckets.length).map(i => {
    const x = PAD.left + i * xStep;
    const lbl = new Date(buckets[i].hour).toLocaleTimeString(undefined, { hour: "numeric" });
    return (
      <text key={i} x={x} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--ink-4)">{lbl}</text>
    );
  });

  return (
    <div className="graph-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }} aria-hidden="true">
        {gridLines}
        {makeLine(buckets.map(b => b.commands),     "var(--info)")}
        {makeLine(buckets.map(b => b.sessions),      "var(--accent)")}
        {makeLine(buckets.map(b => b.auth_failures), "var(--danger)", false)}
        {xLabels}
      </svg>
      <div className="graph-legend">
        <span><i style={{ background: "var(--info)" }} /> Commands</span>
        <span><i style={{ background: "var(--accent)" }} /> Sessions</span>
        <span><i style={{ background: "var(--danger)" }} /> Auth failures</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventRow (expandable)
// ---------------------------------------------------------------------------

const EVENT_STYLE: Record<string, { icon: string; cls: string }> = {
  AUTH_OK:           { icon: "shieldCheck", cls: "ev-ok"      },
  AUTH_FAIL:         { icon: "shield",      cls: "ev-danger"  },
  COMMAND:           { icon: "bolt",        cls: "ev-info"    },
  SESSION_END:       { icon: "clock",       cls: "ev-neutral" },
  TOKEN_CREATED:     { icon: "plus",        cls: "ev-ok"      },
  TOKEN_REVOKED:     { icon: "alert",       cls: "ev-warn"    },
  TOKEN_DELETED:     { icon: "trash",       cls: "ev-danger"  },
  RENEWAL:           { icon: "refresh",     cls: "ev-ok"      },
  SUSPICIOUS_ORIGIN: { icon: "alert",       cls: "ev-warn"    },
  FLOOD_PROTECTION:  { icon: "waves",       cls: "ev-danger"  },
  RATE_LIMITED:      { icon: "alert",       cls: "ev-warn"    },
};

interface EventRowProps {
  ev: ActivityEvent;
  onSelectToken?: (tokenId: string) => void;
}

export function EventRow({ ev, onSelectToken }: EventRowProps) {
  const [open, setOpen] = useState(false);
  const st = EVENT_STYLE[ev.type] ?? { icon: "info", cls: "ev-neutral" };

  const toggle = () => setOpen(o => !o);

  const widgetLink = (ev.token_label && ev.token_id && onSelectToken)
    ? (
      <a
        href="#"
        className="widget-link"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onSelectToken(ev.token_id!); }}
      >
        {ev.token_label}
      </a>
    )
    : (ev.token_label ? <span>{ev.token_label}</span> : null);

  let title: React.ReactNode = ev.type;
  let sub: React.ReactNode = null;
  switch (ev.type) {
    case "AUTH_OK":
      title = "Auth OK";
      sub = <>{widgetLink}{ev.origin ? ` - ${ev.origin}` : ""}</>;
      break;
    case "AUTH_FAIL":
      title = "Auth Fail";
      sub = <>{widgetLink}{ev.origin ? ` from ${ev.origin}` : ""}{ev.code ? ` - ${ev.code}` : ""}</>;
      break;
    case "COMMAND":
      title = <><span className="mono">{ev.action}</span> on <span className="mono">{ev.entity_id}</span></>;
      sub = <>{widgetLink}{ev.origin ? ` - ${ev.origin}` : ""}</>;
      break;
    case "SESSION_END":
      title = "Session ended";
      sub = <>{widgetLink}{ev.origin ? ` - ${ev.origin}` : ""}</>;
      break;
    case "RENEWAL":
      title = "Session renewed";
      sub = widgetLink;
      break;
    case "TOKEN_CREATED":
      title = "Widget created";
      sub = widgetLink;
      break;
    case "TOKEN_REVOKED":
      title = "Widget revoked";
      sub = widgetLink;
      break;
    case "TOKEN_DELETED":
      title = "Widget deleted";
      sub = widgetLink;
      break;
    case "SUSPICIOUS_ORIGIN":
      title = "Suspicious origin blocked";
      sub = ev.origin ? <span className="mono">{ev.origin}</span> : null;
      break;
    case "FLOOD_PROTECTION":
      title = "Flood protection triggered";
      sub = widgetLink;
      break;
    case "RATE_LIMITED":
      title = "Rate limited";
      sub = <>{widgetLink}{ev.origin ? ` - ${ev.origin}` : ""}</>;
      break;
  }

  return (
    <div
      className={`event-row expandable${open ? " open" : ""}`}
      onClick={toggle}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
    >
      <div className="event-row-top">
        <div className={`event-icon ${st.cls}`}>
          <Icon name={st.icon} size={12} />
        </div>
        <div className="event-main">
          <div className="event-title">{title}</div>
          {sub && <div className="event-sub">{sub}</div>}
        </div>
        <div className="event-time">{fmtRel(ev.timestamp)}</div>
        <div className="event-caret">
          <Icon name={open ? "chevUp" : "chevDown"} size={14} />
        </div>
      </div>
      {open && (
        <div className="event-details" onClick={e => e.stopPropagation()}>
          <dl className="kv-compact">
            <dt>Type</dt><dd className="mono">{ev.type}</dd>
            <dt>Timestamp</dt><dd className="mono">{new Date(ev.timestamp).toLocaleString()}</dd>
            {ev.token_label && <><dt>Widget</dt><dd>{widgetLink}</dd></>}
            {ev.session_id && <><dt>Session</dt><dd className="mono">{ev.session_id}</dd></>}
            {ev.origin && <><dt>Origin</dt><dd className="mono">{ev.origin}</dd></>}
            {ev.entity_id && <><dt>Entity</dt><dd className="mono">{ev.entity_id}</dd></>}
            {ev.action && <><dt>Action</dt><dd className="mono">{ev.action}</dd></>}
            {ev.code && <><dt>Error code</dt><dd className="mono">{ev.code}</dd></>}
            {ev.message && <><dt>Message</dt><dd>{ev.message}</dd></>}
          </dl>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

export function fmtRel(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// EntityAutocomplete
// ---------------------------------------------------------------------------

interface EntityAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (entityId: string) => void;
  disabled?: boolean;
  filterDomains?: Set<string>;
  placeholder?: string;
  excludeIds?: string[];
}

// Scroll the input near the top of its nearest scrollable ancestor on mobile
// so the iOS keyboard doesn't cover it and the dropdown has room to drop down.
function scrollInputToTopOnMobile(input: HTMLInputElement | null) {
  if (!input) return;
  if (!window.matchMedia("(max-width: 720px)").matches) return;
  let el: HTMLElement | null = input.parentElement;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
      const inputRect = input.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const delta = inputRect.top - (elRect.top + 8);
      el.scrollBy({ top: delta, behavior: "smooth" });
      return;
    }
    el = el.parentElement;
  }
  const inputRect = input.getBoundingClientRect();
  window.scrollBy({ top: inputRect.top - 8, behavior: "smooth" });
}

export function EntityAutocomplete({ value, onChange, onSelect, disabled, filterDomains, placeholder, excludeIds }: EntityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cacheLen, setCacheLen] = useState(() => getEntityCache().length);
  const prevDisabled = useRef(false);

  useEffect(() => {
    if (getEntityCache().length > 0) { setCacheLen(getEntityCache().length); return; }
    loadEntityCache().then(() => setCacheLen(getEntityCache().length));
  }, []);

  useEffect(() => {
    prevDisabled.current = !!disabled;
  }, [disabled]);

  const excluded = useMemo(() => new Set(excludeIds ?? []), [excludeIds]);

  const matches = useMemo<HAEntity[]>(() => {
    if (!value.trim() || cacheLen === 0) return [];
    const query = value.toLowerCase().trim();
    const words = query.split(/\s+/).filter(Boolean);

    // Score a candidate entity for relevance. Higher = better match.
    // Rewards matches at the start of the name part (after the domain dot)
    // and at the start of the friendly name more than buried substring matches.
    const score = (e: HAEntity): number => {
      const id   = e.entity_id.toLowerCase();
      const name = e.friendly_name.toLowerCase();
      const part = id.indexOf(".") >= 0 ? id.split(".")[1] : id; // name after domain
      let s = 0;
      if (id === query || name === query) return 1000; // exact match
      for (const w of words) {
        if (id === w)                          s += 80;
        else if (part.startsWith(w))           s += 40;
        else if (name.startsWith(w))           s += 35;
        else if (part.includes(`_${w}`) || part.includes(w + "_")) s += 20;
        else if (name.includes(` ${w}`))       s += 18;
        else if (part.includes(w))             s += 12;
        else if (name.includes(w))             s += 8;
        else /* word only in domain prefix */  s += 2;
      }
      // Prefer shorter entity IDs - a closer overall match relative to its length
      s -= id.length * 0.15;
      return s;
    };

    return getEntityCache()
      .filter(e => {
        if (excluded.has(e.entity_id)) return false;
        if (filterDomains && !filterDomains.has(e.domain)) return false;
        const hay = `${e.entity_id} ${e.friendly_name}`.toLowerCase();
        return words.every(w => hay.includes(w));
      })
      .map(e => ({ e, s: score(e) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(({ e }) => e);
  }, [value, filterDomains, excluded, cacheLen]);

  useEffect(() => { setHighlighted(0); }, [matches.length]);

  useEffect(() => {
    if (!open || matches.length === 0 || !inputRef.current) {
      setDropdownRect(null);
      return;
    }
    const calc = () => {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      const vvH = window.visualViewport?.height ?? window.innerHeight;
      const spaceBelow = vvH - r.bottom - 8;
      if (spaceBelow >= 80) {
        setDropdownRect({ top: r.bottom + 2, left: r.left, width: r.width, maxHeight: Math.min(280, spaceBelow) });
      } else {
        const maxH = Math.min(280, r.top - 8);
        setDropdownRect(maxH > 40
          ? { top: r.top - maxH - 2, left: r.left, width: r.width, maxHeight: maxH }
          : null);
      }
    };
    calc();
    window.visualViewport?.addEventListener("resize", calc);
    window.visualViewport?.addEventListener("scroll", calc);
    window.addEventListener("resize", calc);
    return () => {
      window.visualViewport?.removeEventListener("resize", calc);
      window.visualViewport?.removeEventListener("scroll", calc);
      window.removeEventListener("resize", calc);
    };
  }, [open, matches.length]);

  const select = (entityId: string) => {
    onSelect(entityId);
    onChange("");
    setOpen(false);
  };

  return (
    <div style={{ flex: 1 }}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => {
          setOpen(true);
          // After the iOS keyboard finishes animating (~300ms), scroll the input
          // near the top of its scrollable container so the dropdown has room below.
          setTimeout(() => scrollInputToTopOnMobile(inputRef.current), 320);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open || matches.length === 0) {
            if (e.key === "Enter" && value.trim().includes(".")) { select(value.trim()); e.preventDefault(); }
            return;
          }
          if (e.key === "ArrowDown") { setHighlighted(h => Math.min(h + 1, matches.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setHighlighted(h => Math.max(h - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter") { select(matches[highlighted].entity_id); e.preventDefault(); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        disabled={disabled}
        placeholder={placeholder ?? "Search entity ID or friendly name..."}
        className="input"
        style={{ width: "100%", boxSizing: "border-box" }}
        aria-label="Search entities"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
      />
      {dropdownRect && (
        <div
          className="autocomplete-dropdown"
          style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width, maxHeight: dropdownRect.maxHeight }}
          role="listbox"
        >
          {matches.map((e, i) => (
            <div
              key={e.entity_id}
              onMouseDown={() => select(e.entity_id)}
              onMouseEnter={() => setHighlighted(i)}
              className={`autocomplete-item${i === highlighted ? " highlighted" : ""}`}
              role="option"
              aria-selected={i === highlighted}
            >
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>{e.domain}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.entity_id}</div>
                {e.friendly_name !== e.entity_id && (
                  <div className="muted" style={{ fontSize: 11 }}>{e.friendly_name}</div>
                )}
              </div>
              <span className="muted" style={{ fontSize: 11 }}>{e.state}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Theme thumbnail hook
// ---------------------------------------------------------------------------

export function useThemeThumbs(themes: ThemeDefinition[], refreshKey = 0): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    Promise.all(themes.map(async (t) => {
      try {
        const blob = await api.themes.fetchThumbnail(t.theme_id);
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        return [t.theme_id, url] as const;
      } catch {
        return null;
      }
    })).then((results) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const r of results) {
        if (r) map[r[0]] = r[1];
      }
      setUrls(map);
    });

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [themes, refreshKey]);

  return urls;
}
