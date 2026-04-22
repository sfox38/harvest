/**
 * Actions.tsx - Manage harvest_action virtual entities.
 *
 * Lists all defined actions, provides create/delete operations.
 * Each action maps to a harvest_action.{slug} entity that the widget
 * renders as a single trigger button.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { HarvestAction, ServiceCallDef } from "../types";
import type { HAEntity } from "../types";
import { api } from "../api";
import { Card, ConfirmDialog, Spinner, EmptyState, ErrorBanner, fmtRel } from "./Shared";
import { Icon } from "./Icon";
import { loadEntityCache } from "../entityCache";

// ---------------------------------------------------------------------------
// ActionRow
// ---------------------------------------------------------------------------

interface ActionRowProps {
  action: HarvestAction;
  onDelete: () => void;
}

function ActionRow({ action, onDelete }: ActionRowProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(o => !o);
  const entityId = `harvest_action.${action.action_id}`;

  return (
    <div
      className={`session-row${open ? " open" : ""}`}
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
    >
      <div className="session-row-top" onClick={toggle}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-weak)", color: "var(--accent-strong)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name="play" size={12} />
        </div>

        <div className="sess-col" style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{action.label}</div>
          <div className="muted mono" style={{ fontSize: 11 }}>{entityId}</div>
        </div>

        <div className="sess-col muted" style={{ fontSize: 12 }}>
          {action.service_calls.length} service call{action.service_calls.length !== 1 ? "s" : ""}
        </div>

        <div className="sess-col muted" style={{ fontSize: 12 }}>
          {action.created_at ? fmtRel(action.created_at) : "-"}
        </div>

        <div className="event-caret" style={{ margin: 0 }}>
          <Icon name={open ? "chevUp" : "chevDown"} size={14} />
        </div>

        <button
          className="btn btn-sm btn-danger"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete action ${action.label}`}
        >
          Delete
        </button>
      </div>

      {open && (
        <div className="event-details" onClick={e => e.stopPropagation()}>
          <dl className="kv-compact">
            <dt>Action ID</dt><dd className="mono">{action.action_id}</dd>
            <dt>Entity ID</dt><dd className="mono">{entityId}</dd>
            <dt>Icon</dt><dd className="mono">{action.icon}</dd>
            <dt>Created</dt><dd>{action.created_at ? new Date(action.created_at).toLocaleString() : "-"}</dd>
          </dl>
          {action.service_calls.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Service calls</div>
              {action.service_calls.map((sc, i) => (
                <div key={i} className="mono" style={{ fontSize: 11, padding: "2px 0" }}>
                  {sc.domain}.{sc.service}
                  {Object.keys(sc.data).length > 0 && (
                    <span className="muted"> - {JSON.stringify(sc.data)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

function DomainEntityPicker({ domain, onSelect, placeholder }: DomainEntityPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [entities, setEntities] = useState<HAEntity[]>([]);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
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
    if (open && matches.length > 0 && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
    } else {
      setDropdownRect(null);
    }
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
        onFocus={() => setOpen(true)}
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
          style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
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
// CreateActionForm
// ---------------------------------------------------------------------------

type ActionType = "script" | "automation" | "custom";

const TYPE_META: Record<ActionType, { label: string; desc: string; icon: string; domain: string }> = {
  script:     { label: "Run a script",          desc: "Pick a script entity. The button fires it.",                           icon: "mdi:script-text",  domain: "script" },
  automation: { label: "Trigger an automation",  desc: "Pick an automation entity. The button triggers it.",                   icon: "mdi:robot",        domain: "automation" },
  custom:     { label: "Custom service call",    desc: "For advanced users. Specify the HA domain, service, and data directly.", icon: "mdi:play-circle",  domain: "" },
};

interface CreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

const EMPTY_SC: ServiceCallDef = { domain: "", service: "", data: {} };

function CreateActionForm({ onCreated, onCancel }: CreateFormProps) {
  const [actionType, setActionType] = useState<ActionType>("script");
  const [label, setLabel]           = useState("");
  const [labelAutoset, setLabelAutoset] = useState(true);
  const [icon, setIcon]             = useState(TYPE_META.script.icon);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [calls, setCalls]           = useState<ServiceCallDef[]>([{ ...EMPTY_SC }]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

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
      await api.actions.create({
        label: label.trim(),
        icon,
        service_calls: buildServiceCalls(),
      });
      onCreated();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="New action">
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
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>MDI icon name shown on the widget button.</div>
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
          {saving ? "Creating..." : "Create action"}
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Actions (main screen)
// ---------------------------------------------------------------------------

export function Actions() {
  const [actions, setActions] = useState<HarvestAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HarvestAction | null>(null);

  const load = useCallback(() => {
    api.actions.list()
      .then(setActions)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.actions.delete(deleteTarget.action_id);
    } catch (e) { setError(String(e)); }
    setDeleteTarget(null);
    load();
    loadEntityCache();
  };

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="row" style={{ gap: 8 }}>
        <span className="muted" style={{ fontSize: 14, flex: 1 }}>
          {actions.length} action{actions.length !== 1 ? "s" : ""} defined
        </span>
        <button onClick={() => setCreating(true)} className="btn btn-primary btn-sm">
          <Icon name="plus" size={14} /> New action
        </button>
      </div>

      {creating && (
        <CreateActionForm
          onCreated={() => { setCreating(false); load(); loadEntityCache(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Spinner size={36} />
        </div>
      ) : actions.length === 0 && !creating ? (
        <EmptyState
          icon="play"
          title="No actions defined"
          subtitle="Actions add trigger buttons to your widget for things that don't have a card - like running scripts, triggering automations, or firing custom service calls."
          action={{ label: "Create an action", onClick: () => setCreating(true) }}
        />
      ) : (
        <Card pad={false}>
          {actions.map(a => (
            <ActionRow
              key={a.action_id}
              action={a}
              onDelete={() => setDeleteTarget(a)}
            />
          ))}
        </Card>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete action"
          message={`Delete "${deleteTarget.label}"? Any widgets using harvest_action.${deleteTarget.action_id} will stop working.`}
          confirmLabel="Delete"
          confirmDestructive
          onConfirm={doDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
