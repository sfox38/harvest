/**
 * TokenDetail.tsx - Widget (token) detail view.
 *
 * detail-grid split: embed code + entities (left), health/usage + sessions
 * + activity (right). Code blocks use step-pill labels.
 */

import { useState, useEffect, useCallback } from "react";
import type { Token, Session, ActivityPage } from "../types";
import { api } from "../api";
import { StatusBadge, CopyablePre, ConfirmDialog, Spinner, ErrorBanner, Card, EventRow, fmtRel } from "./Shared";
import { Icon } from "./Icon";
import { loadKnownOrigins, addKnownOrigin, removeKnownOrigin, validateOriginUrl, displayOriginLabel } from "./originMemory";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TokenDetailProps {
  tokenId: string;
  onBack: () => void;
  onOpenWizard: () => void;
  onDeleted: () => void;
}

// ---------------------------------------------------------------------------
// Code snippet builders (preserved from original)
// ---------------------------------------------------------------------------

const WIDGET_SCRIPT = `<script src="https://cdn.jsdelivr.net/gh/sfox38/harvest@latest/widget/dist/harvest.min.js"></script>`;

function buildCardSnippet(token: Token, useAliases: boolean, haUrl: string): string {
  const attrs = `ha-url="${haUrl}" token="${token.token_id}"`;
  const isGroup = token.entities.length > 1;
  const cards = token.entities.map(e => {
    const attr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
    return `  <hrv-card ${attr}></hrv-card>`;
  });
  if (isGroup) return `<hrv-group ${attrs}>\n${cards.join("\n")}\n</hrv-group>`;
  const entityAttr = useAliases && token.entities[0]?.alias
    ? `alias="${token.entities[0].alias}"`
    : `entity="${token.entities[0]?.entity_id ?? ""}"`;
  return `<hrv-card ${attrs} ${entityAttr}></hrv-card>`;
}

function buildWordPressSnippet(token: Token, useAliases: boolean, haUrl: string): string {
  const groupAttrs = `data-ha-url="${haUrl}" data-token="${token.token_id}"`;
  const cards = token.entities.map(e => {
    const attr = useAliases && e.alias ? `data-alias="${e.alias}"` : `data-entity="${e.entity_id}"`;
    return `  <div class="hrv-mount" ${attr}></div>`;
  });
  const isGroup = token.entities.length > 1;
  if (isGroup) return `<div class="hrv-group" ${groupAttrs}>\n${cards.join("\n")}\n</div>`;
  const entityAttr = useAliases && token.entities[0]?.alias
    ? `data-alias="${token.entities[0].alias}"`
    : `data-entity="${token.entities[0]?.entity_id ?? ""}"`;
  return `<div class="hrv-mount" ${groupAttrs} ${entityAttr}></div>`;
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const LABEL_ILLEGAL = /[\x00-\x1f<>"&]/;

function validateLabel(label: string, otherLabels: string[]): string | null {
  const t = label.trim();
  if (!t) return "Name is required.";
  if (t.length > 100) return "Name must be 100 characters or fewer.";
  if (LABEL_ILLEGAL.test(t)) return "Name contains invalid characters.";
  if (otherLabels.some(l => l.trim().toLowerCase() === t.toLowerCase())) {
    return "A widget with this name already exists.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Code section
// ---------------------------------------------------------------------------

function CodeSection({ token }: { token: Token }) {
  const [useAliases, setUseAliases] = useState(false);
  const [tab, setTab] = useState<"web" | "wordpress">("web");
  const haUrl = window.location.origin;

  const cardSnippet = tab === "web"
    ? buildCardSnippet(token, useAliases, haUrl)
    : buildWordPressSnippet(token, useAliases, haUrl);

  return (
    <Card
      title="Embed code"
      action={
        <div className="segmented" role="group" aria-label="Code format">
          <button aria-pressed={tab === "web"} onClick={() => setTab("web")}>HTML</button>
          <button aria-pressed={tab === "wordpress"} onClick={() => setTab("wordpress")}>WordPress</button>
        </div>
      }
    >
      {/* Step 1 */}
      <div className="code-block-group">
        <div className="code-block-label">
          <span className="step-pill">1</span>
          <div>
            <div className="code-block-title">Page-level script</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Add once to your site's <code>&lt;head&gt;</code>. Shared by all HArvest widgets on the page.
            </div>
          </div>
        </div>
        <CopyablePre text={WIDGET_SCRIPT} label="Copy script" />
      </div>

      {/* Step 2 */}
      <div className="code-block-group">
        <div className="code-block-label">
          <span className="step-pill">2</span>
          <div>
            <div className="code-block-title">Widget markup</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Drop wherever this widget should render. Repeat for more widgets.
            </div>
          </div>
        </div>
        <CopyablePre text={cardSnippet} label="Copy markup" />
      </div>

      {/* Alias toggle */}
      <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer", marginTop: 8 }}>
        <input
          type="checkbox"
          checked={useAliases}
          onChange={e => setUseAliases(e.target.checked)}
          disabled={token.entities.every(e => !e.alias)}
        />
        Show as aliases
        <span
          title="Aliases hide your real entity IDs from the page source. Both formats work against the same token."
          className="muted"
          style={{ fontSize: 11, cursor: "help" }}
        >
          (?)
        </span>
      </label>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sessions panel
// ---------------------------------------------------------------------------

function SessionsPanel({ tokenId }: { tokenId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [termAll,  setTermAll]  = useState(false);

  const load = useCallback(() => {
    api.sessions.list(tokenId).then(setSessions).catch(() => {}).finally(() => setLoading(false));
  }, [tokenId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const terminate = async (sid: string) => {
    await api.sessions.terminate(sid).catch(() => {});
    load();
  };

  const terminateAll = async () => {
    await api.sessions.terminateAll(tokenId).catch(() => {});
    setTermAll(false);
    load();
  };

  if (loading) return <Spinner size={24} />;

  return (
    <Card
      title={`Sessions (${sessions.length})`}
      pad={sessions.length === 0}
      action={sessions.length > 0 ? (
        <button className="btn btn-sm btn-danger" onClick={() => setTermAll(true)}>
          Terminate all
        </button>
      ) : undefined}
    >
      {sessions.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          No active sessions. Sessions appear when someone opens a page with this widget embedded.
        </p>
      ) : (
        <div>
          {sessions.map(s => (
            <div
              key={s.session_id}
              className={`session-row${expanded === s.session_id ? " open" : ""}`}
              onClick={() => setExpanded(expanded === s.session_id ? null : s.session_id)}
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(expanded === s.session_id ? null : s.session_id); } }}
            >
              <div className="session-row-top">
                <code className="mono" style={{ fontSize: 11, flex: 1 }}>
                  {s.session_id.slice(0, 20)}...
                </code>
                <span className="muted" style={{ fontSize: 12 }}>
                  {fmtRel(s.issued_at)}
                </span>
                <Icon name={expanded === s.session_id ? "chevUp" : "chevDown"} size={14} />
              </div>
              {expanded === s.session_id && (
                <div className="event-details" onClick={e => e.stopPropagation()}>
                  <dl className="kv-compact">
                    <dt>Session ID</dt><dd className="mono">{s.session_id}</dd>
                    <dt>Origin</dt><dd className="mono">{s.origin ?? "unknown"}</dd>
                    <dt>Connected</dt><dd>{fmtRel(s.issued_at)}</dd>
                    <dt>Renewals</dt><dd>{s.renewal_count}</dd>
                    <dt>Entities</dt><dd className="mono">{s.subscribed_entity_ids.join(", ") || "none"}</dd>
                  </dl>
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => terminate(s.session_id)}
                    >
                      Terminate session
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {termAll && (
        <ConfirmDialog
          title="Terminate all sessions"
          message="All active sessions for this widget will be closed immediately."
          confirmLabel="Terminate all"
          confirmDestructive
          onConfirm={terminateAll}
          onCancel={() => setTermAll(false)}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Activity panel
// ---------------------------------------------------------------------------

type ActivityDateRange = "1h" | "24h" | "7d" | "all";
const DATE_OPTIONS: { value: ActivityDateRange; label: string }[] = [
  { value: "1h",  label: "Last hour"   },
  { value: "24h", label: "Last 24h"    },
  { value: "7d",  label: "Last 7 days" },
  { value: "all", label: "All time"    },
];

function sinceFor(range: ActivityDateRange): string | undefined {
  if (range === "all") return undefined;
  const ms: Record<Exclude<ActivityDateRange, "all">, number> = {
    "1h":  60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d":  7 * 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() - ms[range as Exclude<ActivityDateRange, "all">]).toISOString();
}

function ActivityPanel({ tokenId }: { tokenId: string }) {
  const [page,      setPage]      = useState<ActivityPage | null>(null);
  const [offset,    setOffset]    = useState(0);
  const [dateRange, setDateRange] = useState<ActivityDateRange>("24h");
  const LIMIT = 20;

  useEffect(() => {
    const params: Parameters<typeof api.activity.list>[0] = { token_id: tokenId, offset, limit: LIMIT };
    const since = sinceFor(dateRange);
    if (since) params.since = since;
    api.activity.list(params).then(setPage).catch(() => {});
  }, [tokenId, offset, dateRange]);

  if (!page) return <Spinner size={24} />;

  return (
    <Card
      title="Activity"
      pad={page.events.length === 0}
      action={
        <select
          value={dateRange}
          onChange={e => { setDateRange(e.target.value as ActivityDateRange); setOffset(0); }}
          className="input"
          style={{ fontSize: 12, padding: "2px 6px" }}
          aria-label="Date range"
        >
          {DATE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      }
    >
      {page.events.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No activity in this period.</p>
      ) : (
        <>
          <div>
            {page.events.map(ev => (
              <EventRow key={ev.id} ev={ev} />
            ))}
          </div>
          {page.total > LIMIT && (
            <div className="row" style={{ padding: "8px 0", fontSize: 12 }}>
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="btn btn-sm btn-ghost"
              >
                Prev
              </button>
              <span className="muted" style={{ flex: 1, textAlign: "center" }}>
                {offset + 1}-{Math.min(page.total, offset + LIMIT)} of {page.total}
              </span>
              <button
                disabled={offset + LIMIT >= page.total}
                onClick={() => setOffset(offset + LIMIT)}
                className="btn btn-sm btn-ghost"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Origins editor
// ---------------------------------------------------------------------------

const ORIGIN_CUSTOM = "__custom__";

interface OriginsEditorProps {
  token: Token;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setToken: (t: Token) => void;
  setError: (e: string | null) => void;
}

function OriginsEditor({ token, saving, setSaving, setToken, setError }: OriginsEditorProps) {
  const [knownOrigins,   setKnownOrigins]   = useState<string[]>(loadKnownOrigins);
  const [usingCustom,    setUsingCustom]    = useState(false);
  const [customInput,    setCustomInput]    = useState("");
  const [dropdownSel,    setDropdownSel]    = useState("");
  const [urlError,       setUrlError]       = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<{ url: string; newOrigin: string; path: string | null } | null>(null);
  const readonly = token.status === "revoked" || token.status === "expired";

  const baseOrigin = token.origins.allowed[0] ?? "";
  const paths = token.origins.allow_paths;
  const displayUrls: string[] = token.origins.allow_any
    ? []
    : paths.length > 0
      ? paths.map(p => `${baseOrigin}${p}`)
      : baseOrigin ? [baseOrigin] : [];

  const saveOrigins = async (origins: Token["origins"]) => {
    setSaving(true);
    try {
      const updated = await api.tokens.update(token.token_id, { origins });
      setToken(updated);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const removeUrl = (displayUrl: string) => {
    if (readonly || saving) return;
    try {
      const u = new URL(displayUrl);
      const path = (u.pathname && u.pathname !== "/") ? u.pathname : null;
      if (path) {
        const newPaths = paths.filter(p => p !== path);
        saveOrigins({ allow_any: false, allowed: newPaths.length > 0 ? [baseOrigin] : [], allow_paths: newPaths });
      } else {
        saveOrigins({ allow_any: false, allowed: [], allow_paths: [] });
      }
    } catch { /* bad URL */ }
  };

  const applyUrl = (url: string, newOrigin: string, path: string | null) => {
    const differentHost = !!baseOrigin && baseOrigin !== newOrigin;
    if (path) {
      const newPaths = differentHost ? [path] : [...paths.filter(p => p !== path), path];
      saveOrigins({ allow_any: false, allowed: [newOrigin], allow_paths: newPaths });
    } else {
      saveOrigins({ allow_any: false, allowed: [newOrigin], allow_paths: differentHost ? [] : paths });
    }
    addKnownOrigin(url);
    setKnownOrigins(loadKnownOrigins());
    setDropdownSel("");
    setUsingCustom(false);
    setCustomInput("");
    setUrlError(null);
    setPendingReplace(null);
  };

  const addUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || readonly || saving) return;
    const err = validateOriginUrl(trimmed);
    if (err) { setUrlError(err); return; }
    const u = new URL(trimmed);
    const newOrigin = u.origin;
    const path = (u.pathname && u.pathname !== "/") ? u.pathname : null;
    // Strip query string and fragment - only origin+path are used for matching.
    const normalized = path ? `${newOrigin}${path}` : newOrigin;
    if (baseOrigin && baseOrigin !== newOrigin && displayUrls.length > 0) {
      setPendingReplace({ url: normalized, newOrigin, path });
      return;
    }
    applyUrl(normalized, newOrigin, path);
  };

  const handleDeleteFromDropdown = () => {
    removeKnownOrigin(dropdownSel);
    setKnownOrigins(loadKnownOrigins());
    setDropdownSel("");
  };

  const dropdownItems = knownOrigins.filter(o => {
    if (displayUrls.includes(o)) return false;
    if (!baseOrigin) return true;
    try { return new URL(o).origin === baseOrigin; } catch { return false; }
  });
  const hasDropdown = dropdownItems.length > 0;

  return (
    <Card title="Origins">
      {!readonly && (
        <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={token.origins.allow_any}
            onChange={() => saveOrigins({ allow_any: !token.origins.allow_any, allowed: token.origins.allowed, allow_paths: token.origins.allow_paths })}
            disabled={saving}
          />
          Allow from any website
        </label>
      )}

      {token.origins.allow_any ? (
        <div className="muted" style={{ fontSize: 13 }}>
          {token.entities.some(e => e.capabilities === "read-write") && (
            <div className="badge badge-warn" style={{ marginBottom: 6, display: "inline-block" }}>
              Write access from any website
            </div>
          )}
          {readonly && <div>Any website</div>}
        </div>
      ) : (
        <>
          {displayUrls.length === 0 && (
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>No origin set.</div>
          )}
          <div className="col" style={{ gap: 4, marginBottom: 8 }}>
            {displayUrls.map(url => (
              <div key={url} className="row" style={{ gap: 6, fontSize: 13 }}>
                <span style={{ flex: 1 }} className="mono url-clip">{url}</span>
                {!readonly && (
                  <button
                    onClick={() => removeUrl(url)}
                    disabled={saving}
                    className="btn btn-sm btn-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {!readonly && (
            <div className="col" style={{ gap: 6 }}>
              {hasDropdown && (
                <div className="row" style={{ gap: 6 }}>
                  <select
                    value={usingCustom ? ORIGIN_CUSTOM : dropdownSel}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === ORIGIN_CUSTOM) { setUsingCustom(true); setDropdownSel(""); }
                      else { setDropdownSel(v); setUsingCustom(false); }
                    }}
                    disabled={saving}
                    className="input"
                    style={{ flex: 1, fontSize: 13 }}
                  >
                    <option value="">Select a URL...</option>
                    {dropdownItems.map(o => <option key={o} value={o}>{displayOriginLabel(o)}</option>)}
                    <option value={ORIGIN_CUSTOM}>Enter a new URL...</option>
                  </select>
                  {dropdownSel && !usingCustom && (
                    <>
                      <button
                        onClick={() => addUrl(dropdownSel)}
                        disabled={saving}
                        className="btn btn-sm"
                      >
                        Add URL
                      </button>
                      <button
                        onClick={handleDeleteFromDropdown}
                        disabled={saving}
                        className="btn btn-sm btn-danger"
                      >
                        Delete URL
                      </button>
                    </>
                  )}
                </div>
              )}
              {(usingCustom || !hasDropdown) && (
                <div className="row" style={{ gap: 6 }}>
                  <input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addUrl(customInput); }}
                    placeholder="https://example.com/page.html"
                    disabled={saving}
                    autoFocus={hasDropdown}
                    className="input"
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button
                    onClick={() => addUrl(customInput)}
                    disabled={saving || !customInput.trim()}
                    className="btn btn-sm"
                  >
                    Add URL
                  </button>
                </div>
              )}
              {urlError && (
                <div style={{ fontSize: 12, color: "var(--danger)" }}>{urlError}</div>
              )}
              <p className="muted" style={{ fontSize: 11 }}>
                Site only (https://example.com) or a specific page (https://example.com/page.html).
              </p>
            </div>
          )}
        </>
      )}

      {pendingReplace && (
        <ConfirmDialog
          title="Replace website?"
          message={`Changing to ${pendingReplace.newOrigin} will remove all existing URLs for ${baseOrigin}. Continue?`}
          confirmLabel="Replace"
          confirmDestructive
          onConfirm={() => applyUrl(pendingReplace.url, pendingReplace.newOrigin, pendingReplace.path)}
          onCancel={() => setPendingReplace(null)}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TokenDetail
// ---------------------------------------------------------------------------

export function TokenDetail({ tokenId, onBack, onDeleted }: TokenDetailProps) {
  const [token,         setToken]         = useState<Token | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [editLabel,     setEditLabel]     = useState("");
  const [labelError,    setLabelError]    = useState<string | null>(null);
  const [allLabels,     setAllLabels]     = useState<string[]>([]);
  const [editExpiry,    setEditExpiry]    = useState("");
  const [saving,        setSaving]        = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    api.tokens.get(tokenId)
      .then(t => {
        setToken(t);
        setEditLabel(t.label);
        setEditExpiry(t.expires ? t.expires.slice(0, 10) : "");
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [tokenId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.tokens.list().then(ts => {
      setAllLabels(ts.filter(t => t.token_id !== tokenId).map(t => t.label));
    }).catch(() => {});
  }, [tokenId]);

  const saveEdit = async (currentLabel: string) => {
    if (!token) return;
    const trimmed = currentLabel.trim();
    if (!trimmed) {
      setEditLabel(token.label);
      setLabelError(null);
      return;
    }
    const err = validateLabel(trimmed, allLabels);
    if (err) { setLabelError(err); return; }
    setLabelError(null);
    if (trimmed === token.label) return;
    setSaving(true);
    const prevCreatedByName = token.created_by_name;
    try {
      const updated = await api.tokens.update(token.token_id, { label: trimmed });
      setToken({ ...updated, created_by_name: prevCreatedByName });
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const saveExpiry = async (val: string) => {
    if (!token) return;
    let newExpires: string | null = null;
    if (val) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return;
      newExpires = val + "T00:00:00Z";
    }
    const current = token.expires ? token.expires.slice(0, 10) : "";
    if (val === current) return;
    setSaving(true);
    const prevCreatedByName = token.created_by_name;
    try {
      const updated = await api.tokens.update(token.token_id, { expires: newExpires });
      setToken({ ...updated, created_by_name: prevCreatedByName });
      setEditExpiry(updated.expires ? updated.expires.slice(0, 10) : "");
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const doRevoke = async () => {
    if (!token) return;
    try {
      await api.tokens.revoke(token.token_id);
      setConfirmRevoke(false);
      load();
    } catch (e) { setError(String(e)); }
  };

  const doDelete = async () => {
    if (!token) return;
    try {
      await api.tokens.delete(token.token_id);
      setConfirmDelete(false);
      onDeleted();
    } catch (e) { setError(String(e)); }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ padding: 32 }}>
        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  const readonly = token.status === "revoked" || token.status === "expired";
  const today = new Date().toISOString().slice(0, 10);
  const expiryInvalid = editExpiry !== "" && (
    !/^\d{4}-\d{2}-\d{2}$/.test(editExpiry) || editExpiry <= today
  );
  const savedValue = token.expires ? token.expires.slice(0, 10) : "";
  const expiryDirty = editExpiry !== savedValue;

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Back + header */}
      <div className="row">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <Icon name="chevLeft" size={14} /> Back
        </button>
      </div>

      <div className="card card-pad">
        <div className="row detail-header-row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
              <input
                value={editLabel}
                maxLength={100}
                onChange={e => {
                  setEditLabel(e.target.value);
                  if (labelError !== null) setLabelError(validateLabel(e.target.value.trim(), allLabels));
                }}
                onBlur={e => saveEdit(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                disabled={saving || readonly}
                className="input"
                style={{ fontSize: 20, fontWeight: 650, border: "none", padding: "0", background: "transparent", flex: 1 }}
                aria-label="Widget name"
              />
              <StatusBadge status={token.status} />
            </div>
            {labelError && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 3 }}>{labelError}</div>
            )}
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Created {fmtDateLong(token.created_at)} by {token.created_by_name ?? token.created_by}
              {" - "}{token.entities.length} {token.entities.length === 1 ? "entity" : "entities"}
            </div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {!readonly && (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmRevoke(true)}>
                <Icon name="trash" size={13} /> Revoke
              </button>
            )}
            {readonly && (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={13} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* detail-grid: left (code + entities + origins + expiry), right (sessions + activity) */}
      <div className="detail-grid">
        <div className="col" style={{ gap: 18 }}>

          {/* Code section */}
          {!readonly && <CodeSection token={token} />}

          {/* Entities */}
          <Card title={`Entities (${token.entities.length})`} pad={false}>
            {token.entities.map(e => {
              const isRW = e.capabilities === "read-write";
              const canEdit = !readonly && !saving;
              const toggleCap = async (newCap: "read" | "read-write") => {
                if (!canEdit) return;
                const updated = token.entities.map(en =>
                  en.entity_id === e.entity_id ? { ...en, capabilities: newCap } : en
                );
                setSaving(true);
                const prevName = token.created_by_name;
                try {
                  const t = await api.tokens.update(token.token_id, { entities: updated as Token["entities"] });
                  setToken({ ...t, created_by_name: prevName });
                } catch (err) { setError(String(err)); }
                finally { setSaving(false); }
              };
              return (
                <div key={e.entity_id} className="widget-row" style={{ gridTemplateColumns: "32px 1fr auto auto", cursor: "default" }}>
                  <div className="widget-thumb" style={{ width: 32, height: 32 }}>
                    <Icon name="plug" size={16} />
                  </div>
                  <div className="widget-name">
                    <div className="widget-name-top mono" style={{ fontSize: 13 }}>{e.entity_id}</div>
                    {e.alias && (
                      <div className="widget-name-sub">Alias: <span className="mono">{e.alias}</span></div>
                    )}
                  </div>
                  <select
                    value={e.capabilities}
                    onChange={ev => { if (canEdit) toggleCap(ev.target.value as "read" | "read-write"); }}
                    disabled={!canEdit}
                    className="input"
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 6px",
                      background: isRW ? "var(--info-weak)" : "var(--ok-weak)",
                      color: isRW ? "var(--info)" : "var(--ok)",
                      border: "none", borderRadius: 10,
                    }}
                  >
                    <option value="read">READ</option>
                    <option value="read-write">READ-WRITE</option>
                  </select>
                </div>
              );
            })}
          </Card>

          {/* Origins */}
          <OriginsEditor
            token={token}
            saving={saving}
            setSaving={setSaving}
            setToken={t => setToken({ ...t, created_by_name: token.created_by_name })}
            setError={setError}
          />

          {/* Expiry */}
          <Card title="Expiry">
            {readonly ? (
              <div className="muted" style={{ fontSize: 13 }}>
                {token.expires ? new Date(token.expires).toLocaleString() : "No expiry set"}
              </div>
            ) : (
              <div className="col" style={{ gap: 6 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="date"
                    value={editExpiry}
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    onChange={e => setEditExpiry(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveExpiry(editExpiry); }}
                    disabled={saving}
                    className="input"
                    style={{ fontSize: 13, borderColor: expiryInvalid ? "var(--danger)" : undefined }}
                  />
                  <button
                    onClick={() => saveExpiry(editExpiry)}
                    disabled={saving || expiryInvalid || !expiryDirty}
                    className="btn btn-sm btn-primary"
                  >
                    Apply
                  </button>
                  {editExpiry && (
                    <button
                      onClick={() => saveExpiry("")}
                      disabled={saving}
                      className="btn btn-sm btn-ghost"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {expiryInvalid && (
                  <div style={{ fontSize: 12, color: "var(--danger)" }}>Date must be in the future.</div>
                )}
                {!editExpiry && !expiryInvalid && (
                  <div className="muted" style={{ fontSize: 12 }}>No expiry - widget never expires</div>
                )}
              </div>
            )}
            {token.active_schedule && (
              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                Schedule: {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].filter((_, i) => token.active_schedule!.days.includes(i)).join(", ")}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="col" style={{ gap: 18 }}>
          <Card title="Usage">
            <dl className="kv">
              <dt>Live sessions</dt><dd>{token.active_sessions}</dd>
              <dt>Token ID</dt><dd className="mono" style={{ fontSize: 11 }}>{token.token_id}</dd>
              <dt>Version</dt><dd>{token.token_version}</dd>
              <dt>Max sessions</dt><dd>{token.max_sessions ?? "unlimited"}</dd>
            </dl>
          </Card>

          <SessionsPanel tokenId={tokenId} />
          <ActivityPanel tokenId={tokenId} />
        </div>
      </div>

      {confirmRevoke && (
        <ConfirmDialog
          title="Revoke widget"
          message={`Revoking "${token.label}" will immediately terminate all active sessions.`}
          confirmLabel="Revoke"
          confirmDestructive
          onConfirm={doRevoke}
          onCancel={() => setConfirmRevoke(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete widget"
          message={`Delete "${token.label}" and all associated activity log entries permanently?`}
          confirmLabel="Delete"
          confirmDestructive
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
