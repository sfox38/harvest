/**
 * Sessions.tsx - Global active sessions screen.
 *
 * Expandable 7-column session rows. Auto-refreshes every 15s.
 */

import { useState, useEffect, useCallback } from "react";
import type { Session, Token } from "../types";
import { api } from "../api";
import { ConfirmDialog, Spinner, ErrorBanner, Card, fmtRel } from "./Shared";
import { Icon } from "./Icon";

// ---------------------------------------------------------------------------
// SessionRow
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: Session;
  tokenLabel: string;
  onTerminate: () => void;
  onSelectToken: (tokenId: string) => void;
}

function SessionRow({ session: s, tokenLabel, onTerminate, onSelectToken }: SessionRowProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(o => !o);

  const expires = new Date(s.expires_at);
  const now = new Date();
  const minsLeft = Math.round((expires.getTime() - now.getTime()) / 60_000);
  const expiresLabel = minsLeft > 0
    ? `${fmtRel(s.issued_at)} - expires in ${minsLeft}m`
    : fmtRel(s.issued_at);

  return (
    <div
      className={`session-row${open ? " open" : ""}`}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
    >
      <div className="session-row-top" onClick={toggle}>
        {/* Icon */}
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="plug" size={12} />
        </div>

        {/* Name + session ID */}
        <div className="sess-col" style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
            <a
              href="#"
              className="widget-link"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onSelectToken(s.widget_token_id); }}
            >
              {tokenLabel}
            </a>
          </div>
          <div className="muted mono" style={{ fontSize: 11 }}>{s.session_id.slice(0, 14)}</div>
        </div>

        {/* Origin */}
        <div className="sess-col muted" style={{ fontSize: 12 }}>
          <Icon name="globe" size={11} style={{ marginRight: 4 }} />
          {s.origin || "-"}
        </div>

        {/* IP */}
        <div className="sess-col mono muted" style={{ fontSize: 12 }}>
          {s.ip_address || "-"}
        </div>

        {/* Time */}
        <div className="sess-col muted" style={{ fontSize: 12 }}>
          {expiresLabel}
        </div>

        {/* Caret */}
        <div className="event-caret" style={{ margin: 0 }}>
          <Icon name={open ? "chevUp" : "chevDown"} size={14} />
        </div>

        {/* End button */}
        <button
          className="btn btn-sm btn-danger"
          onClick={e => { e.stopPropagation(); onTerminate(); }}
          aria-label="Terminate session"
        >
          End
        </button>
      </div>

      {open && (
        <div className="event-details" onClick={e => e.stopPropagation()}>
          <dl className="kv-compact">
            <dt>Session ID</dt><dd className="mono">{s.session_id}</dd>
            <dt>Widget</dt><dd>{tokenLabel}</dd>
            {s.origin     && <><dt>Origin</dt><dd className="mono">{s.origin}</dd></>}
            {s.ip_address && <><dt>Client IP</dt><dd className="mono">{s.ip_address}</dd></>}
            <dt>Issued</dt><dd>{new Date(s.issued_at).toLocaleString()}</dd>
            <dt>Expires</dt><dd>{new Date(s.expires_at).toLocaleString()} ({minsLeft}m)</dd>
            <dt>Renewals</dt><dd>{s.renewal_count}</dd>
            {s.subscribed_entity_ids.length > 0 && (
              <><dt>Entities</dt><dd className="mono" style={{ fontSize: 11 }}>{s.subscribed_entity_ids.join(", ")}</dd></>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

interface SessionsProps {
  onSelectToken: (tokenId: string) => void;
}

export function Sessions({ onSelectToken }: SessionsProps) {
  const [sessions,   setSessions]   = useState<Session[]>([]);
  const [tokens,     setTokens]     = useState<Token[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.sessions.list(), api.tokens.list()])
      .then(([s, t]) => { setSessions(s); setTokens(t); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const terminate = async (sid: string) => {
    await api.sessions.terminate(sid).catch(e => setError(String(e)));
    load();
  };

  const terminateAll = async () => {
    try {
      await Promise.all(sessions.map(s => api.sessions.terminate(s.session_id)));
    } catch (e) { setError(String(e)); }
    setConfirmAll(false);
    load();
  };

  function tokenLabelFor(tokenId: string): string {
    return tokens.find(t => t.token_id === tokenId)?.label ?? tokenId;
  }

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Header */}
      <div className="row" style={{ gap: 8 }}>
        <span className="muted" style={{ fontSize: 14, flex: 1 }}>
          {sessions.length} live session{sessions.length !== 1 ? "s" : ""} - updating live
        </span>
        <button onClick={load} className="btn">
          <Icon name="refresh" size={14} /> Refresh
        </button>
      </div>

      {/* Sessions list */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner size={36} />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <div className="muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
            No active sessions. Sessions appear when someone opens a page with a widget embedded.
          </div>
        </Card>
      ) : (
        <Card pad={false}>
          {sessions.map(s => (
            <SessionRow
              key={s.session_id}
              session={s}
              tokenLabel={tokenLabelFor(s.widget_token_id)}
              onTerminate={() => terminate(s.session_id)}
              onSelectToken={onSelectToken}
            />
          ))}
        </Card>
      )}

      {confirmAll && (
        <ConfirmDialog
          title="Terminate all sessions"
          message={`Terminate all ${sessions.length} active session${sessions.length !== 1 ? "s" : ""} immediately?`}
          confirmLabel="Terminate all"
          confirmDestructive
          onConfirm={terminateAll}
          onCancel={() => setConfirmAll(false)}
        />
      )}
    </div>
  );
}
