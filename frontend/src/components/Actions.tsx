/**
 * Actions.tsx - Manage harvest_action virtual entities.
 *
 * Lists all defined actions with search and row/card toggle.
 * Clicking an action opens the Action Editor (same form as create,
 * pre-filled). Delete is inside the editor, not on the list row.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { HarvestAction, ServiceCallDef } from "../types";
import type { HAEntity } from "../types";
import { api } from "../api";
import { Card, ConfirmDialog, Spinner, EmptyState, ErrorBanner, fmtRel } from "./Shared";
import { Icon } from "./Icon";
import { loadEntityCache } from "../entityCache";

// ---------------------------------------------------------------------------
// ActionCard (grid view)
// ---------------------------------------------------------------------------

function ActionCard({ action, onSelect }: { action: HarvestAction; onSelect: () => void }) {
  const entityId = `harvest_action.${action.action_id}`;
  return (
    <div
      className="wcard"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      aria-label={`Edit action ${action.label}`}
    >
      <div className="wcard-top">
        <div className="widget-thumb">
          <Icon name="play" size={17} />
        </div>
        <span className="muted" style={{ fontSize: 11 }}>
          {action.service_calls.length} call{action.service_calls.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="wcard-body">
        <div className="wcard-name">{action.label}</div>
        <div className="wcard-domain">
          <Icon name="plug" size={11} />
          {entityId}
        </div>
      </div>
      <div className="wcard-footer">
        <span className="muted">{action.created_at ? fmtRel(action.created_at) : "-"}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionRow (list view)
// ---------------------------------------------------------------------------

function ActionRow({ action, onSelect }: { action: HarvestAction; onSelect: () => void }) {
  const entityId = `harvest_action.${action.action_id}`;
  return (
    <div
      className="widget-row"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      aria-label={`Edit action ${action.label}`}
    >
      <div className="widget-thumb">
        <Icon name="play" size={16} />
      </div>
      <div className="widget-name">
        <div className="widget-name-top">{action.label}</div>
        <div className="widget-name-sub">
          <Icon name="plug" size={11} />
          {entityId}
        </div>
      </div>
      <div className="widget-meta widget-hide-sm">
        <span className="widget-meta-num">{action.service_calls.length}</span>
        <div className="muted" style={{ fontSize: 11 }}>call{action.service_calls.length !== 1 ? "s" : ""}</div>
      </div>
      <span className="muted" style={{ fontSize: 12 }}>
        {action.created_at ? fmtRel(action.created_at) : "-"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DomainEntityPicker - simple autocomplete filtered to a single domain
// ---------------------------------------------------------------------------

interface DomainEntityPickerProps {
  domain: string;
  onSelect: (entityId: string, friendlyName: string) => void;
  placeholder?: string;
}

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

function DomainEntityPicker({ domain, onSelect, placeholder }: DomainEntityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.ha.statesByDomain(domain).then(setEntities).catch(() => {});
  }, [domain]);

  const matches = useMemo<HAEntity[]>(() => {
    if (!query.trim()) return entities.slice(0, 8);
    const q = query.toLowerCase();
    return entities
      .filter(e =>
        e.entity_id.toLowerCase().includes(q) || e.friendly_name.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, entities]);

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

  const select = (e: HAEntity) => {
    onSelect(e.entity_id, e.friendly_name);
    setQuery("");
    setOpen(false);
  };

  return (
    <div>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => {
          setOpen(true);
          setTimeout(() => scrollInputToTopOnMobile(inputRef.current), 320);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") { setHighlighted(h => Math.min(h + 1, matches.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setHighlighted(h => Math.max(h - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter") { select(matches[highlighted]); e.preventDefault(); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder={placeholder}
        className="input"
        style={{ width: "100%", boxSizing: "border-box" }}
        aria-label={`Search ${domain} entities`}
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
              onMouseDown={() => select(e)}
              onMouseEnter={() => setHighlighted(i)}
              className={`autocomplete-item${i === highlighted ? " highlighted" : ""}`}
              role="option"
              aria-selected={i === highlighted}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.friendly_name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{e.entity_id}</div>
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
// ActionEditor - shared form for create and edit
// ---------------------------------------------------------------------------

type ActionType = "script" | "automation" | "custom";

const TYPE_META: Record<ActionType, { label: string; desc: string; icon: string; domain: string }> = {
  script:     { label: "Run a script",          desc: "Pick a script entity. The button fires it.",                           icon: "mdi:script-text",  domain: "script" },
  automation: { label: "Trigger an automation",  desc: "Pick an automation entity. The button triggers it.",                   icon: "mdi:robot",        domain: "automation" },
  custom:     { label: "Custom service call",    desc: "For advanced users. Specify the HA domain, service, and data directly.", icon: "mdi:play-circle",  domain: "" },
};

function inferActionType(action: HarvestAction): ActionType {
  if (action.service_calls.length === 1) {
    const sc = action.service_calls[0];
    if (sc.domain === "script") return "script";
    if (sc.domain === "automation" && sc.service === "trigger") return "automation";
  }
  return "custom";
}

function inferSelectedEntity(action: HarvestAction, type: ActionType): string | null {
  if (type === "script" && action.service_calls.length === 1) {
    return `script.${action.service_calls[0].service}`;
  }
  if (type === "automation" && action.service_calls.length === 1) {
    const data = action.service_calls[0].data as Record<string, unknown>;
    return (data.entity_id as string) ?? null;
  }
  return null;
}

interface ActionEditorProps {
  existing: HarvestAction | null;
  onSaved: () => void;
  onCancel: () => void;
  onDeleted?: () => void;
}

const EMPTY_SC: ServiceCallDef = { domain: "", service: "", data: {} };

function ActionEditor({ existing, onSaved, onCancel, onDeleted }: ActionEditorProps) {
  const isEdit = existing !== null;
  const initialType = existing ? inferActionType(existing) : "script";

  const [actionType, setActionType] = useState<ActionType>(initialType);
  const [label, setLabel]           = useState(existing?.label ?? "");
  const [labelAutoset, setLabelAutoset] = useState(!isEdit);
  const [icon, setIcon]             = useState(existing?.icon ?? TYPE_META.script.icon);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(
    existing ? inferSelectedEntity(existing, initialType) : null
  );
  const [calls, setCalls]           = useState<ServiceCallDef[]>(
    existing && initialType === "custom"
      ? existing.service_calls.map(sc => ({ ...sc }))
      : [{ ...EMPTY_SC }]
  );
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState(false);

  const switchType = (t: ActionType) => {
    setActionType(t);
    setIcon(TYPE_META[t].icon);
    setSelectedEntity(null);
    setCalls([{ ...EMPTY_SC }]);
    if (labelAutoset) setLabel("");
  };

  const handleEntitySelect = (entityId: string, friendlyName: string) => {
    setSelectedEntity(entityId);
    if (labelAutoset) {
      setLabel(friendlyName !== entityId ? friendlyName : entityId.split(".").pop() ?? entityId);
    }
  };

  const updateCall = (idx: number, field: keyof ServiceCallDef, value: string) => {
    setCalls(prev => prev.map((sc, i) => {
      if (i !== idx) return sc;
      if (field === "data") {
        try { return { ...sc, data: JSON.parse(value || "{}") }; }
        catch { return sc; }
      }
      return { ...sc, [field]: value };
    }));
  };

  const addCall = () => setCalls(prev => [...prev, { ...EMPTY_SC }]);
  const removeCall = (idx: number) => setCalls(prev => prev.filter((_, i) => i !== idx));

  const buildServiceCalls = (): ServiceCallDef[] => {
    if (actionType === "script" && selectedEntity) {
      const objectId = selectedEntity.split(".").slice(1).join(".");
      return [{ domain: "script", service: objectId, data: {} }];
    }
    if (actionType === "automation" && selectedEntity) {
      return [{ domain: "automation", service: "trigger", data: { entity_id: selectedEntity } }];
    }
    return calls;
  };

  const canSubmit = (): boolean => {
    if (!label.trim()) return false;
    if (actionType === "custom") {
      return calls.length > 0 && calls.every(sc => sc.domain.trim() && sc.service.trim());
    }
    return selectedEntity !== null;
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        label: label.trim(),
        icon,
        service_calls: buildServiceCalls(),
      };
      if (isEdit) {
        await api.actions.update(existing.action_id, payload);
      } else {
        await api.actions.create(payload);
      }
      onSaved();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!existing) return;
    try {
      await api.actions.delete(existing.action_id);
      onDeleted?.();
    } catch (e) {
      setError(String(e));
    }
    setDeleteTarget(false);
  };

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {/* Top bar: back */}
      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          <Icon name="chevLeft" size={14} /> Back
        </button>
      </div>

      <Card
        title={isEdit ? "Edit action" : "New action"}
        action={isEdit ? (
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setDeleteTarget(true)}
          >
            <Icon name="trash" size={14} /> Delete
          </button>
        ) : undefined}
      >
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="col" style={{ gap: 14 }}>
          {/* Action type selector */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              What should this button do?
            </div>
            <div className="col" style={{ gap: 6 }}>
              {(Object.keys(TYPE_META) as ActionType[]).map(t => (
                <label
                  key={t}
                  className={`choice${actionType === t ? " choice-selected" : ""}`}
                  style={{ padding: "8px 12px" }}
                >
                  <input
                    type="radio"
                    name="action-type"
                    value={t}
                    checked={actionType === t}
                    onChange={() => switchType(t)}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{TYPE_META[t].label}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{TYPE_META[t].desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Entity picker for script / automation */}
          {actionType !== "custom" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {actionType === "script" ? "Script" : "Automation"}
              </div>
              {selectedEntity ? (
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span className="mono" style={{ flex: 1, fontSize: 13 }}>{selectedEntity}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setSelectedEntity(null); if (labelAutoset) setLabel(""); }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <DomainEntityPicker
                  domain={TYPE_META[actionType].domain}
                  onSelect={handleEntitySelect}
                  placeholder={actionType === "script"
                    ? "Search scripts..."
                    : "Search automations..."}
                />
              )}
            </div>
          )}

          {/* Raw service calls for custom mode */}
          {actionType === "custom" && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Service calls
              </div>
              {calls.map((sc, i) => (
                <div key={i} className="row" style={{ gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="domain"
                    value={sc.domain}
                    onChange={e => updateCall(i, "domain", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="service"
                    value={sc.service}
                    onChange={e => updateCall(i, "service", e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder='data JSON'
                    defaultValue={Object.keys(sc.data).length > 0 ? JSON.stringify(sc.data) : ""}
                    onBlur={e => updateCall(i, "data", e.target.value)}
                    style={{ flex: 2 }}
                  />
                  {calls.length > 1 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeCall(i)}
                      aria-label="Remove service call"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={addCall} style={{ marginTop: 4 }}>
                <Icon name="plus" size={14} /> Add service call
              </button>
            </div>
          )}

          {/* Label */}
          <div className="kv" style={{ paddingBottom: 0 }}>
            <dt>Button label</dt>
            <dd>
              <input
                type="text"
                className="input"
                placeholder="e.g. Welcome Home"
                value={label}
                onChange={e => { setLabel(e.target.value); setLabelAutoset(false); }}
                maxLength={100}
                style={{ width: "100%" }}
              />
            </dd>
          </div>

          {/* Icon */}
          <div className="kv" style={{ paddingBottom: 0 }}>
            <dt>Icon</dt>
            <dd>
              <input
                type="text"
                className="input"
                placeholder="mdi:play-circle"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                style={{ width: "100%" }}
              />
              <div className="settings-field-hint">MDI icon name shown on the widget button.</div>
            </dd>
          </div>
        </div>

        <div className="dialog-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!canSubmit() || saving}
          >
            {saving
              ? (isEdit ? "Saving..." : "Creating...")
              : (isEdit ? "Save and close" : "Create action")}
          </button>
        </div>
      </Card>

      {deleteTarget && existing && (
        <ConfirmDialog
          title="Delete action"
          message={`Delete "${existing.label}"? Any widgets using harvest_action.${existing.action_id} will stop working.`}
          confirmLabel="Delete"
          confirmDestructive
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Actions (main screen)
// ---------------------------------------------------------------------------

export function Actions() {
  const [actions, setActions]     = useState<HarvestAction[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [viewMode, setViewMode]   = useState<"grid" | "list">(() => {
    try { return localStorage.getItem("hrv_action_view") === "list" ? "list" : "grid"; }
    catch { return "grid"; }
  });
  const [editing, setEditing]     = useState<HarvestAction | null>(null);
  const [creating, setCreating]   = useState(false);

  const load = useCallback(() => {
    api.actions.list()
      .then(setActions)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return actions;
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return actions.filter(a => {
      const hay = `${a.label} harvest_action.${a.action_id}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
  }, [actions, search]);

  // Show editor when creating or editing
  if (creating) {
    return (
      <ActionEditor
        existing={null}
        onSaved={() => { setCreating(false); load(); loadEntityCache(); }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  if (editing) {
    return (
      <ActionEditor
        existing={editing}
        onSaved={() => { setEditing(null); load(); loadEntityCache(); }}
        onCancel={() => setEditing(null)}
        onDeleted={() => { setEditing(null); load(); loadEntityCache(); }}
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
            placeholder="Search actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search actions"
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="icon-btn"
          onClick={() => {
            const next = viewMode === "grid" ? "list" : "grid";
            setViewMode(next);
            try { localStorage.setItem("hrv_action_view", next); } catch {}
          }}
          aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
          title={viewMode === "grid" ? "List view" : "Grid view"}
        >
          <Icon name={viewMode === "grid" ? "list" : "grid"} size={15} />
        </button>
        <button onClick={() => setCreating(true)} className="btn btn-primary">
          <Icon name="plus" size={14} />
          <span className="btn-label-sm">New action</span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
          <Spinner size={40} />
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState
          icon="play"
          title="No actions defined"
          subtitle="Actions add trigger buttons to your widget for things that don't have a card - like running scripts, triggering automations, or firing custom service calls."
          action={{ label: "Create an action", onClick: () => setCreating(true) }}
        />
      ) : filtered.length === 0 ? (
        <div className="card card-info card-pad muted" style={{ textAlign: "center", fontSize: 13 }}>
          No actions match your search.
        </div>
      ) : viewMode === "grid" ? (
        <div className="widgets-grid">
          {filtered.map(a => (
            <ActionCard
              key={a.action_id}
              action={a}
              onSelect={() => setEditing(a)}
            />
          ))}
        </div>
      ) : (
        <div className="card card-info" style={{ padding: 0 }}>
          {filtered.map(a => (
            <ActionRow
              key={a.action_id}
              action={a}
              onSelect={() => setEditing(a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
