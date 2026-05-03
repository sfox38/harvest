/**
 * Wizard.tsx - Four-step widget creation wizard (centered modal).
 *
 * Steps: Design, Origin, Expiry, Done.
 * Step 1 (Design) combines entity selection, permissions, theme, and live preview.
 * Aliases are generated at entity selection time.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Token, ThemeDefinition } from "../types";
import { validateLabel as validateLabelWiz, DEFAULT_WIDGET_SCRIPT_URL } from "../types";
import { api } from "../api";
import { CopyablePre, CopyButton, Spinner, ErrorBanner, ConfirmDialog, EntityAutocomplete, useThemeThumbs } from "./Shared";
import { Icon } from "./Icon";
import { Toggle } from "./Toggle";
import { loadWidgetScript, loadPackScript } from "./WidgetPreview";
import { getEntityCache, loadEntityCache } from "../entityCache";
import { loadKnownOrigins, addKnownOrigin, removeKnownOrigin, validateOriginUrl, displayOriginLabel } from "./originMemory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardMemory {
  capability: "read" | "read-write";
  originMode: "specific" | "any";
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
  mode: "single" | "group" | "page";
  entities: SelectedEntity[];
  label: string;
  labelAutoset: boolean;
  capability: "read" | "read-write";
  originMode: "specific" | "any";
  originUrls: string[];
  expiryOption: "never" | "30d" | "90d" | "1y" | "custom";
  expiryCustomDate: string;
  themeUrl: string;
  useHmac: boolean;
  tokenSecret: string | null;
  generatedToken: Token | null;
}

interface WizardProps {
  onClose: (newTokenId?: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Design", "Origin", "Expiry", "Done"];
const COMPANION_ALLOWED_DOMAINS = new Set(["light", "switch", "binary_sensor", "input_boolean", "cover", "remote", "lock"]);

const DOMAIN_ICON: Record<string, string> = {
  light: "lightbulb", switch: "power", input_boolean: "power",
  binary_sensor: "bolt", sensor: "chart-line", media_player: "play",
  lock: "lock", timer: "clock", input_select: "list", input_number: "tune",
  fan: "fan", climate: "thermostat", cover: "chevDown", harvest_action: "play",
};

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

function buildCardSnippetFromState(
  entities: SelectedEntity[], useAliases: boolean, mode: "single" | "group" | "page", tokenId: string, haUrl: string,
): string {
  function cardLine(e: SelectedEntity, indent = ""): string {
    const entityAttr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
    return `${indent}<hrv-card ${entityAttr}></hrv-card>`;
  }

  if (mode === "page") {
    return entities.map(e => cardLine(e)).join("\n");
  }

  const groupAttrs = `ha-url="${haUrl}" token="${tokenId}"`;
  if (mode === "group") {
    return `<hrv-group ${groupAttrs}>\n${entities.map(e => cardLine(e, "  ")).join("\n")}\n</hrv-group>`;
  }
  const e = entities[0];
  if (!e) return "";
  const sEntityAttr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
  return `<hrv-card ${groupAttrs} ${sEntityAttr}></hrv-card>`;
}

function buildWordPressSnippetFromState(
  entities: SelectedEntity[], useAliases: boolean, mode: "single" | "group" | "page", tokenId: string,
): string {
  function shortcodeLine(e: SelectedEntity, indent = ""): string {
    const entityAttr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
    return `${indent}[harvest ${entityAttr}]`;
  }

  if (mode === "page") {
    return entities.map(e => {
      const entityAttr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
      return `[harvest token="${tokenId}" ${entityAttr}]`;
    }).join("\n");
  }

  if (mode === "group") {
    return `[harvest_group token="${tokenId}"]\n${entities.map(e => shortcodeLine(e, "  ")).join("\n")}\n[/harvest_group]`;
  }

  const e = entities[0];
  if (!e) return "";
  const entityAttr = useAliases && e.alias ? `alias="${e.alias}"` : `entity="${e.entity_id}"`;
  return `[harvest token="${tokenId}" ${entityAttr}]`;
}

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="stepper" role="list" aria-label="Wizard steps">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const state = stepNum < current ? "done" : stepNum === current ? "active" : "pending";
        return (
          <React.Fragment key={label}>
            <div className="step" data-state={state} role="listitem" aria-current={state === "active" ? "step" : undefined}>
              <span className="step-num" aria-hidden="true">
                {state === "done" ? <Icon name="check" size={11} /> : stepNum}
              </span>
              <span className="step-label">{label}</span>
              <span className="sr-only">{`Step ${stepNum}: ${label}${state === "done" ? " (completed)" : state === "active" ? " (current)" : ""}`}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className="step-line" aria-hidden="true" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompanionPicker
// ---------------------------------------------------------------------------

interface CompanionPickerProps {
  companions: { entity_id: string; alias: string | null }[];
  excludeIds: string[];
  onChange: (c: { entity_id: string; alias: string | null }[]) => void;
}

function CompanionPicker({ companions, excludeIds, onChange }: CompanionPickerProps) {
  const [input, setInput] = useState("");
  const [loadingAlias, setLoadingAlias] = useState<string | null>(null);
  const canAdd = true;

  const addCompanion = async (entityId: string) => {
    if (companions.some(c => c.entity_id === entityId)) return;
    if (excludeIds.includes(entityId)) return;
    if (!canAdd) return;
    setLoadingAlias(entityId);
    let alias: string | null = null;
    try {
      const result = await api.tokens.generateAlias(entityId);
      alias = result.alias;
    } catch { /* alias stays null */ }
    finally { setLoadingAlias(null); }
    onChange([...companions, { entity_id: entityId, alias }]);
  };

  const removeCompanion = (entityId: string) => {
    onChange(companions.filter(c => c.entity_id !== entityId));
  };

  return (
    <div className="col" style={{ gap: 6, paddingLeft: 12, borderLeft: "2px solid var(--divider)", marginTop: 2 }}>
      <div className="muted" style={{ fontSize: 11 }}>
        Companions ({companions.length}) - secondary entities shown alongside this card.
        Allowed domains: light, switch, lock, cover, binary sensor, input boolean, remote.
      </div>
      {canAdd && (
        <EntityAutocomplete
          value={input}
          onChange={setInput}
          onSelect={id => { addCompanion(id); setInput(""); }}
          disabled={loadingAlias !== null}
          filterDomains={COMPANION_ALLOWED_DOMAINS}
          placeholder="Add companion entity..."
        />
      )}
      {loadingAlias && (
        <div className="row muted" style={{ gap: 6, fontSize: 11 }}>
          <Spinner size={12} /> Generating alias for {loadingAlias}...
        </div>
      )}
      {companions.map(c => (
        <div key={c.entity_id} className="chip" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ flex: 1, fontSize: 12 }}>{c.entity_id}</span>
          {c.alias && <span className="muted" style={{ fontSize: 10 }}>alias: {c.alias}</span>}
          <button
            onClick={() => removeCompanion(c.entity_id)}
            className="btn btn-sm btn-ghost"
            style={{ padding: "1px 4px" }}
            aria-label={`Remove companion ${c.entity_id}`}
          ><Icon name="close" size={10} /></button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock weather forecast data for preview
// ---------------------------------------------------------------------------

const _MOCK_WEATHER_FORECAST_DAILY = [
  { datetime: "2025-06-10T12:00:00", condition: "sunny",        temperature: 27, templow: 18 },
  { datetime: "2025-06-11T12:00:00", condition: "partlycloudy", temperature: 24, templow: 16 },
  { datetime: "2025-06-12T12:00:00", condition: "rainy",        temperature: 19, templow: 13 },
  { datetime: "2025-06-13T12:00:00", condition: "cloudy",       temperature: 21, templow: 14 },
  { datetime: "2025-06-14T12:00:00", condition: "sunny",        temperature: 26, templow: 17 },
];
const _MOCK_WEATHER_FORECAST_HOURLY = [
  { datetime: "2025-06-10T08:00:00", condition: "sunny",        temperature: 20 },
  { datetime: "2025-06-10T09:00:00", condition: "sunny",        temperature: 21 },
  { datetime: "2025-06-10T10:00:00", condition: "partlycloudy", temperature: 23 },
  { datetime: "2025-06-10T11:00:00", condition: "partlycloudy", temperature: 24 },
  { datetime: "2025-06-10T12:00:00", condition: "cloudy",       temperature: 25 },
  { datetime: "2025-06-10T13:00:00", condition: "cloudy",       temperature: 26 },
  { datetime: "2025-06-10T14:00:00", condition: "partlycloudy", temperature: 26 },
  { datetime: "2025-06-10T15:00:00", condition: "sunny",        temperature: 25 },
];

// ---------------------------------------------------------------------------
// WizardEntityPreview - live preview of a real entity
// ---------------------------------------------------------------------------

function WizardEntityPreview({ entityId, capability, theme, companions = [] }: {
  entityId: string;
  capability: "read" | "read-write";
  theme: ThemeDefinition | null;
  companions?: { entity_id: string; alias: string | null }[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [serverDef, setServerDef] = useState<{ definition: Record<string, unknown>; state: string; attributes: Record<string, unknown> } | null>(null);
  const renderedKeyRef = useRef<string>("");
  const packId = theme?.renderer_pack ? theme.theme_id : undefined;

  useEffect(() => {
    loadWidgetScript()
      .then(() => packId ? loadPackScript(packId) : Promise.resolve())
      .then(() => setReady(true))
      .catch(() => setLoadError(true));
  }, [packId]);

  const companionIds = companions.map(c => c.entity_id);
  const defKey = `${entityId}:${capability}:${companionIds.join(",")}`;
  useEffect(() => {
    let cancelled = false;
    api.entities.getDefinition(entityId, {
      capabilities: capability,
      companion_ids: companionIds.length ? companionIds : undefined,
    }).then(result => {
      if (!cancelled) setServerDef(result);
    }).catch(() => {
      if (!cancelled) setServerDef(null);
    });
    return () => { cancelled = true; };
  }, [defKey]);

  const themeObj = useMemo(() => {
    if (!theme) return { variables: {}, dark_variables: {} };
    return { variables: theme.variables ?? {}, dark_variables: theme.dark_variables ?? {} };
  }, [theme?.theme_id]);

  const cardKey = `${entityId}:${capability}:${companionIds.join(",")}:${theme?.theme_id ?? ""}`;
  const defMatchesEntity = serverDef?.definition?.entity_id === entityId;

  useEffect(() => {
    if (!ready || !serverDef || !defMatchesEntity || !containerRef.current || !window.HArvest) return;
    if (renderedKeyRef.current === cardKey) return;
    renderedKeyRef.current = cardKey;
    const container = containerRef.current;
    container.innerHTML = "";
    cardRef.current = null;
    const domain = entityId.split(".")[0];
    const entityDef: Record<string, unknown> = { ...serverDef.definition, capabilities: capability };

    if (companions.length > 0) {
      entityDef.preview_companions = companions.map(c => ({
        entity_id: c.entity_id,
        capabilities: capability,
        domain: c.entity_id.split(".")[0],
      }));
    }

    let attrs: Record<string, unknown>;
    let previewState = serverDef.state;

    if (domain === "weather") {
      previewState = "partlycloudy";
      attrs = {
        temperature: 22, temperature_unit: "°C",
        humidity: 65,
        wind_speed: 15, wind_speed_unit: "km/h",
        pressure: 1013, pressure_unit: "hPa",
        forecast_daily: _MOCK_WEATHER_FORECAST_DAILY,
        forecast: _MOCK_WEATHER_FORECAST_DAILY,
        forecast_hourly: _MOCK_WEATHER_FORECAST_HOURLY,
      };
    } else {
      attrs = serverDef.attributes;
    }

    const opts: Record<string, unknown> = {};
    if (packId) opts.packId = packId;

    const card = window.HArvest!.preview(
      container, entityDef, previewState, attrs, themeObj as never,
      Object.keys(opts).length ? opts as never : undefined,
    );
    cardRef.current = card;
  }, [ready, cardKey, serverDef, defMatchesEntity, JSON.stringify(themeObj)]);

  useEffect(() => {
    const card = cardRef.current as (HTMLElement & { applyPreviewTheme?: (v: Record<string, unknown>) => void }) | null;
    if (!card?.applyPreviewTheme) return;
    card.applyPreviewTheme(themeObj);
  }, [JSON.stringify(themeObj)]);

  if (loadError) return <div className="muted" style={{ fontSize: 12, padding: "8px 0" }}>Preview unavailable.</div>;
  if (!ready && !cardRef.current) return <div style={{ display: "flex", justifyContent: "center", padding: 12 }}><Spinner size={20} /></div>;
  return <div ref={containerRef} className="theme-preview-widget" style={{ display: "flex", justifyContent: "center", minHeight: 100 }} />;
}

// ---------------------------------------------------------------------------
// Theme URL helpers
// ---------------------------------------------------------------------------

function themeIdToUrl(id: string): string {
  if (id === "default") return "";
  if (id.startsWith("hth_")) return `user:${id}`;
  return `bundled:${id}`;
}

function themeUrlToId(url: string): string {
  if (!url) return "default";
  if (url.startsWith("bundled:")) return url.slice(8);
  if (url.startsWith("user:")) return url.slice(5);
  return url;
}

// ---------------------------------------------------------------------------
// Step 1: Design (entities + permissions + theme + preview)
// ---------------------------------------------------------------------------

function ThemeStrip({ themes, themeUrl, onChange }: { themes: ThemeDefinition[]; themeUrl: string; onChange: (url: string) => void }) {
  const thumbUrls = useThemeThumbs(themes);
  const selectedId = themeUrlToId(themeUrl);

  if (themes.length === 0) return null;

  return (
    <div className="col" style={{ gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600 }}>Theme</label>
      <div className="theme-strip" role="radiogroup" aria-label="Widget theme">
        {themes.map(t => (
          <button
            key={t.theme_id}
            className={`theme-strip-item${selectedId === t.theme_id ? " selected" : ""}`}
            onClick={() => onChange(themeIdToUrl(t.theme_id))}
            role="radio"
            aria-checked={selectedId === t.theme_id}
            aria-label={t.name}
          >
            <div className="theme-thumb-wrap">
              {thumbUrls[t.theme_id] ? (
                <img className="theme-strip-thumb" src={thumbUrls[t.theme_id]} alt={t.name} draggable={false} />
              ) : (
                <div className="theme-strip-thumb" />
              )}
              {t.renderer_pack && (
                <span className="theme-pack-star" title="Theme includes a custom renderer pack">&#9733;</span>
              )}
            </div>
            <span className="theme-strip-name">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step1({ state, onChange, existingLabels, maxEntities }: { state: WizardState; onChange: (u: Partial<WizardState>) => void; existingLabels: string[]; maxEntities: number }) {
  const [entityInput, setEntityInput] = useState("");
  const [loadingAlias, setLoadingAlias] = useState<string | null>(null);
  const [expandedCompanions, setExpandedCompanions] = useState<Set<string>>(new Set());
  const [previewEntityId, setPreviewEntityId] = useState<string | null>(null);
  const entitiesRef = useRef(state.entities);
  entitiesRef.current = state.entities;
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  useEffect(() => { api.themes.list().then(setThemes).catch(() => {}); }, []);
  const selectedThemeId = themeUrlToId(state.themeUrl);
  const selectedTheme = themes.find(t => t.theme_id === selectedThemeId) ?? null;

  useEffect(() => {
    if (getEntityCache().length === 0) loadEntityCache();
  }, []);

  const atEntityLimit = state.mode !== "single" && state.entities.length >= maxEntities;

  const selectEntity = async (entityId: string) => {
    if (state.entities.some(e => e.entity_id === entityId)) return;
    if (state.mode !== "single" && state.entities.length >= maxEntities) return;
    setLoadingAlias(entityId);
    let alias: string | null = null;
    try {
      const result = await api.tokens.generateAlias(entityId);
      alias = result.alias;
    } catch { /* alias stays null */ }
    finally { setLoadingAlias(null); }

    const latest = entitiesRef.current;
    if (latest.some(e => e.entity_id === entityId)) return;

    const entry: SelectedEntity = { entity_id: entityId, alias, companions: [] };
    const isFirst = latest.length === 0;
    const newEntities = state.mode === "single" ? [entry] : [...latest, entry];
    const updates: Partial<WizardState> = { entities: newEntities };

    if (state.labelAutoset && isFirst) {
      const cached = getEntityCache().find(e => e.entity_id === entityId);
      const name = cached?.friendly_name ?? entityId;
      const autoName = state.mode === "single" ? name : state.mode === "group" ? `${name} group` : `${name} page`;
      updates.label = autoName.slice(0, 100);
    }

    onChange(updates);
  };

  const removeEntity = (entityId: string) => {
    setExpandedCompanions(prev => { const n = new Set(prev); n.delete(entityId); return n; });
    if (previewEntityId === entityId) setPreviewEntityId(null);
    const remaining = state.entities.filter(e => e.entity_id !== entityId);
    const updates: Partial<WizardState> = { entities: remaining };
    if (state.labelAutoset && remaining.length === 0) updates.label = "";
    onChange(updates);
  };

  const updateCompanions = (entityId: string, companions: { entity_id: string; alias: string | null }[]) => {
    onChange({ entities: state.entities.map(e => e.entity_id === entityId ? { ...e, companions } : e) });
  };

  const toggleExpand = (entityId: string) => {
    setExpandedCompanions(prev => {
      const n = new Set(prev);
      if (n.has(entityId)) n.delete(entityId); else n.add(entityId);
      return n;
    });
  };

  const primaryIds = state.entities.map(e => e.entity_id);
  const multiMode = state.mode === "group" || state.mode === "page";
  const showPicker = !atEntityLimit;
  const activePreviewId = state.entities.find(e => e.entity_id === previewEntityId)?.entity_id
    ?? state.entities[0]?.entity_id ?? null;

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="segmented" role="group" aria-label="Widget mode">
        {(["single", "group", "page"] as const).map(m => (
          <button key={m} aria-pressed={state.mode === m} onClick={() => {
            if (m === state.mode) return;
            const carried = m === "single" ? state.entities.slice(0, 1) : state.entities;
            onChange({ mode: m, entities: carried });
          }}>
            {m === "single" ? "Single card" : m === "group" ? "Group of cards" : "Page of cards"}
          </button>
        ))}
      </div>

      <p className="muted" style={{ fontSize: 13 }}>
        {state.mode === "single"
          ? "Choose one entity. Optionally add companion entities shown alongside it."
          : state.mode === "group"
            ? "Add multiple entities for a group widget. Each card can have companion entities."
            : "Add entities for a full page of widgets. Cards inherit ha-url and token from a page-level config call."}
      </p>

      {showPicker && (
        <EntityAutocomplete
          value={entityInput}
          onChange={setEntityInput}
          onSelect={id => { selectEntity(id); setEntityInput(""); }}
          disabled={loadingAlias !== null}
          placeholder={state.mode === "single" ? "Search entity ID or friendly name..." : multiMode ? "Add entity..." : "Add entity..."}
          excludeIds={primaryIds}
        />
      )}

      {atEntityLimit && (
        <p className="muted" style={{ fontSize: 12, color: "var(--warning)" }}>
          Maximum of {maxEntities} entities per token.
        </p>
      )}

      {loadingAlias && (
        <div className="row muted" style={{ gap: 8, fontSize: 12 }}>
          <Spinner size={14} /> Generating alias for {loadingAlias}...
        </div>
      )}

      {state.entities.length > 0 && (
        <div
          className="entities-list-scroll"
          role="list"
          aria-label="Selected entities"
          style={{ maxHeight: multiMode ? 260 : undefined }}
        >
          {state.entities.map(e => {
            const domain = e.entity_id.split(".")[0];
            const isSelected = e.entity_id === activePreviewId;
            const isExpanded = expandedCompanions.has(e.entity_id);
            const companionCount = e.companions.length;
            const friendly = getEntityCache().find(c => c.entity_id === e.entity_id)?.friendly_name;
            return (
              <div key={e.entity_id} role="listitem">
                <button
                  className={`entity-list-row${isSelected ? " selected" : ""}`}
                  onClick={() => {
                    setPreviewEntityId(e.entity_id);
                    if (multiMode) {
                      setExpandedCompanions(e.companions.length > 0 ? new Set([e.entity_id]) : new Set());
                    }
                  }}
                  aria-pressed={isSelected}
                  data-entity-id={e.entity_id}
                  type="button"
                >
                  <div className="widget-thumb" style={{ width: 24, height: 24 }}>
                    <Icon name={DOMAIN_ICON[domain] ?? "plug"} size={12} />
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    className="wizard-companion-badge"
                    onClick={(ev) => { ev.stopPropagation(); setPreviewEntityId(e.entity_id); toggleExpand(e.entity_id); }}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.stopPropagation(); setPreviewEntityId(e.entity_id); toggleExpand(e.entity_id); } }}
                    aria-label={`Toggle companions for ${e.entity_id}`}
                    title="Add/view companions"
                  >
                    +{companionCount > 0 ? companionCount : ""}
                  </span>
                  <div className="entity-list-id">
                    {friendly && friendly !== e.entity_id && <span className="entity-list-name">{friendly}</span>}
                    <span className="entity-list-eid mono">{e.entity_id}</span>
                  </div>
                  {e.alias && <span className="entity-list-alias mono">{e.alias}</span>}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => { ev.stopPropagation(); removeEntity(e.entity_id); }}
                    onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.stopPropagation(); removeEntity(e.entity_id); } }}
                    className="entity-list-delete"
                    aria-label={`Remove ${e.entity_id}`}
                  >
                    <Icon name="close" size={10} />
                  </span>
                </button>
                {isExpanded && (
                  <CompanionPicker
                    companions={e.companions}
                    excludeIds={primaryIds}
                    onChange={cs => updateCompanions(e.entity_id, cs)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {state.entities.length === 0 && (
        <p className="muted" style={{ fontSize: 12 }}>
          No entities selected yet. Add at least one to continue.
        </p>
      )}

      {/* Widget name + Permissions - same row */}
      {state.entities.length > 0 && (() => {
        const nameErr = validateLabelWiz(state.label, existingLabels);
        return (
          <div className="row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="col" style={{ gap: 4, flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Widget name</label>
              <input
                value={state.label}
                maxLength={100}
                onChange={e => onChange({ label: e.target.value, labelAutoset: false })}
                placeholder="Enter a name for this widget..."
                className="input"
                style={{ borderColor: nameErr ? "var(--danger)" : undefined }}
              />
              {nameErr && <div style={{ fontSize: 12, color: "var(--danger)" }}>{nameErr}</div>}
            </div>
            <div className="col" style={{ gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Permissions</label>
              <div className="segmented" role="group" aria-label="Capability">
                <button aria-pressed={state.capability === "read"} onClick={() => { onChange({ capability: "read" }); saveMemory({ capability: "read" }); }}>View only</button>
                <button aria-pressed={state.capability === "read-write"} onClick={() => { onChange({ capability: "read-write" }); saveMemory({ capability: "read-write" }); }}>Control</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Theme strip */}
      {state.entities.length > 0 && (
        <ThemeStrip themes={themes} themeUrl={state.themeUrl} onChange={url => { onChange({ themeUrl: url }); saveMemory({ themeUrl: url }); }} />
      )}

      {/* Live entity preview */}
      {activePreviewId && (
        <div className="col" style={{ gap: 8 }} role="region" aria-label="Entity preview" aria-live="polite">
          <label style={{ fontSize: 12, fontWeight: 600 }}>Preview</label>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <WizardEntityPreview
              entityId={activePreviewId}
              capability={state.capability}
              theme={selectedTheme}
              companions={state.entities.find(e => e.entity_id === activePreviewId)?.companions}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Origin
// ---------------------------------------------------------------------------

const ORIGIN_CUSTOM = "__custom__";

function Step2({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
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
    let u: URL;
    try { u = new URL(trimmed); }
    catch { setUrlError("Invalid URL"); return; }
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
          onChange={() => { onChange({ originMode: "specific" }); saveMemory({ originMode: "specific" }); }}
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
                    aria-label="Select a website URL"
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
                    aria-label="Website URL"
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
          onChange={() => { onChange({ originMode: "any" }); saveMemory({ originMode: "any" }); }}
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
// Step 3: Expiry
// ---------------------------------------------------------------------------

function Step3({ state, onChange }: { state: WizardState; onChange: (u: Partial<WizardState>) => void }) {
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
// Step 4: Done
// ---------------------------------------------------------------------------


function Step4Done({ token, tokenSecret, originMode, originUrl, overrideHost, selectedEntities, widgetScriptUrl, cardMode, onAcknowledgedChange }: {
  token: Token;
  tokenSecret: string | null;
  originMode: "specific" | "any";
  originUrl: string;
  overrideHost: string;
  selectedEntities: SelectedEntity[];
  widgetScriptUrl: string;
  cardMode: "single" | "group" | "page";
  onAcknowledgedChange?: (v: boolean) => void;
}) {
  const [useAliases,   setUseAliases]   = useState(() => localStorage.getItem("hrv_use_aliases") === "true");
  const [tab,          setTab]          = useState<"web" | "wordpress">(() => localStorage.getItem("hrv_code_tab") === "wordpress" ? "wordpress" : "web");
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

  const haUrl = overrideHost || window.location.origin;
  const scriptUrl = widgetScriptUrl.trim() || DEFAULT_WIDGET_SCRIPT_URL;
  const isPage = cardMode === "page";
  const scriptTag = `<script src="${scriptUrl}"></script>`;
  const pageConfigParts = [`haUrl: "${haUrl}"`, `token: "${token.token_id}"`];
  const pageSetup = isPage
    ? `${scriptTag}\n<script>HArvest.config({ ${pageConfigParts.join(", ")} });</script>`
    : scriptTag;
  const cardSnippet = tab === "web"
    ? buildCardSnippetFromState(selectedEntities, useAliases, cardMode, token.token_id, haUrl)
    : buildWordPressSnippetFromState(selectedEntities, useAliases, cardMode, token.token_id);
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
          <div className="row" style={{ gap: 8, fontSize: 13 }}>
            <Toggle checked={acknowledged} onChange={v => { setAcknowledged(v); onAcknowledgedChange?.(v); }} />
            <span>I have saved my token secret</span>
          </div>
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

          {/* Step 1: page setup (HTML only; WordPress plugin handles it) */}
          {tab === "web" && (
            <div className="code-block-group">
              <div className="code-block-label">
                <span className="step-pill">1</span>
                <div>
                  <div className="code-block-title">{isPage ? "Page setup" : "Widget script"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {isPage
                      ? "Add once to your page's <head>. All widgets inherit these defaults."
                      : "Add once to your page's <head>."}
                  </div>
                </div>
              </div>
              <CopyablePre text={pageSetup} label={isPage ? "Copy setup" : "Copy script"} />
            </div>
          )}

          {/* Step 2 (or Step 1 for WordPress): card snippet */}
          <div className="code-block-group">
            <div className="code-block-label">
              <span className="step-pill">{tab === "web" ? "2" : "1"}</span>
              <div>
                <div className="code-block-title">{tab === "wordpress" ? "Shortcode" : "Widget markup"}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {tab === "wordpress"
                    ? "Paste into any post or page. The HArvest plugin loads the widget script automatically."
                    : "Drop wherever the widget should render."}
                </div>
              </div>
            </div>
            <div className="segmented" role="group" aria-label="Code format" style={{ marginBottom: 8 }}>
              <button aria-pressed={tab === "web"} onClick={() => { setTab("web"); localStorage.setItem("hrv_code_tab", "web"); }}>Web page</button>
              <button aria-pressed={tab === "wordpress"} onClick={() => { setTab("wordpress"); localStorage.setItem("hrv_code_tab", "wordpress"); }}>WordPress</button>
            </div>
            <CopyablePre text={cardSnippet} label={tab === "wordpress" ? "Copy shortcode" : "Copy markup"} />
          </div>

          {/* Alias toggle */}
          <div className="row" style={{ gap: 8, fontSize: 13 }}>
            <Toggle
              checked={useAliases}
              onChange={v => { setUseAliases(v); localStorage.setItem("hrv_use_aliases", String(v)); }}
              disabled={selectedEntities.every(e => !e.alias && e.companions.every(c => !c.alias))}
            />
            <span>Show as aliases</span>
            <span className="muted" style={{ fontSize: 11, cursor: "help" }} title="Aliases hide your real entity IDs from the page source. Both formats work against the same token.">(?)
            </span>
          </div>
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
    label: "",
    labelAutoset: true,
    capability: mem.capability ?? "read",
    originMode: mem.originMode === "any" ? "any" : "specific",
    originUrls: mem.originUrls ?? [],
    expiryOption: (mem.expiryOption as WizardState["expiryOption"]) ?? "never",
    expiryCustomDate: "",
    themeUrl: mem.themeUrl ?? "",
    useHmac: false,
    tokenSecret: null,
    generatedToken: null,
  };
}

export function Wizard({ onClose }: WizardProps) {
  const [step,         setStep]         = useState(1);
  const [wState,       setWState]       = useState<WizardState>(freshState);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [overrideHost,       setOverrideHost]       = useState("");
  const [widgetScriptUrl,    setWidgetScriptUrl]    = useState("");
  const [existingLabels,     setExistingLabels]     = useState<string[]>([]);
  const [maxEntities,        setMaxEntities]        = useState(50);
  const [secretAcknowledged, setSecretAcknowledged] = useState(false);
  const wizardRef = useRef<HTMLDivElement>(null);
  const closeRequestRef = useRef<() => void>(() => {});

  // Focus trap: initial focus + Tab cycle within the dialog.
  useEffect(() => {
    const el = wizardRef.current;
    if (!el) return;
    const sel = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    el.querySelector<HTMLElement>(sel)?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeRequestRef.current(); return; }
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

  useEffect(() => {
    api.config.get().then(c => {
      setOverrideHost(c.override_host || "");
      setWidgetScriptUrl(c.widget_script_url || "");
      if (c.max_entities_per_token) setMaxEntities(c.max_entities_per_token);
    }).catch(() => {});
    api.tokens.list().then(ts => {
      setExistingLabels(ts.map(t => t.label));
    }).catch(() => {});
  }, []);

  const patchState = useCallback((updates: Partial<WizardState>) => {
    setWState(prev => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    if (step === 1) return wState.entities.length > 0 && validateLabelWiz(wState.label, existingLabels) === null;
    if (step === 2 && wState.originMode === "specific") {
      return wState.originUrls.length > 0;
    }
    if (step === 3 && wState.expiryOption === "custom") {
      const today = new Date().toISOString().slice(0, 10);
      return wState.expiryCustomDate > today;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 2 && wState.originMode === "specific" && wState.originUrls.length > 0) {
      saveMemory({ originUrls: wState.originUrls });
      wState.originUrls.forEach(u => addKnownOrigin(u));
    }

    if (step === 3) {
      setLoading(true);
      setError(null);
      try {
        const primaryMap = new Map(wState.entities.map(e => [e.entity_id, {
          entity_id: e.entity_id,
          alias: e.alias,
          capabilities: wState.capability,
          exclude_attributes: [] as string[],
          companion_of: null as string | null,
        }]));
        const companionMap = new Map<string, { entity_id: string; alias: string | null; capabilities: "read" | "read-write"; exclude_attributes: string[]; companion_of: string | null }>();
        for (const e of wState.entities) {
          for (const c of e.companions) {
            if (!primaryMap.has(c.entity_id) && !companionMap.has(c.entity_id)) {
              companionMap.set(c.entity_id, {
                entity_id: c.entity_id,
                alias: c.alias,
                capabilities: wState.capability,
                exclude_attributes: [],
                companion_of: e.entity_id,
              });
            }
          }
        }
        const entityPayload = [...primaryMap.values(), ...companionMap.values()];
        const originHost = wState.originUrls.length > 0 ? splitOriginUrl(wState.originUrls[0]).origin : "";
        const originPaths = wState.originUrls
          .map(u => splitOriginUrl(u).path)
          .filter((p): p is string => p !== null);
        const origins = wState.originMode === "any"
          ? { allow_any: true, allowed: [], allow_paths: [] }
          : { allow_any: false, allowed: originHost ? [originHost] : [], allow_paths: originPaths };
        const expires = expiresAt(wState.expiryOption, wState.expiryCustomDate);
        const token = await api.tokens.create({
          label: wState.label.trim(),
          entities: entityPayload as Token["entities"],
          origins,
          expires,
          embed_mode: wState.mode,
          theme_url: wState.themeUrl,
        });
        patchState({ generatedToken: token });
        setStep(4);
      } catch (e) {
        const raw = String(e);
        const dashIdx = raw.lastIndexOf(" - ");
        const body = dashIdx !== -1 ? raw.slice(dashIdx + 3) : raw;
        setError(body.replace(/^\d{3}:\s*/, "").replace(/^Error:\s*/, "") || raw);
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
  closeRequestRef.current = handleCloseRequest;

  const isDone = step === 4 && !!wState.generatedToken;
  const secretPending = isDone && !!wState.tokenSecret && !secretAcknowledged;

  return (
    <div className="overlay" role="presentation">
      <div
        ref={wizardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Create Widget"
        className="wizard"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="wizard-head">
          <div className="wizard-head-brand">
            <img src="/harvest_assets/icon.png" alt="HArvest" style={{ width: 22, height: 22 }} />
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
            disabled={secretPending}
            title={secretPending ? "Acknowledge the token secret first" : undefined}
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
          {step === 1 && <Step1 state={wState} onChange={patchState} existingLabels={existingLabels} maxEntities={maxEntities} />}
          {step === 2 && <Step2 state={wState} onChange={patchState} />}
          {step === 3 && <Step3 state={wState} onChange={patchState} />}
          {isDone && (
            <Step4Done
              token={wState.generatedToken!}
              tokenSecret={wState.tokenSecret}
              originMode={wState.originMode}
              originUrl={wState.originUrls[0] ?? ""}
              overrideHost={overrideHost}
              selectedEntities={wState.entities}
              widgetScriptUrl={widgetScriptUrl}
              cardMode={wState.mode}
              onAcknowledgedChange={setSecretAcknowledged}
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
                disabled={secretPending}
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
                {step === 3 ? "Generate" : "Continue"}
                {step !== 3 && !loading && <Icon name="chevRight" size={14} />}
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
