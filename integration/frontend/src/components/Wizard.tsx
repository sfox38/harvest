/**
 * Wizard.tsx - Six-step widget creation wizard (centered modal).
 *
 * Steps: Entities, Permissions, Origin, Expiry, Appearance, Done.
 * Aliases are generated at entity selection time (Step 1).
 * Preview tokens are created at Step 5 and revoked on wizard close.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Token, EntityAccess } from "../types";
import { api } from "../api";
import { CopyablePre, CopyButton, Spinner, ErrorBanner, ConfirmDialog } from "./Shared";
import { Icon } from "./Icon";
import { getEntityCache, loadEntityCache } from "../entityCache";
import { loadKnownOrigins, addKnownOrigin, removeKnownOrigin, validateOriginUrl, displayOriginLabel } from "./originMemory";
import type { HAEntity } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardMemory {
  capability: "read" | "read-write";
  expiryOption: string;
  themeUrl: string;
  originUrls: string[];
}

function loadMemory(): WizardMemory {
  try { return JSON.parse(localStorage.getItem("hrv_wizard_memory") ?? "{}"); }
  catch { return {} as WizardMemory; }
}

function saveMemory(m: Partial<WizardMemory>) {
  try {
    const existing = loadMemory();
    localStorage.setItem("hrv_wizard_memory", JSON.stringify({ ...existing, ...m }));
  } catch { /* ignore */ }
}

interface SelectedEntity {
  entity_id: string;
  alias: string | null;
  companions: { entity_id: string; alias: string | null }[];
}

interface WizardState {
  mode: "single" | "group";
  entities: SelectedEntity[];
  capability: "read" | "read-write";
  originMode: "specific" | "any";
  originUrls: string[];
  expiryOption: "never" | "30d" | "90d" | "1y" | "custom";
  expiryCustomDate: string;
  themeUrl: string;
  useHmac: boolean;
  tokenSecret: string | null;
  generatedToken: Token | null;
  previewTokenId: string | null;
}

interface WizardProps {
  onClose: (newTokenId?: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6;
const WIDGET_SCRIPT = `<script src="https://cdn.jsdelivr.net/gh/sfox38/harvest@latest/widget/dist/harvest.min.js"></script>`;
const STEP_LABELS = ["Entities", "Permissions", "Origin", "Expiry", "Appearance", "Done"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitOriginUrl(url: string): { origin: string; path: string | null } {
  try {
    const u = new URL(url);
    const path = (u.pathname && u.pathname !== "/") ? u.pathname : null;
    return { origin: u.origin, path };
  } catch { return { origin: url, path: null }; }
}

function expiresAt(option: string, customDate: string): string | null {
  if (option === "never") return null;
  if (option === "custom") return customDate ? new Date(customDate).toISOString() : null;
  const days = option === "30d" ? 30 : option === "90d" ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function fmtExpiry(option: string): string {
  if (option === "never" || option === "custom") return "";
  const days = option === "30d" ? 30 : option === "90d" ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `until ${d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function buildCardSnippet(token: Token, useAliases: boolean, haUrl: string): string {
  const attrs = `ha-url="${haUrl}" token="${token.token_id}"`;
  const cards = token.entities.map((e: EntityAccess) => {
    const entityAttr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
    return `  <hrv-card ${entityAttr}></hrv-card>`;
  });
  const isGroup = token.entities.length > 1;
  if (isGroup) return `<hrv-group ${attrs}>\n${cards.join("\n")}\n</hrv-group>`;
  const entityAttr = useAliases && token.entities[0]?.alias
    ? `alias="${token.entities[0].alias}"`
    : `entity="${token.entities[0]?.entity_id ?? ""}"`;
  return `<hrv-card ${attrs} ${entityAttr}></hrv-card>`;
}

function buildWordPressSnippet(token: Token, useAliases: boolean, haUrl: string): string {
  const groupAttrs = `data-ha-url="${haUrl}" data-token="${token.token_id}"`;
  const cards = token.entities.map((e: EntityAccess) => {
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

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="stepper">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const state = stepNum < current ? "done" : stepNum === current ? "active" : "pending";
        return (
          <React.Fragment key={label}>
            <div className="step" data-state={state}>
              <span className="step-num">
                {state === "done" ? <Icon name="check" size={11} /> : stepNum}
              </span>
              <span className="step-label">{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="step-line" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntityAutocomplete
// ---------------------------------------------------------------------------

interface EntityAutocompleteProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (entityId: string) => void;
  disabled?: boolean;
}

function EntityAutocomplete({ value, onChange, onSelect, disabled }: EntityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo<HAEntity[]>(() => {
    if (!value.trim()) return [];
    const q = value.toLowerCase();
    return getEntityCache()
      .filter(e => e.entity_id.toLowerCase().includes(q) || e.friendly_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [value]);

  useEffect(() => { setHighlighted(0); }, [matches.length]);

  useEffect(() => {
    if (open && matches.length > 0 && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
    } else {
      setDropdownRect(null);
    }
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
        onFocus={() => setOpen(true)}
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
        placeholder="Search entity ID or friendly name..."
        className="input"
        style={{ width: "100%", boxSizing: "border-box" }}
        aria-label="Search entities"
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
// Step 1: Pick entities
// ---------------------------------------------------------------------------

function Step1({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
  const [entityInput, setEntityInput] = useState("");
  const [loadingAlias, setLoadingAlias] = useState<string | null>(null);

  useEffect(() => {
    if (getEntityCache().length === 0) loadEntityCache();
  }, []);

  const selectEntity = async (entityId: string) => {
    if (state.entities.some(e => e.entity_id === entityId)) return;
    setLoadingAlias(entityId);
    let alias: string | null = null;
    try {
      const result = await api.tokens.generateAlias(entityId);
      alias = result.alias;
    } catch { /* alias stays null */ }
    finally { setLoadingAlias(null); }

    const entry: SelectedEntity = { entity_id: entityId, alias, companions: [] };
    if (state.mode === "single") {
      onChange({ entities: [entry] });
    } else {
      onChange({ entities: [...state.entities, entry] });
    }
  };

  const removeEntity = (entityId: string) => {
    onChange({ entities: state.entities.filter(e => e.entity_id !== entityId) });
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="segmented" role="group">
        {(["single", "group"] as const).map(m => (
          <button key={m} aria-pressed={state.mode === m} onClick={() => onChange({ mode: m, entities: [] })}>
            {m === "single" ? "Single card" : "Group of cards"}
          </button>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 13 }}>
        Enter entity IDs from your Home Assistant instance.
        {state.mode === "group" ? " Add multiple entities for a group widget." : ""}
      </p>

      <EntityAutocomplete
        value={entityInput}
        onChange={setEntityInput}
        onSelect={id => { selectEntity(id); setEntityInput(""); }}
        disabled={loadingAlias !== null}
      />

      {loadingAlias && (
        <div className="row muted" style={{ gap: 8, fontSize: 12 }}>
          <Spinner size={14} /> Generating alias for {loadingAlias}...
        </div>
      )}

      {state.entities.length > 0 && (
        <div className="col" style={{ gap: 6 }}>
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            Selected ({state.entities.length}):
          </div>
          {state.entities.map(e => (
            <div key={e.entity_id} className="chip" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{e.entity_id}</span>
              {e.alias && (
                <span className="muted" style={{ fontSize: 11 }}>alias: {e.alias}</span>
              )}
              <button
                onClick={() => removeEntity(e.entity_id)}
                className="btn btn-sm btn-ghost"
                style={{ padding: "1px 4px" }}
                aria-label={`Remove ${e.entity_id}`}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {state.entities.length === 0 && (
        <p className="muted" style={{ fontSize: 12 }}>
          No entities selected yet. Add at least one to continue.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Permissions
// ---------------------------------------------------------------------------

function Step2({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
  return (
    <div className="col" style={{ gap: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 600 }}>What can visitors do with this widget?</p>
      {([
        { value: "read"       as const, label: "View only",        desc: "Visitors can see the current state but cannot control devices." },
        { value: "read-write" as const, label: "View and control",  desc: "Visitors can see the state and send commands, such as toggling a light." },
      ]).map(({ value, label, desc }) => (
        <label
          key={value}
          className={`choice${state.capability === value ? " choice-selected" : ""}`}
        >
          <input
            type="radio"
            name="capability"
            value={value}
            checked={state.capability === value}
            onChange={() => { onChange({ capability: value }); saveMemory({ capability: value }); }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{desc}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Origin
// ---------------------------------------------------------------------------

const ORIGIN_CUSTOM = "__custom__";

function Step3({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
  const [knownOrigins,   setKnownOrigins]   = useState<string[]>(loadKnownOrigins);
  const [usingCustom,    setUsingCustom]    = useState(false);
  const [customInput,    setCustomInput]    = useState("");
  const [dropdownSel,    setDropdownSel]    = useState("");
  const [urlError,       setUrlError]       = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<{ url: string; newOrigin: string; path: string | null } | null>(null);
  const showWarning = state.originMode === "any" && state.capability === "read-write";

  const originUrls = state.originUrls;
  const baseOrigin = originUrls.length > 0 ? (() => { try { return new URL(originUrls[0]).origin; } catch { return ""; } })() : "";
  const dropdownItems = knownOrigins.filter(o => {
    if (originUrls.includes(o)) return false;
    if (!baseOrigin) return true;
    try { return new URL(o).origin === baseOrigin; } catch { return false; }
  });
  const hasDropdown = dropdownItems.length > 0;

  const applyUrl = (url: string, newOrigin: string, path: string | null) => {
    const differentHost = !!baseOrigin && baseOrigin !== newOrigin;
    const newList = differentHost
      ? [url]
      : [...originUrls.filter(u => u !== url), url];
    onChange({ originUrls: newList });
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
    if (!trimmed) return;
    const err = validateOriginUrl(trimmed);
    if (err) { setUrlError(err); return; }
    setUrlError(null);
    const u = new URL(trimmed);
    const newOrigin = u.origin;
    const path = (u.pathname && u.pathname !== "/") ? u.pathname : null;
    // Strip query string and fragment - only origin+path are used for matching.
    const normalized = path ? `${newOrigin}${path}` : newOrigin;
    if (baseOrigin && baseOrigin !== newOrigin && originUrls.length > 0) {
      setPendingReplace({ url: normalized, newOrigin, path });
      return;
    }
    applyUrl(normalized, newOrigin, path);
  };

  const removeUrl = (url: string) => {
    onChange({ originUrls: originUrls.filter(u => u !== url) });
  };

  const handleDeleteFromDropdown = () => {
    removeKnownOrigin(dropdownSel);
    setKnownOrigins(loadKnownOrigins());
    setDropdownSel("");
  };

  return (
    <div className="col" style={{ gap: 14 }}>
      <p style={{ fontSize: 14, fontWeight: 600 }}>Where will this widget appear?</p>

      <label className={`choice${state.originMode === "specific" ? " choice-selected" : ""}`}>
        <input
          type="radio" name="originMode" value="specific"
          checked={state.originMode === "specific"}
          onChange={() => onChange({ originMode: "specific" })}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>A specific website or page</div>
          {state.originMode === "specific" && (
            <div className="col" style={{ gap: 8, marginTop: 10 }}>

              {/* Added URLs list */}
              {originUrls.map(url => (
                <div key={url} className="row" style={{ gap: 6, fontSize: 13 }}>
                  <span style={{ flex: 1 }} className="mono url-clip">{url}</span>
                  <button type="button" onClick={() => removeUrl(url)} className="btn btn-sm btn-danger">Remove</button>
                </div>
              ))}

              {/* Dropdown row */}
              {hasDropdown && (
                <div className="row" style={{ gap: 6 }}>
                  <select
                    value={usingCustom ? ORIGIN_CUSTOM : dropdownSel}
                    onChange={e => {
                      if (e.target.value === ORIGIN_CUSTOM) { setUsingCustom(true); setDropdownSel(""); }
                      else { setDropdownSel(e.target.value); setUsingCustom(false); }
                    }}
                    className="input"
                    style={{ flex: 1, fontSize: 13 }}
                  >
                    <option value="">Select a URL...</option>
                    {dropdownItems.map(o => <option key={o} value={o}>{displayOriginLabel(o)}</option>)}
                    <option value={ORIGIN_CUSTOM}>Enter a new URL...</option>
                  </select>
                  {dropdownSel && !usingCustom && (
                    <>
                      <button type="button" onClick={() => addUrl(dropdownSel)} className="btn btn-sm">Add URL</button>
                      <button type="button" onClick={handleDeleteFromDropdown} className="btn btn-sm btn-danger">Delete URL</button>
                    </>
                  )}
                </div>
              )}

              {/* Custom input row */}
              {(usingCustom || !hasDropdown) && (
                <div className="row" style={{ gap: 6 }}>
                  <input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addUrl(customInput); }}
                    placeholder="https://example.com"
                    autoFocus={hasDropdown}
                    className="input"
                    style={{ flex: 1, fontSize: 13 }}
                  />
                  <button type="button" onClick={() => addUrl(customInput)} disabled={!customInput.trim()} className="btn btn-sm">Add URL</button>
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
        </div>
      </label>

      <label className={`choice${state.originMode === "any" ? " choice-selected" : ""}`}>
        <input
          type="radio" name="originMode" value="any"
          checked={state.originMode === "any"}
          onChange={() => onChange({ originMode: "any" })}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Any website</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            The widget will work when embedded on any page.
          </div>
        </div>
      </label>

      {showWarning && (
        <div className="badge badge-warn" style={{ fontSize: 13, padding: "8px 12px", display: "block" }}>
          <strong>Security warning:</strong> This allows anyone on the internet to control your device from any website. Only proceed if you understand this risk.
        </div>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Expiry
// ---------------------------------------------------------------------------

function Step4({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
  const options: { value: WizardState["expiryOption"]; label: string }[] = [
    { value: "never",  label: "Never expires" },
    { value: "30d",    label: "30 days"       },
    { value: "90d",    label: "90 days"       },
    { value: "1y",     label: "1 year"        },
    { value: "custom", label: "Custom date"   },
  ];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const customDateInvalid = state.expiryOption === "custom"
    && state.expiryCustomDate !== ""
    && state.expiryCustomDate <= today;

  return (
    <div className="col" style={{ gap: 12 }}>
      <p style={{ fontSize: 14, fontWeight: 600 }}>When should this widget stop working?</p>
      {options.map(({ value, label }) => (
        <label
          key={value}
          className={`choice${state.expiryOption === value ? " choice-selected" : ""}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          <input
            type="radio" name="expiry" value={value}
            checked={state.expiryOption === value}
            onChange={() => { onChange({ expiryOption: value }); saveMemory({ expiryOption: value }); }}
          />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14 }}>{label}</span>
            {value !== "never" && value !== "custom" && (
              <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>({fmtExpiry(value)})</span>
            )}
            {value === "custom" && state.expiryOption === "custom" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <input
                  type="date"
                  value={state.expiryCustomDate}
                  onChange={e => onChange({ expiryCustomDate: e.target.value })}
                  min={tomorrow}
                  className="input"
                  style={{ marginLeft: 10, fontSize: 13, borderColor: customDateInvalid ? "var(--danger)" : undefined }}
                />
                {customDateInvalid && (
                  <span style={{ fontSize: 12, color: "var(--danger)" }}>Date must be in the future.</span>
                )}
              </span>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Appearance
// ---------------------------------------------------------------------------

const BUNDLED_THEMES = [
  { label: "Default",       url: "" },
  { label: "Glassmorphism", url: "bundled:glassmorphism" },
  { label: "Accessible",    url: "bundled:accessible" },
];

function Step5({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
  return (
    <div className="col" style={{ gap: 16 }}>
      <p className="muted" style={{ fontSize: 13 }}>
        How should your widget look? (optional - skip to use the default theme)
      </p>

      <div className="col" style={{ gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Theme</label>
        <div className="theme-grid">
          {BUNDLED_THEMES.map(t => (
            <button
              key={t.url}
              className={`theme-card${state.themeUrl === t.url ? " selected" : ""}`}
              onClick={() => { onChange({ themeUrl: t.url }); saveMemory({ themeUrl: t.url }); }}
            >
              <div className="theme-preview" />
              <span style={{ fontSize: 12 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        Themes are fully customizable. Manage custom themes in Settings.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6: Done
// ---------------------------------------------------------------------------

const LABEL_ILLEGAL_WIZ = /[\x00-\x1f<>"&]/;

function validateLabelWiz(label: string, otherLabels: string[]): string | null {
  const t = label.trim();
  if (!t) return "Name is required.";
  if (t.length > 100) return "Name must be 100 characters or fewer.";
  if (LABEL_ILLEGAL_WIZ.test(t)) return "Name contains invalid characters.";
  if (otherLabels.some(l => l.trim().toLowerCase() === t.toLowerCase())) {
    return "A widget with this name already exists.";
  }
  return null;
}

function Step6({ token, tokenSecret, originMode, originUrl }: {
  token: Token;
  tokenSecret: string | null;
  originMode: "specific" | "any";
  originUrl: string;
}) {
  const [useAliases,   setUseAliases]   = useState(false);
  const [tab,          setTab]          = useState<"web" | "wordpress">("web");
  const [acknowledged, setAcknowledged] = useState(!tokenSecret);
  const [widgetName,   setWidgetName]   = useState(token.label);
  const [nameSaving,   setNameSaving]   = useState(false);
  const [nameError,    setNameError]    = useState<string | null>(null);
  const [allLabels,    setAllLabels]    = useState<string[]>([]);

  useEffect(() => {
    api.tokens.list().then(ts => {
      setAllLabels(ts.filter(t => t.token_id !== token.token_id).map(t => t.label));
    }).catch(() => {});
  }, [token.token_id]);

  const haUrl = window.location.origin;
  const cardSnippet = tab === "web"
    ? buildCardSnippet(token, useAliases, haUrl)
    : buildWordPressSnippet(token, useAliases, haUrl);
  const hostDisplay = originMode === "any" ? "Anywhere" : (originUrl || haUrl);

  const saveWidgetName = async (name: string) => {
    const trimmed = name.trim();
    const err = validateLabelWiz(trimmed, allLabels);
    if (err) { setNameError(err); return; }
    setNameError(null);
    if (!trimmed || trimmed === token.label) return;
    setNameSaving(true);
    try { await api.tokens.update(token.token_id, { label: trimmed }); }
    catch { /* non-fatal */ }
    finally { setNameSaving(false); }
  };

  return (
    <div className="col" style={{ gap: 16 }}>
      <p style={{ fontSize: 16, fontWeight: 700 }}>Your widget is ready.</p>

      {tokenSecret && (
        <div style={{ background: "var(--danger-weak)", border: "1px solid var(--danger)", borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--danger)", marginBottom: 8 }}>
            Save your token secret now
          </div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <code className="mono" style={{ flex: 1, fontSize: 12, wordBreak: "break-all" }}>{tokenSecret}</code>
            <CopyButton text={tokenSecret} label="Copy" size="sm" />
          </div>
          <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 10px" }}>
            This is shown once only and cannot be retrieved again.
          </p>
          <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
            I have saved my token secret
          </label>
        </div>
      )}

      {acknowledged && (
        <>
          <div className="col" style={{ gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Widget name</label>
            <input
              value={widgetName}
              maxLength={100}
              onChange={e => {
                setWidgetName(e.target.value);
                if (nameError !== null) setNameError(validateLabelWiz(e.target.value.trim(), allLabels));
              }}
              onBlur={e => saveWidgetName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
              disabled={nameSaving}
              className="input"
              style={{ fontSize: 14, borderColor: nameError ? "var(--danger)" : undefined }}
            />
            {nameError && <div style={{ fontSize: 12, color: "var(--danger)" }}>{nameError}</div>}
          </div>

          <div className="muted" style={{ fontSize: 13 }}>
            Host URL: <span className="mono">{hostDisplay}</span>
          </div>

          {/* Step 1: script tag */}
          <div className="code-block-group">
            <div className="code-block-label">
              <span className="step-pill">1</span>
              <div>
                <div className="code-block-title">Page-level script</div>
                <div className="muted" style={{ fontSize: 12 }}>Add once to your page's &lt;head&gt;.</div>
              </div>
            </div>
            <CopyablePre text={WIDGET_SCRIPT} label="Copy script" />
          </div>

          {/* Step 2: card snippet */}
          <div className="code-block-group">
            <div className="code-block-label">
              <span className="step-pill">2</span>
              <div>
                <div className="code-block-title">Widget markup</div>
                <div className="muted" style={{ fontSize: 12 }}>Drop wherever the widget should render.</div>
              </div>
            </div>
            <div className="segmented" role="group" aria-label="Code format" style={{ marginBottom: 8 }}>
              <button aria-pressed={tab === "web"} onClick={() => setTab("web")}>Web page</button>
              <button aria-pressed={tab === "wordpress"} onClick={() => setTab("wordpress")}>WordPress</button>
            </div>
            <CopyablePre text={cardSnippet} label="Copy markup" />
          </div>

          {/* Alias toggle */}
          <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={useAliases}
              onChange={e => setUseAliases(e.target.checked)}
              disabled={token.entities.every((e: EntityAccess) => !e.alias)}
            />
            Show as aliases
            <span className="muted" style={{ fontSize: 11, cursor: "help" }} title="Aliases hide your real entity IDs from the page source. Both formats work against the same token.">(?)
            </span>
          </label>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wizard
// ---------------------------------------------------------------------------

function freshState(): WizardState {
  const mem = loadMemory();
  return {
    mode: "single",
    entities: [],
    capability: mem.capability ?? "read",
    originMode: "specific",
    originUrls: mem.originUrls ?? [],
    expiryOption: (mem.expiryOption as WizardState["expiryOption"]) ?? "never",
    expiryCustomDate: "",
    themeUrl: mem.themeUrl ?? "",
    useHmac: false,
    tokenSecret: null,
    generatedToken: null,
    previewTokenId: null,
  };
}

export function Wizard({ onClose }: WizardProps) {
  const [step,    setStep]    = useState(1);
  const [wState,  setWState]  = useState<WizardState>(freshState);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const previewRevoked = useRef(false);

  useEffect(() => {
    return () => {
      if (wState.previewTokenId && !previewRevoked.current) {
        api.tokens.revoke(wState.previewTokenId).catch(() => {});
      }
    };
  }, [wState.previewTokenId]);

  const patchState = useCallback((updates: Partial<WizardState>) => {
    setWState(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    if (step === 1) return wState.entities.length > 0;
    if (step === 3 && wState.originMode === "specific") {
      return wState.originUrls.length > 0;
    }
    if (step === 4 && wState.expiryOption === "custom") {
      const today = new Date().toISOString().slice(0, 10);
      return wState.expiryCustomDate > today;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 3 && wState.originMode === "specific" && wState.originUrls.length > 0) {
      saveMemory({ originUrls: wState.originUrls });
      wState.originUrls.forEach(u => addKnownOrigin(u));
    }

    if (step === 5 && !wState.previewTokenId) {
      try {
        const preview = await api.tokens.createPreview({
          entity_ids: wState.entities.map(e => e.entity_id),
          capabilities: wState.capability,
        });
        patchState({ previewTokenId: preview.token_id });
      } catch { /* non-fatal */ }
    }

    if (step === 5) {
      setLoading(true);
      setError(null);
      try {
        const entityPayload = wState.entities.map(e => ({
          entity_id: e.entity_id,
          alias: e.alias,
          capabilities: wState.capability,
          exclude_attributes: [],
        }));
        const originHost = wState.originUrls.length > 0 ? splitOriginUrl(wState.originUrls[0]).origin : "";
        const originPaths = wState.originUrls
          .map(u => splitOriginUrl(u).path)
          .filter((p): p is string => p !== null);
        const origins = wState.originMode === "any"
          ? { allow_any: true, allowed: [], allow_paths: [] }
          : { allow_any: false, allowed: originHost ? [originHost] : [], allow_paths: originPaths };
        const expires = expiresAt(wState.expiryOption, wState.expiryCustomDate);
        const token = await api.tokens.create({
          label: wState.entities.map(e => e.entity_id).join(", "),
          entities: entityPayload as Token["entities"],
          origins,
          expires,
        });
        if (wState.previewTokenId) {
          api.tokens.revoke(wState.previewTokenId).catch(() => {});
          previewRevoked.current = true;
        }
        patchState({ generatedToken: token });
        setStep(6);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
      return;
    }

    setStep(s => Math.min(TOTAL_STEPS, s + 1));
  };

  const handleCloseRequest = () => {
    if (step > 1 && !wState.generatedToken) {
      setConfirmClose(true);
    } else {
      onClose(wState.generatedToken?.token_id);
    }
  };

  const isDone = step === 6 && !!wState.generatedToken;

  return (
    <div className="overlay" role="presentation" onClick={handleCloseRequest}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Widget"
        className="wizard"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="wizard-head">
          <div className="wizard-head-brand">
            <Icon name="leaf" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wizard-head-title">
              {isDone ? "Widget ready" : "New widget"}
            </div>
            <div className="wizard-head-sub">
              Step {step} of {TOTAL_STEPS} - {STEP_LABELS[step - 1]}
            </div>
          </div>
          <button
            onClick={handleCloseRequest}
            aria-label="Close wizard"
            className="icon-btn"
            style={{ flexShrink: 0 }}
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        {/* Stepper */}
        {!isDone && (
          <div style={{ padding: "10px 22px", borderBottom: "1px solid var(--divider)", flexShrink: 0, overflowX: "auto" }}>
            <StepIndicator current={step} />
          </div>
        )}

        {error && (
          <div style={{ padding: "0 22px 0" }}>
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* Body */}
        <div className="wizard-body">
          {step === 1 && <Step1 state={wState} onChange={patchState} />}
          {step === 2 && <Step2 state={wState} onChange={patchState} />}
          {step === 3 && <Step3 state={wState} onChange={patchState} />}
          {step === 4 && <Step4 state={wState} onChange={patchState} />}
          {step === 5 && <Step5 state={wState} onChange={patchState} />}
          {isDone && (
            <Step6
              token={wState.generatedToken!}
              tokenSecret={wState.tokenSecret}
              originMode={wState.originMode}
              originUrl={wState.originUrls[0] ?? ""}
            />
          )}
        </div>

        {/* Footer */}
        <div className="wizard-foot">
          {isDone ? (
            <>
              <div className="spacer" />
              <button
                onClick={() => onClose(wState.generatedToken!.token_id)}
                className="btn btn-primary"
              >
                Go to widget <Icon name="chevRight" size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleCloseRequest} className="btn btn-ghost">
                Cancel
              </button>
              <div className="spacer" />
              {step > 1 && (
                <button onClick={() => setStep(s => Math.max(1, s - 1))} className="btn">
                  <Icon name="chevLeft" size={14} /> Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="btn btn-primary"
              >
                {loading && <Spinner size={16} label="Generating..." />}
                {step === 5 ? "Generate" : "Continue"}
                {step !== 5 && !loading && <Icon name="chevRight" size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Confirm discard */}
      {confirmClose && (
        <ConfirmDialog
          title="Discard and close?"
          message="Your progress will be lost. No widget has been created yet."
          confirmLabel="Discard"
          confirmDestructive
          onConfirm={() => { setConfirmClose(false); onClose(); }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  );
}
