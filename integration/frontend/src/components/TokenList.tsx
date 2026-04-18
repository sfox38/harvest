/**
 * TokenList.tsx - Widgets (tokens) list screen.
 *
 * Displays all widgets with search, segmented status filter, pagination (20
 * per page), and a separate collapsible archived section. Clicking a row
 * opens TokenDetail inline.
 */

import { useState, useEffect, useCallback } from "react";
import type { Token, TokenStatus } from "../types";
import { api } from "../api";
import { StatusBadge, ConfirmDialog, EmptyState, Spinner, ErrorBanner } from "./Shared";
import { Icon } from "./Icon";
import { TokenDetail } from "./TokenDetail";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TokenListProps {
  onOpenWizard: () => void;
  initialTokenId: string | null;
  onInitialTokenConsumed: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FilterOption = "all" | TokenStatus;

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "all",           label: "All"      },
  { value: "active",        label: "Active"   },
  { value: "expiring_soon", label: "Expiring" },
  { value: "inactive",      label: "Inactive" },
];

const ARCHIVED_STATUSES: TokenStatus[] = ["expired", "revoked"];
const PAGE_SIZE = 20;

function isArchived(t: Token): boolean {
  return ARCHIVED_STATUSES.includes(t.status);
}

function primaryOrigin(t: Token): string {
  if (t.origins.allow_any) return "any website";
  if (t.origins.allowed.length > 0) return t.origins.allowed[0];
  return "no origin set";
}

function expiryLabel(t: Token): string {
  if (t.status === "revoked") return "Revoked";
  if (!t.expires) return "Never expires";
  const d = new Date(t.expires);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return `Expired ${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return "Expires today";
  if (diffDays <= 7) return `Expires in ${diffDays}d`;
  return `Expires ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

// ---------------------------------------------------------------------------
// WidgetRow
// ---------------------------------------------------------------------------

interface WidgetRowProps {
  token: Token;
  onSelect: () => void;
  onRevoke: (t: Token) => void;
  onDelete: (t: Token) => void;
  onDuplicate: (t: Token) => void;
  highlighted: boolean;
}

function WidgetRow({ token: t, onSelect, onRevoke, onDelete, onDuplicate, highlighted }: WidgetRowProps) {
  const archived = isArchived(t);

  return (
    <div
      className={`widget-row${highlighted ? " widget-row-highlighted" : ""}`}
      style={{ opacity: archived ? 0.75 : 1, cursor: "pointer" }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      aria-label={`Open widget ${t.label}`}
    >
      <div className="widget-thumb">
        <Icon name="grid" size={16} />
      </div>
      <div className="widget-name">
        <div className="widget-name-top">{t.label}</div>
        <div className="widget-name-sub">
          <Icon name="globe" size={11} />
          {primaryOrigin(t)} - {t.entities.length} {t.entities.length === 1 ? "entity" : "entities"}
          {!archived && ` - ${t.active_sessions} live`}
        </div>
      </div>
      <div className="widget-meta widget-hide-sm">
        <span className="widget-meta-num">{t.active_sessions}</span>
        <div className="muted" style={{ fontSize: 11 }}>live</div>
      </div>
      <StatusBadge status={t.status} />
      <div className="widget-actions" onClick={e => e.stopPropagation()}>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => onDuplicate(t)}
          aria-label="Duplicate widget"
          title="Duplicate"
        >
          <Icon name="copy" size={13} />
        </button>
        {archived ? (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => onDelete(t)}
            aria-label="Delete widget"
          >
            <Icon name="trash" size={13} />
          </button>
        ) : (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => onRevoke(t)}
            aria-label="Revoke widget"
            title="Revoke"
          >
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PagingProps {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  label: string;
}

function Paging({ total, page, pageSize, onPage, label }: PagingProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const start = page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="paging row" style={{ padding: "8px 16px" }}>
      <span className="muted" style={{ flex: 1, fontSize: 13 }}>
        {start}-{end} of {total} {label}
      </span>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="btn btn-sm btn-ghost"
      >
        <Icon name="chevLeft" size={13} /> Prev
      </button>
      <span className="muted" style={{ fontSize: 13 }}>
        {page + 1} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        className="btn btn-sm btn-ghost"
      >
        Next <Icon name="chevRight" size={13} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TokenList
// ---------------------------------------------------------------------------

export function TokenList({ onOpenWizard, initialTokenId, onInitialTokenConsumed }: TokenListProps) {
  const [tokens,        setTokens]        = useState<Token[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState<FilterOption>("all");
  const [showArchived,  setShowArchived]  = useState(false);
  const [activePage,    setActivePage]    = useState(0);
  const [archivedPage,  setArchivedPage]  = useState(0);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Token | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Token | null>(null);

  const load = useCallback(() => {
    api.tokens.list().then(setTokens).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Handle initialTokenId: open the token detail and refresh so a newly
  // created token appears without requiring a manual reload.
  useEffect(() => {
    if (initialTokenId) {
      load();
      setSelectedId(initialTokenId);
      onInitialTokenConsumed();
    }
  }, [initialTokenId, onInitialTokenConsumed, load]);

  const filtered = tokens.filter(t => {
    const matchSearch = !search
      || t.label.toLowerCase().includes(search.toLowerCase())
      || primaryOrigin(t).toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.status === filter;
    return matchSearch && matchFilter;
  });

  const active   = filtered.filter(t => !isArchived(t));
  const archived = filtered.filter(t => isArchived(t));

  const activePaged   = active.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  const archivedPaged = archived.slice(archivedPage * PAGE_SIZE, (archivedPage + 1) * PAGE_SIZE);

  const handleRevoke = useCallback(async () => {
    if (!confirmRevoke) return;
    try {
      await api.tokens.revoke(confirmRevoke.token_id);
      setConfirmRevoke(null);
      load();
    } catch (e) { setError(String(e)); }
  }, [confirmRevoke, load]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await api.tokens.delete(confirmDelete.token_id);
      setConfirmDelete(null);
      if (selectedId === confirmDelete.token_id) setSelectedId(null);
      load();
    } catch (e) { setError(String(e)); }
  }, [confirmDelete, load, selectedId]);

  const handleDuplicate = useCallback(async (t: Token) => {
    try {
      const newToken = await api.tokens.create({
        label: `${t.label} (copy)`,
        entities: t.entities,
        origins: t.origins,
        expires: t.expires ?? null,
      });
      load();
      setSelectedId(newToken.token_id);
    } catch (e) { setError(String(e)); }
  }, [load]);

  if (selectedId) {
    return (
      <TokenDetail
        tokenId={selectedId}
        onBack={() => setSelectedId(null)}
        onOpenWizard={onOpenWizard}
        onDeleted={() => { setSelectedId(null); load(); }}
      />
    );
  }

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Toolbar */}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div className="search" style={{ flex: "1 1 280px", maxWidth: 420 }}>
          <Icon name="search" size={15} />
          <input
            className="input"
            type="search"
            placeholder="Search widgets by name or origin..."
            value={search}
            onChange={e => { setSearch(e.target.value); setActivePage(0); }}
            aria-label="Search widgets"
          />
        </div>
        <div className="segmented" role="group" aria-label="Filter by status">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => { setFilter(value); setActivePage(0); }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={() => setShowArchived(s => !s)}>
          <Icon name="clock" size={14} />
          {showArchived ? "Hide" : "Show"} archived
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
          <Spinner size={40} />
        </div>
      ) : active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon="grid"
          title="No widgets yet"
          subtitle="Create your first widget to embed live Home Assistant cards on any webpage."
          action={{ label: "New widget", onClick: onOpenWizard }}
        />
      ) : (
        <>
          {/* Active widgets */}
          {active.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              {activePaged.map(t => (
                <WidgetRow
                  key={t.token_id}
                  token={t}
                  onSelect={() => setSelectedId(t.token_id)}
                  onRevoke={setConfirmRevoke}
                  onDelete={setConfirmDelete}
                  onDuplicate={handleDuplicate}
                  highlighted={t.token_id === initialTokenId}
                />
              ))}
              <Paging
                total={active.length}
                page={activePage}
                pageSize={PAGE_SIZE}
                onPage={setActivePage}
                label="widgets"
              />
            </div>
          )}

          {active.length === 0 && filter !== "all" && (
            <div className="card card-pad muted" style={{ textAlign: "center", fontSize: 13 }}>
              No widgets match this filter.
            </div>
          )}

          {/* Archived section */}
          {showArchived && archived.length > 0 && (
            <div>
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 0 6px" }}
              >
                Archived ({archived.length})
              </div>
              <div className="card" style={{ padding: 0 }}>
                {archivedPaged.map(t => (
                  <WidgetRow
                    key={t.token_id}
                    token={t}
                    onSelect={() => setSelectedId(t.token_id)}
                    onRevoke={setConfirmRevoke}
                    onDelete={setConfirmDelete}
                    onDuplicate={handleDuplicate}
                    highlighted={false}
                  />
                ))}
                <Paging
                  total={archived.length}
                  page={archivedPage}
                  pageSize={PAGE_SIZE}
                  onPage={setArchivedPage}
                  label="archived widgets"
                />
              </div>
            </div>
          )}

          {showArchived && archived.length === 0 && (
            <div className="card card-pad muted" style={{ textAlign: "center", fontSize: 13 }}>
              No archived widgets.
            </div>
          )}
        </>
      )}

      {confirmRevoke && (
        <ConfirmDialog
          title="Revoke widget"
          message={`Revoking "${confirmRevoke.label}" will immediately terminate all active sessions. This cannot be undone.`}
          confirmLabel="Revoke"
          confirmDestructive
          onConfirm={handleRevoke}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete widget"
          message={`Delete "${confirmDelete.label}" and all its activity log entries permanently?`}
          confirmLabel="Delete"
          confirmDestructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
