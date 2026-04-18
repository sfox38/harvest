/**
 * Sessions.tsx - Global active sessions screen.
 *
 * Expandable session rows with filtering by token. Auto-refreshes every 15s.
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
  const pageDisplay = s.referer || s.origin || "-";

  return (
    <div
      className={`session-row${open ? " open" : ""}`}
      onClick={toggle}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
    >
      <div className="session-row-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            <a
              href="#"
              className="widget-link"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onSelectToken(s.widget_token_id); }}
            >
              {tokenLabel}
            </a>
          </div>
          <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {pageDisplay}
          </div>
        </div>
        <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
          {fmtRel(s.issued_at)}
        </span>
        <Icon name={open ? "chevUp" : "chevDown"} size={14} />
      </div>
      {open && (
        <div className="event-details" onClick={e => e.stopPropagation()}>
          <dl className="kv-compact">
            <dt>Session ID</dt><dd className="mono">{s.session_id}</dd>
            <dt>Widget</dt><dd>{tokenLabel}</dd>
            {s.referer   && <><dt>Page</dt><dd className="mono">{s.referer}</dd></>}
            {s.origin    && <><dt>Origin</dt><dd className="mono">{s.origin}</dd></>}
            {s.ip_address && <><dt>IP</dt><dd className="mono">{s.ip_address}</dd></>}
            <dt>Connected</dt><dd>{new Date(s.issued_at).toLocaleString()}</dd>
            <dt>Expires</dt><dd>{new Date(s.expires_at).toLocaleString()}</dd>
            <dt>Renewals</dt><dd>{s.renewal_count}</dd>
            {s.subscribed_entity_ids.length > 0 && (
              <><dt>Entities</dt><dd className="mono">{s.subscribed_entity_ids.join(", ")}</dd></>
            )}
          </dl>
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-sm btn-danger"
              onClick={e => { e.stopPropagation(); onTerminate(); }}
            >
              Terminate session
            </button>
          </div>
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
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [tokens,      setTokens]      = useState<Token[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [confirmAll,  setConfirmAll]  = useState(false);
  const [tokenFilter, setTokenFilter] = useState<string>("all");

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
      await Promise.all(filtered.map(s => api.sessions.terminate(s.session_id)));
    } catch (e) { setError(String(e)); }
    setConfirmAll(false);
    load();
  };

  function tokenLabelFor(tokenId: string): string {
    return tokens.find(t => t.token_id === tokenId)?.label ?? tokenId;
  }

  const filtered = tokenFilter === "all"
    ? sessions
    : sessions.filter(s => s.widget_token_id === tokenFilter);

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Filter bar */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          value={tokenFilter}
          onChange={e => setTokenFilter(e.target.value)}
          className="input"
          style={{ fontSize: 13, flex: "1 1 200px", maxWidth: 320 }}
          aria-label="Filter by widget"
        >
          <option value="all">All widgets</option>
          {tokens.map(t => (
            <option key={t.token_id} value={t.token_id}>{t.label}</option>
          ))}
        </select>
        <button onClick={load} className="btn btn-sm btn-ghost">
          <Icon name="refresh" size={14} />
        </button>
        {filtered.length > 0 && (
          <button onClick={() => setConfirmAll(true)} className="btn btn-sm btn-danger">
            Terminate all
          </button>
        )}
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 13 }}>
          {filtered.length} active session{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Sessions */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner size={36} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="muted" style={{ textAlign: "center", padding: 24, fontSize: 14 }}>
            No active sessions. Sessions appear when someone opens a page with a widget embedded.
          </div>
        </Card>
      ) : (
        <Card pad={false}>
          {filtered.map(s => (
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
          message={`Terminate all ${filtered.length} active session${filtered.length !== 1 ? "s" : ""} immediately?`}
          confirmLabel="Terminate all"
          confirmDestructive
          onConfirm={terminateAll}
          onCancel={() => setConfirmAll(false)}
        />
      )}
    </div>
  );
}
