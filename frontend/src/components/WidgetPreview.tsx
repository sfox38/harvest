/**
 * WidgetPreview.tsx - Shared widget preview component.
 *
 * Renders a live preview of a widget card using harvest.min.js in preview mode.
 * Used by the Themes tab, Wizard Step 5, and TokenDetail ThemeEditor.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { ThemeDefinition, HAEntityDetail } from "../types";
import { api, getHaDarkMode } from "../api";
import { Toggle } from "./Toggle";
import { EntityAutocomplete } from "./Shared";
import { Icon } from "./Icon";
import buildVersion from "../buildVersion.json";

// ---------------------------------------------------------------------------
// Domain feature definitions
// ---------------------------------------------------------------------------

interface FeatureOption {
  key: string;
  label: string;
  default: boolean;
}

export const DOMAIN_FEATURES: Record<string, FeatureOption[]> = {
  light: [
    { key: "brightness", label: "Brightness", default: true },
    { key: "color_temp", label: "Color temperature", default: false },
    { key: "rgb_color", label: "Color (RGB)", default: false },
  ],
  fan: [
    { key: "percentage", label: "Speed", default: true },
    { key: "oscillating", label: "Oscillating", default: false },
    { key: "direction", label: "Direction", default: false },
    { key: "preset_mode", label: "Preset modes", default: false },
    { key: "animate", label: "Animate icon", default: false },
  ],
  cover: [
    { key: "current_position", label: "Position slider", default: true },
    { key: "buttons", label: "Open / Stop / Close", default: true },
  ],
  climate: [
    { key: "temperature", label: "Target temperature", default: true },
    { key: "hvac_modes", label: "Mode selector", default: true },
  ],
  media_player: [
    { key: "transport", label: "Transport controls", default: true },
    { key: "volume", label: "Volume slider", default: true },
  ],
  input_number: [
    { key: "slider", label: "Value slider", default: true },
  ],
  weather: [
    { key: "forecast", label: "Forecast", default: true },
  ],
};

type GraphType = "none" | "line" | "bar" | "step";

const GRAPH_DOMAINS: Record<string, GraphType[]> = {
  sensor:        ["none", "line", "bar"],
  input_number:  ["none", "line", "bar"],
  binary_sensor: ["none", "step"],
};

const DEFAULT_GRAPH: Record<string, GraphType> = {
  sensor: "none",
  input_number: "none",
  binary_sensor: "none",
};

export function defaultFeatures(domain: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of DOMAIN_FEATURES[domain] ?? []) out[f.key] = f.default;
  return out;
}

export function detectFeatures(domain: string, attrs: Record<string, unknown>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of DOMAIN_FEATURES[domain] ?? []) out[f.key] = f.key in attrs;

  if (domain === "light") {
    const modes = new Set((attrs.supported_color_modes as string[]) ?? []);
    const dimmable = new Set(["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"]);
    if ([...modes].some(m => dimmable.has(m))) out.brightness = true;
    if (modes.has("color_temp")) out.color_temp = true;
    const colorCapable = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);
    if ([...modes].some(m => colorCapable.has(m))) out.rgb_color = true;
  }

  if (domain === "climate" && Array.isArray(attrs.hvac_modes)) {
    out.hvac_modes = true;
  }
  if (domain === "climate" && ("temperature" in attrs || "target_temp_step" in attrs)) {
    out.temperature = true;
  }

  if (domain === "fan") {
    if ("oscillating" in attrs) out.oscillating = true;
    if ("direction" in attrs) out.direction = true;
    if (Array.isArray(attrs.preset_modes) && attrs.preset_modes.length > 0) out.preset_mode = true;
  }

  if (domain === "cover") {
    out.buttons = true;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Mock entity data for preview
// ---------------------------------------------------------------------------

export interface MockEntity {
  domain: string;
  label: string;
  friendly_name: string;
  state: string;
  unit?: string;
  attributes: Record<string, unknown>;
}

export const MOCK_ENTITIES: Record<string, MockEntity> = {
  light:          { domain: "light",          label: "Light",          friendly_name: "Bedroom Light",    state: "on",       attributes: { brightness: 180, color_temp: 350, min_mireds: 153, max_mireds: 500, rgb_color: [255, 180, 100] } },
  switch:         { domain: "switch",         label: "Switch",         friendly_name: "Pump Motor",       state: "on",       attributes: {} },
  sensor:         { domain: "sensor",         label: "Sensor",         friendly_name: "Temperature",      state: "22.4",     unit: "°C", attributes: { device_class: "temperature", state_class: "measurement" } },
  climate:        { domain: "climate",        label: "Climate",        friendly_name: "Living Room",      state: "heat",     attributes: { current_temperature: 21.5, temperature: 22, hvac_modes: ["off", "heat", "cool", "auto"] } },
  cover:          { domain: "cover",          label: "Cover",          friendly_name: "Blinds",           state: "open",     attributes: { current_position: 65 } },
  fan:            { domain: "fan",            label: "Fan",            friendly_name: "Ceiling Fan",      state: "on",       attributes: { percentage: 65, oscillating: false, direction: "forward", preset_mode: "normal", preset_modes: ["normal", "nature", "sleep", "auto"] } },
  binary_sensor:  { domain: "binary_sensor",  label: "Binary Sensor",  friendly_name: "Motion Sensor",    state: "on",       attributes: { device_class: "motion" } },
  input_boolean:  { domain: "input_boolean",  label: "Input Boolean",  friendly_name: "Guest Mode",       state: "on",       attributes: {} },
  input_number:   { domain: "input_number",   label: "Input Number",   friendly_name: "Target Humidity",  state: "42",       unit: "%",  attributes: { min: 0, max: 100, step: 1 } },
  input_select:   { domain: "input_select",   label: "Input Select",   friendly_name: "Scene Mode",       state: "Option B", attributes: { options: ["Option A", "Option B", "Option C"] } },
  media_player:   { domain: "media_player",   label: "Media Player",   friendly_name: "Speaker",          state: "playing",  attributes: { media_title: "Bohemian Rhapsody", media_artist: "Queen", volume_level: 0.7 } },
  remote:         { domain: "remote",         label: "Remote",         friendly_name: "TV Remote",        state: "on",       attributes: {} },
  harvest_action: { domain: "harvest_action", label: "Action",         friendly_name: "Good Night",       state: "idle",     attributes: {} },
  timer:          { domain: "timer",          label: "Timer",          friendly_name: "Oven Timer",       state: "idle",     attributes: { duration: "0:25:00", remaining: "0:25:00" } },
  weather:        { domain: "weather",        label: "Weather",        friendly_name: "Weather",          state: "sunny",    attributes: { temperature: 24, temperature_unit: "°C", humidity: 45, wind_speed: 12, wind_speed_unit: "km/h", pressure: 1013, pressure_unit: "hPa", forecast_daily: [
    { datetime: "2026-05-02", condition: "partlycloudy", temperature: 22, templow: 14 },
    { datetime: "2026-05-03", condition: "rainy",        temperature: 18, templow: 12 },
    { datetime: "2026-05-04", condition: "cloudy",       temperature: 20, templow: 13 },
    { datetime: "2026-05-05", condition: "sunny",        temperature: 25, templow: 15 },
    { datetime: "2026-05-06", condition: "partlycloudy", temperature: 23, templow: 14 },
  ], forecast_hourly: [
    { datetime: "2026-05-02T08:00:00", condition: "sunny",        temperature: 18 },
    { datetime: "2026-05-02T09:00:00", condition: "sunny",        temperature: 19 },
    { datetime: "2026-05-02T10:00:00", condition: "partlycloudy", temperature: 21 },
    { datetime: "2026-05-02T11:00:00", condition: "partlycloudy", temperature: 22 },
    { datetime: "2026-05-02T12:00:00", condition: "cloudy",       temperature: 23 },
    { datetime: "2026-05-02T13:00:00", condition: "cloudy",       temperature: 24 },
    { datetime: "2026-05-02T14:00:00", condition: "partlycloudy", temperature: 24 },
    { datetime: "2026-05-02T15:00:00", condition: "sunny",        temperature: 23 },
  ] } },
};

const RENDERER_OPTIONS = [
  ...Object.entries(MOCK_ENTITIES)
    .map(([key, m]) => ({ value: key, label: m.label }))
    .sort((a, b) => a.label.localeCompare(b.label)),
  { value: "custom", label: "Custom Entity" },
];

// ---------------------------------------------------------------------------
// Widget script loader and preview helpers
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    HArvest?: {
      preview: (
        container: HTMLElement,
        entityDef: Record<string, unknown>,
        state: string,
        attributes: Record<string, unknown>,
        themeVars?: Record<string, string> | { variables: Record<string, string>; dark_variables?: Record<string, string> },
        options?: { graph?: string; hours?: number; historyData?: Array<{ t: string; s: string }>; packId?: string },
      ) => HTMLElement;
      buildEntityDef: (
        rawEntity: { domain: string; state: string; friendly_name: string; attributes: Record<string, unknown>; unit?: string },
        options?: { capabilities?: string; features?: Record<string, boolean>; iconOverride?: string; nameOverride?: string; colorScheme?: string; displayHints?: Record<string, unknown>; gestureConfig?: Record<string, unknown> },
      ) => Record<string, unknown>;
      filterAttributes: (attributes: Record<string, unknown>) => Record<string, unknown>;
    };
  }
}

const _WIDGET_SRC = `/harvest_assets/harvest.min.js?v=${buildVersion.build}`;
let _widgetScriptLoaded = false;
let _widgetScriptLoading: Promise<void> | null = null;

export function loadWidgetScript(): Promise<void> {
  if (_widgetScriptLoaded) return Promise.resolve();
  if (_widgetScriptLoading) return _widgetScriptLoading;
  _widgetScriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = _WIDGET_SRC;
    script.onload = () => { _widgetScriptLoaded = true; resolve(); };
    script.onerror = () => { _widgetScriptLoading = null; reject(new Error("Failed to load harvest.min.js")); };
    document.head.appendChild(script);
  });
  return _widgetScriptLoading;
}

const _loadedPacks = new Set<string>();
const _loadingPacks = new Map<string, Promise<void>>();
const _packCacheBust = new Map<string, string>();

export function loadPackScript(packId: string): Promise<void> {
  if (_loadedPacks.has(packId)) return Promise.resolve();
  const existing = _loadingPacks.get(packId);
  if (existing) return existing;
  const bust = _packCacheBust.get(packId) || String(buildVersion.build);
  const p = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `/api/harvest/packs/${encodeURIComponent(packId)}.js?v=${bust}`;
    // Tell the pack IIFE which ID to register under (may differ from its hardcoded default)
    (window as { __HARVEST_PACK_ID__?: string | null }).__HARVEST_PACK_ID__ = packId;
    script.onload = () => {
      (window as { __HARVEST_PACK_ID__?: string | null }).__HARVEST_PACK_ID__ = null;
      _loadedPacks.add(packId);
      _loadingPacks.delete(packId);
      resolve();
    };
    script.onerror = () => {
      (window as { __HARVEST_PACK_ID__?: string | null }).__HARVEST_PACK_ID__ = null;
      _loadingPacks.delete(packId);
      reject(new Error(`Failed to load pack ${packId}`));
    };
    document.head.appendChild(script);
  });
  _loadingPacks.set(packId, p);
  return p;
}

/** Call after uploading new pack JS to force a fresh script fetch on next preview render. */
export function clearPackCache(packId: string): void {
  _loadedPacks.delete(packId);
  _loadingPacks.delete(packId);
  _packCacheBust.set(packId, String(Date.now()));
}

export function resolveVars(
  theme: ThemeDefinition | null,
  editedVars: Record<string, string> | null,
  editedDarkVars: Record<string, string> | null,
  _colorMode: "light" | "dark" | "auto",
): Record<string, string> {
  if (!theme && !editedVars) return {};
  const base = editedVars ?? theme?.variables ?? {};
  const dark = editedDarkVars ?? theme?.dark_variables ?? {};
  const usesDark = _colorMode === "dark" || (_colorMode === "auto" && getHaDarkMode());
  return usesDark ? { ...base, ...dark } : { ...base };
}

export function resolveThemeObj(
  theme: ThemeDefinition | null,
  editedVars: Record<string, string> | null,
  editedDarkVars: Record<string, string> | null,
): { variables: Record<string, string>; dark_variables: Record<string, string> } {
  return {
    variables: editedVars ?? theme?.variables ?? {},
    dark_variables: editedDarkVars ?? theme?.dark_variables ?? {},
  };
}


export function generateMockHistory(domain: string, graphType: GraphType, state: string): Array<{ t: string; s: string }> {
  const now = Date.now();
  const hours = 24;
  const points: Array<{ t: string; s: string }> = [];

  if (graphType === "step" || domain === "binary_sensor") {
    const segments = 8;
    let val = 1;
    for (let i = 0; i < segments; i++) {
      const t = now - hours * 3600_000 + (i / segments) * hours * 3600_000;
      points.push({ t: new Date(t).toISOString(), s: val ? "on" : "off" });
      val = val ? 0 : 1;
    }
    points.push({ t: new Date(now).toISOString(), s: state === "on" ? "on" : "off" });
    return points;
  }

  const numericState = parseFloat(state) || 22;
  const amplitude = numericState * 0.2;
  const count = 24;
  for (let i = 0; i <= count; i++) {
    const t = now - hours * 3600_000 + (i / count) * hours * 3600_000;
    const wave = Math.sin((i / count) * Math.PI * 3) * amplitude;
    const noise = (Math.random() - 0.5) * amplitude * 0.3;
    const val = numericState + wave + noise;
    points.push({ t: new Date(t).toISOString(), s: val.toFixed(1) });
  }
  return points;
}

// ---------------------------------------------------------------------------
// RealWidget - renders a single hrv-card preview
// ---------------------------------------------------------------------------

function RealWidget({ mock, themeObj, capability, features, graphType, packId }: {
  mock: MockEntity;
  themeObj: { variables: Record<string, string>; dark_variables: Record<string, string> };
  capability: "read" | "read-write";
  features: Record<string, boolean>;
  graphType: GraphType;
  packId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (packId && !_loadedPacks.has(packId)) {
        setReady(false);
      }
      await loadWidgetScript();
      if (packId) await loadPackScript(packId).catch(() => {});
      setReady(true);
    };
    load().catch(() => setLoadError(true));
  }, [packId]);

  const featKey = Object.entries(features).filter(([, v]) => v).map(([k]) => k).sort().join(",");
  const cardKey = `${mock.domain}:${mock.friendly_name}:${capability}:${featKey}:${graphType}:${packId ?? ""}`;

  useEffect(() => {
    if (!ready || !containerRef.current || !window.HArvest) return;

    const container = containerRef.current;
    container.innerHTML = "";
    cardRef.current = null;

    const entityDef = window.HArvest.buildEntityDef(
      { domain: mock.domain, state: mock.state, friendly_name: mock.friendly_name,
        attributes: mock.attributes, unit: mock.unit },
      { capabilities: capability, features,
        ...(mock.domain === "weather" && features.forecast ? { displayHints: { show_forecast: true } } : {}) },
    );
    const attrs = window.HArvest.filterAttributes(mock.attributes);

    const graphOpts: Record<string, unknown> = {};
    if (graphType !== "none") {
      graphOpts.graph = graphType;
      graphOpts.hours = 24;
      graphOpts.historyData = generateMockHistory(mock.domain, graphType, mock.state);
    }
    if (packId) graphOpts.packId = packId;
    if (features.animate) graphOpts.animate = true;
    const opts = Object.keys(graphOpts).length > 0 ? graphOpts : undefined;

    const card = window.HArvest.preview(container, entityDef, mock.state, attrs, themeObj as any, opts as any);
    cardRef.current = card;

    return () => {
      container.innerHTML = "";
      cardRef.current = null;
    };
  }, [ready, cardKey]);

  const themeJson = JSON.stringify(themeObj);
  useEffect(() => {
    const card = cardRef.current as (HTMLElement & { applyPreviewTheme?: (v: Record<string, unknown>) => void }) | null;
    if (!card?.applyPreviewTheme) return;
    card.applyPreviewTheme(themeObj);
  }, [themeJson]);

  const stateKey = `${mock.state}:${JSON.stringify(mock.attributes)}`;
  useEffect(() => {
    if (!window.HArvest) return;
    const card = cardRef.current as (HTMLElement & { updatePreviewState?: (s: string, a: Record<string, unknown>) => void }) | null;
    if (!card?.updatePreviewState) return;
    const attrs = window.HArvest.filterAttributes(mock.attributes);
    card.updatePreviewState(mock.state, attrs);
  }, [stateKey]);

  if (loadError) {
    return <div className="muted" style={{ padding: 16, textAlign: "center" }}>Failed to load widget preview.</div>;
  }

  return (
    <div
      ref={containerRef}
      className="theme-preview-widget"
      style={{ display: "flex", justifyContent: "center", minHeight: 120 }}
    />
  );
}

// ---------------------------------------------------------------------------
// WidgetPreview - full preview with controls
// ---------------------------------------------------------------------------

interface WidgetPreviewProps {
  variables: Record<string, string>;
  darkVariables?: Record<string, string>;
  packId?: string;
}

const _ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

export function WidgetPreview({ variables, darkVariables, packId }: WidgetPreviewProps) {
  const _initRenderer = _ls.get("hrv_preview_renderer") ?? "light";
  const _initEntity   = _ls.get("hrv_preview_entity") ?? "";

  const [renderer, setRenderer] = useState(_initRenderer);
  const [capability, setCapability] = useState<"read" | "read-write">(() =>
    _ls.get("hrv_preview_capability") === "read" ? "read" : "read-write"
  );
  const [colorMode, setColorMode] = useState<"light" | "dark" | "auto">(() => {
    const stored = _ls.get("hrv_preview_color_mode");
    return (stored === "light" || stored === "dark" || stored === "auto") ? stored : "auto";
  });
  const [bgTone, setBgTone] = useState(0);
  const [features, setFeatures] = useState<Record<string, boolean>>(defaultFeatures(_initRenderer));
  const [graphType, setGraphType] = useState<GraphType>(() => {
    const stored = _ls.get("hrv_preview_graph_type") as GraphType | null;
    return stored ?? DEFAULT_GRAPH[_initRenderer] ?? "none";
  });

  const [previewEntity, setPreviewEntity] = useState(_initEntity);
  const [realEntity, setRealEntity] = useState<HAEntityDetail | null>(null);
  const selectingRef = useRef(false);

  // On mount, re-fetch stored custom entity details
  useEffect(() => {
    if (!_initEntity) return;
    api.entities.get(_initEntity).then(detail => {
      setRealEntity(detail);
      const domain = detail.entity_id.split(".")[0];
      setRenderer("custom");
      setFeatures(detectFeatures(domain, detail.attributes));
    }).catch(() => {
      _ls.del("hrv_preview_entity");
      setPreviewEntity("");
      setRenderer(_ls.get("hrv_preview_renderer") ?? "light");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRendererChange = (value: string) => {
    setRenderer(value);
    setPreviewEntity("");
    setRealEntity(null);
    setFeatures(defaultFeatures(value));
    setGraphType(DEFAULT_GRAPH[value] ?? "none");
    _ls.set("hrv_preview_renderer", value);
    _ls.del("hrv_preview_entity");
    _ls.set("hrv_preview_graph_type", DEFAULT_GRAPH[value] ?? "none");
  };

  const handleEntitySelect = async (entityId: string) => {
    selectingRef.current = true;
    setPreviewEntity(entityId);
    _ls.set("hrv_preview_entity", entityId);
    try {
      const detail = await api.entities.get(entityId);
      setRealEntity(detail);
      const domain = detail.entity_id.split(".")[0];
      setRenderer("custom");
      setFeatures(detectFeatures(domain, detail.attributes));
      setGraphType(DEFAULT_GRAPH[domain] ?? "none");
      _ls.set("hrv_preview_renderer", "custom");
      _ls.set("hrv_preview_graph_type", DEFAULT_GRAPH[domain] ?? "none");
    } catch {
      setRenderer("custom");
      _ls.set("hrv_preview_renderer", "custom");
    }
  };

  const handleEntityChange = (v: string) => {
    if (selectingRef.current && v === "") {
      selectingRef.current = false;
      return;
    }
    setPreviewEntity(v);
    setRealEntity(null);
  };

  const handleEntityClear = () => {
    setPreviewEntity("");
    setRealEntity(null);
    setFeatures(defaultFeatures(renderer));
    _ls.del("hrv_preview_entity");
  };

  const realDomain = realEntity ? realEntity.entity_id.split(".")[0] : null;
  const baseMock = MOCK_ENTITIES[renderer] ?? (realDomain ? MOCK_ENTITIES[realDomain] : null) ?? MOCK_ENTITIES.light;
  const previewMock: MockEntity = realEntity ? {
    domain: realDomain!,
    label: baseMock.label,
    friendly_name: (realEntity.attributes.friendly_name as string) ?? realEntity.entity_id,
    state: realEntity.state,
    unit: (realEntity.attributes.unit_of_measurement as string) ?? baseMock.unit,
    attributes: { ...realEntity.attributes, _entity_id: realEntity.entity_id },
  } : baseMock;

  const effectiveDomain = renderer === "custom" ? (realDomain ?? "light") : renderer;
  const domainFeatures = DOMAIN_FEATURES[effectiveDomain] ?? [];
  const graphOptions = GRAPH_DOMAINS[effectiveDomain];

  const themeObj = { variables, dark_variables: darkVariables ?? {} };
  const usesDark = colorMode === "dark" || (colorMode === "auto" && getHaDarkMode());

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <select
          className="input"
          value={renderer}
          onChange={e => handleRendererChange(e.target.value)}
          style={{ flex: 1, minWidth: 140 }}
        >
          {RENDERER_OPTIONS.filter(o => o.value !== "custom" || realEntity).map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="segmented" role="group" aria-label="Capability">
          <button aria-pressed={capability === "read"} onClick={() => { setCapability("read"); _ls.set("hrv_preview_capability", "read"); }}>Read</button>
          <button aria-pressed={capability === "read-write"} onClick={() => { setCapability("read-write"); _ls.set("hrv_preview_capability", "read-write"); }}>Control</button>
        </div>
        <div className="segmented" role="group" aria-label="Color mode">
          <button aria-pressed={colorMode === "light"} onClick={() => { setColorMode("light"); _ls.set("hrv_preview_color_mode", "light"); }}>Light</button>
          <button aria-pressed={colorMode === "dark"} onClick={() => { setColorMode("dark"); _ls.set("hrv_preview_color_mode", "dark"); }}>Dark</button>
          <button aria-pressed={colorMode === "auto"} onClick={() => { setColorMode("auto"); _ls.set("hrv_preview_color_mode", "auto"); }}>Auto</button>
        </div>
      </div>

      {(domainFeatures.length > 0 || graphOptions) && (
        <div className="row" style={{ gap: 12, flexWrap: "wrap", fontSize: 12 }}>
          {domainFeatures.map(f => (
            <div key={f.key} className="row" style={{ gap: 8, alignItems: "center" }}>
              <Toggle
                checked={features[f.key] ?? f.default}
                onChange={v => setFeatures(prev => ({ ...prev, [f.key]: v }))}
              />
              <span>{f.label}</span>
            </div>
          ))}
          {graphOptions && (
            <label className="row" style={{ gap: 4, alignItems: "center" }}>
              Graph:
              <select
                className="input"
                value={graphType}
                onChange={e => { setGraphType(e.target.value as GraphType); _ls.set("hrv_preview_graph_type", e.target.value); }}
                style={{ fontSize: 12, padding: "2px 4px" }}
              >
                {graphOptions.map(g => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <EntityAutocomplete
          value={previewEntity}
          onChange={handleEntityChange}
          onSelect={handleEntitySelect}
          placeholder="Try with your own entity (optional)"
        />
        {previewEntity && (
          <button
            className="entity-clear-btn"
            onClick={handleEntityClear}
            aria-label="Clear entity"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
        <div
          className="theme-preview-stage"
          style={{
            flex: 1,
            background: (() => {
              const toneColor = usesDark
                ? (darkVariables?.["--hrv-color-surface"] ?? variables?.["--hrv-color-surface"] ?? "#1a1a2e")
                : "#1a1a2e";
              if (bgTone === 0) return "transparent";
              return `color-mix(in srgb, ${toneColor} ${bgTone}%, transparent)`;
            })(),
          }}
        >
          <RealWidget mock={previewMock} themeObj={themeObj} capability={capability} features={features} graphType={graphType} packId={packId} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 12 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={bgTone}
            onChange={ev => setBgTone(Number(ev.target.value))}
            orient="vertical"
            aria-label="Preview background tone"
            title="Adjust preview background tone"
            className="preview-bg-slider"
          />
        </div>
      </div>
    </div>
  );
}
