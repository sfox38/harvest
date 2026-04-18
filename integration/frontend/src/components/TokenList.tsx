/**
 * TokenList.tsx - Widgets (tokens) list screen.
 *
 * Grid card view by default; toggleable to list rows. Search and segmented
 * status filter. Clicking a card/row opens TokenDetail.
 */

import { useState, useEffect, useCallback } from "react";
import type { Token, TokenStatus } from "../types";
import { api } from "../api";
import { StatusBadge, EmptyState, Spinner, ErrorBanner } from "./Shared";
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
  { value: "inactive",      label: "Paused"   },
];

const ARCHIVED_STATUSES: TokenStatus[] = ["expired", "revoked"];

function isArchived(t: Token): boolean {
  return ARCHIVED_STATUSES.includes(t.status);
}

function primaryOrigin(t: Token): string {
  if (t.origins.allow_any) return "any website";
  if (t.origins.allowed.length > 0) return t.origins.allowed[0];
  return "no origin set";
}

// ---------------------------------------------------------------------------
// WidgetCard (grid view)
// ---------------------------------------------------------------------------

function WidgetCard({ token: t, onSelect }: { token: Token; onSelect: () => void }) {
  const archived = isArchived(t);
  const origin = primaryOrigin(t);
  const entityLabel = t.entities.length === 1 ? "1 entity" : `${t.entities.length} entities`;

  return (
    <div
      className={`wcard${archived ? " wcard-archived" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      aria-label={`Open widget ${t.label}`}
    >
      <div className="wcard-top">
        <div className="widget-thumb">
          <Icon name="grid" size={17} />
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="wcard-body">
        <div className="wcard-name">{t.label}</div>
        <div className="wcard-domain">
          <Icon name="globe" size={11} />
          {origin}
        </div>
      </div>
      <div className="wcard-footer">
        <span className="muted">{entityLabel}</span>
        <div className="row" style={{ gap: 10 }}>
          <span>
            <span className="wcard-footer-num">{t.active_sessions}</span>
            <span className="muted"> live</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WidgetRow (list view)
// ---------------------------------------------------------------------------

function WidgetRow({ token: t, onSelect, highlighted }: {
  token: Token;
  onSelect: () => void;
  highlighted: boolean;
}) {
  const archived = isArchived(t);

  return (
    <div
      className={`widget-row${highlighted ? " widget-row-highlighted" : ""}`}
      style={{ opacity: archived ? 0.75 : 1 }}
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
        </div>
      </div>
      <div className="widget-meta widget-hide-sm">
        <span className="widget-meta-num">{t.active_sessions}</span>
        <div className="muted" style={{ fontSize: 11 }}>live</div>
      </div>
      <StatusBadge status={t.status} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TokenList
// ---------------------------------------------------------------------------

export function TokenList({ onOpenWizard, initialTokenId, onInitialTokenConsumed }: TokenListProps) {
  const [tokens,       setTokens]       = useState<Token[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<FilterOption>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid");

  const load = useCallback(() => {
    api.tokens.list().then(setTokens).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <div className="search" style={{ flex: "1 1 240px", maxWidth: 400 }}>
          <Icon name="search" size={15} />
          <input
            className="input"
            type="search"
            placeholder="Search widgets by name or origin..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search widgets"
          />
        </div>
        <div className="segmented" role="group" aria-label="Filter by status">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={() => setShowArchived(s => !s)}>
          <Icon name="clock" size={14} />
          {showArchived ? "Hide" : "Show"} archived
        </button>
        <button
          className="icon-btn"
          onClick={() => setViewMode(m => m === "grid" ? "list" : "grid")}
          aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
          title={viewMode === "grid" ? "List view" : "Grid view"}
        >
          <Icon name={viewMode === "grid" ? "list" : "grid"} size={15} />
        </button>
        <button className="btn btn-primary" onClick={onOpenWizard}>
          <Icon name="plus" size={14} />
          <span className="btn-label-sm">New widget</span>
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
            viewMode === "grid" ? (
              <div className="widgets-grid">
                {active.map(t => (
                  <WidgetCard
                    key={t.token_id}
                    token={t}
                    onSelect={() => setSelectedId(t.token_id)}
                  />
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                {active.map(t => (
                  <WidgetRow
                    key={t.token_id}
                    token={t}
                    onSelect={() => setSelectedId(t.token_id)}
                    highlighted={t.token_id === initialTokenId}
                  />
                ))}
              </div>
            )
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
              {viewMode === "grid" ? (
                <div className="widgets-grid">
                  {archived.map(t => (
                    <WidgetCard key={t.token_id} token={t} onSelect={() => setSelectedId(t.token_id)} />
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: 0 }}>
                  {archived.map(t => (
                    <WidgetRow key={t.token_id} token={t} onSelect={() => setSelectedId(t.token_id)} highlighted={false} />
                  ))}
                </div>
              )}
            </div>
          )}

          {showArchived && archived.length === 0 && (
            <div className="card card-pad muted" style={{ textAlign: "center", fontSize: 13 }}>
              No archived widgets.
            </div>
          )}
        </>
      )}
    </div>
  );
}
