/**
 * Settings.tsx - Integration configuration screen.
 *
 * Card-based sections with auto-save on blur (300ms debounce).
 * Dark/Light/Auto theme toggle stored in localStorage via App.tsx.
 * Help & resources card at the bottom.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { IntegrationConfig, HaEventBusConfig } from "../types";
import type { AppTheme } from "../App";
import { api } from "../api";
import { Spinner, ErrorBanner, Card } from "./Shared";
import { Icon } from "./Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SaveState = "idle" | "saving" | "error";

// ---------------------------------------------------------------------------
// NumberField
// ---------------------------------------------------------------------------

interface NumberFieldProps {
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  onChange: (v: number) => Promise<void>;
  hint?: string;
}

function NumberField({ label, value: initial, suffix, min, max, onChange, hint }: NumberFieldProps) {
  const [localVal,  setLocalVal]  = useState(String(initial));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errMsg,    setErrMsg]    = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalVal(String(initial)); }, [initial]);

  const commit = useCallback(async (raw: string) => {
    const n = Number(raw);
    if (!raw || isNaN(n)) { setSaveState("error"); setErrMsg("Must be a number"); return; }
    if (min !== undefined && n < min) { setSaveState("error"); setErrMsg(`Minimum ${min}`); return; }
    if (max !== undefined && n > max) { setSaveState("error"); setErrMsg(`Maximum ${max}`); return; }
    setSaveState("saving");
    setErrMsg("");
    try {
      await onChange(n);
      setSaveState("idle");
    } catch (e) {
      setSaveState("error");
      setErrMsg(String(e));
    }
  }, [onChange, min, max]);

  const handleChange = (v: string) => {
    setLocalVal(v);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(v), 300);
  };

  return (
    <div className="kv" style={{ paddingBottom: 8 }}>
      <dt>
        {label}
        {hint && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{hint}</div>}
      </dt>
      <dd>
        <div className="row" style={{ gap: 8 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type="number"
              value={localVal}
              min={min}
              max={max}
              onChange={e => handleChange(e.target.value)}
              onBlur={() => commit(localVal)}
              className="input"
              style={{ width: 90, borderColor: saveState === "error" ? "var(--danger)" : undefined }}
            />
            {saveState === "saving" && (
              <span style={{ position: "absolute", right: 6 }}><Spinner size={14} /></span>
            )}
          </div>
          {suffix && <span className="muted" style={{ fontSize: 13 }}>{suffix}</span>}
        </div>
        {saveState === "error" && errMsg && (
          <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>{errMsg}</div>
        )}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  validate?: (v: string) => string | null;
  onChange: (v: string) => Promise<void>;
}

function TextField({ label, value: initial, placeholder, hint, validate, onChange }: TextFieldProps) {
  const [localVal,  setLocalVal]  = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errMsg,    setErrMsg]    = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setLocalVal(initial); }, [initial]);

  const commit = useCallback(async (raw: string) => {
    const err = validate?.(raw.trim()) ?? null;
    if (err) { setSaveState("error"); setErrMsg(err); return; }
    setSaveState("saving");
    setErrMsg("");
    try {
      await onChange(raw.trim());
      setSaveState("idle");
    } catch (e) {
      setSaveState("error");
      setErrMsg(String(e));
    }
  }, [onChange, validate]);

  const handleChange = (v: string) => {
    setLocalVal(v);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(v), 500);
  };

  return (
    <div className="kv" style={{ paddingBottom: 8 }}>
      <dt>
        {label}
        {hint && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{hint}</div>}
      </dt>
      <dd>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={localVal}
            placeholder={placeholder}
            onChange={e => handleChange(e.target.value)}
            onBlur={() => commit(localVal)}
            className="input"
            style={{ width: "100%", borderColor: saveState === "error" ? "var(--danger)" : undefined }}
          />
          {saveState === "saving" && (
            <span style={{ position: "absolute", right: 6 }}><Spinner size={14} /></span>
          )}
        </div>
        {saveState === "error" && errMsg && (
          <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>{errMsg}</div>
        )}
      </dd>
    </div>
  );
}

function validateOverrideHost(v: string): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "Must use http:// or https://";
    if (u.pathname !== "/" || u.search || u.hash) return "Must be a bare origin with no path (e.g. https://ha.example.com)";
    return null;
  } catch {
    return "Must be a valid URL (e.g. https://ha.example.com)";
  }
}

function validateWidgetScriptUrl(v: string): string | null {
  if (!v) return null;
  if (v.startsWith("/")) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "Must be a path (e.g. /harvest.min.js) or a full https:// URL";
    return null;
  } catch {
    return "Must be a path (e.g. /harvest.min.js) or a full https:// URL";
  }
}

// ---------------------------------------------------------------------------
// ToggleField
// ---------------------------------------------------------------------------

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => Promise<void>;
  hint?: string;
}

function ToggleField({ label, value, onChange, hint }: ToggleFieldProps) {
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const toggle = async () => {
    setSaving(true);
    setErr("");
    try { await onChange(!value); }
    catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="row" style={{ justifyContent: "space-between", paddingBottom: 8 }}>
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {hint && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{hint}</div>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button
          onClick={toggle}
          disabled={saving}
          aria-pressed={value}
          className={`btn btn-sm ${value ? "btn-primary" : "btn-ghost"}`}
          style={{ minWidth: 52 }}
        >
          {saving ? "..." : value ? "ON" : "OFF"}
        </button>
        {err && <span style={{ fontSize: 12, color: "var(--danger)" }}>{err}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrustedProxiesField
// ---------------------------------------------------------------------------

interface TrustedProxiesFieldProps {
  value: string[];
  onChange: (v: string[]) => Promise<void>;
}

function TrustedProxiesField({ value, onChange }: TrustedProxiesFieldProps) {
  const [localVal,  setLocalVal]  = useState(value.join("\n"));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errMsg,    setErrMsg]    = useState("");

  useEffect(() => { setLocalVal(value.join("\n")); }, [value]);

  const commit = useCallback(async (raw: string) => {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const bad = lines.find(l => !/^\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?$/.test(l) && !/^[0-9a-fA-F:]+\/?\d*$/.test(l));
    if (bad) {
      setSaveState("error");
      setErrMsg(`Invalid entry: ${bad}`);
      return;
    }
    setSaveState("saving");
    setErrMsg("");
    try {
      await onChange(lines);
      setSaveState("idle");
    } catch (e) {
      setSaveState("error");
      setErrMsg(String(e));
    }
  }, [onChange]);

  return (
    <div className="kv" style={{ paddingBottom: 8 }}>
      <dt style={{ alignSelf: "start", paddingTop: 6 }}>
        Trusted proxies
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          CIDR ranges of reverse proxies (one per line). When a connection arrives from a trusted proxy, the real client IP is read from X-Forwarded-For.
        </div>
      </dt>
      <dd>
        <div style={{ position: "relative" }}>
          <textarea
            value={localVal}
            placeholder={"192.168.1.1\n10.0.0.0/8"}
            rows={3}
            onChange={e => { setLocalVal(e.target.value); setSaveState("idle"); }}
            onBlur={() => commit(localVal)}
            className="input"
            style={{
              width: "100%",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              resize: "vertical",
              borderColor: saveState === "error" ? "var(--danger)" : undefined,
            }}
          />
          {saveState === "saving" && (
            <span style={{ position: "absolute", top: 8, right: 8 }}><Spinner size={14} /></span>
          )}
        </div>
        {saveState === "error" && errMsg && (
          <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>{errMsg}</div>
        )}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThemeToggle
// ---------------------------------------------------------------------------

interface ThemeToggleProps {
  theme: AppTheme;
  onThemeChange: (t: AppTheme) => void;
}

function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const options: { value: AppTheme; label: string }[] = [
    { value: "auto",  label: "Auto"  },
    { value: "light", label: "Light" },
    { value: "dark",  label: "Dark"  },
  ];
  return (
    <div className="row" style={{ justifyContent: "space-between", paddingBottom: 8 }}>
      <div style={{ fontSize: 14 }}>Theme</div>
      <div className="segmented" role="group" aria-label="Theme preference">
        {options.map(o => (
          <button
            key={o.value}
            aria-pressed={theme === o.value}
            onClick={() => onThemeChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

interface SettingsProps {
  theme: AppTheme;
  onThemeChange: (t: AppTheme) => void;
  onKillSwitchChange?: (v: boolean) => void;
}

export function Settings({ theme, onThemeChange, onKillSwitchChange }: SettingsProps) {
  const [config,  setConfig]  = useState<IntegrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    api.config.get().then(setConfig).catch(e => setError(String(e))).finally(() => setLoading(false));
  }, []);

  const patch = useCallback(async (data: Partial<IntegrationConfig>) => {
    const updated = await api.config.update(data);
    setConfig(updated);
  }, []);

  const patchNum = (field: keyof IntegrationConfig) => async (v: number) => {
    await patch({ [field]: v } as Partial<IntegrationConfig>);
  };

  const patchEventBus = (field: keyof HaEventBusConfig) => async (v: boolean) => {
    if (!config) return;
    await patch({ ha_event_bus: { ...config.ha_event_bus, [field]: v } });
  };

  const patchDefaultSession = (field: "lifetime_minutes" | "max_lifetime_minutes") => async (v: number) => {
    if (!config) return;
    await patch({ default_session: { ...config.default_session, [field]: v } });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: 32 }}>
        {error && <ErrorBanner message={error} />}
      </div>
    );
  }

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Appearance */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="eye" size={14} /> Appearance</span>}
      >
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
      </Card>

      {/* Security */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="shield" size={14} /> Security</span>}
      >
        <dl>
          <NumberField label="Max entities per widget" value={config.max_entities_per_token} min={1} max={250}
            onChange={patchNum("max_entities_per_token")} />
          <NumberField label="Max auth attempts per widget / min" value={config.max_auth_attempts_per_token_per_minute} suffix="/ min" min={1}
            onChange={patchNum("max_auth_attempts_per_token_per_minute")} />
          <NumberField label="Max auth attempts per IP / min" value={config.max_auth_attempts_per_ip_per_minute} suffix="/ min" min={1}
            onChange={patchNum("max_auth_attempts_per_ip_per_minute")} />
          <TrustedProxiesField
            value={config.trusted_proxies ?? []}
            onChange={async (v) => { await patch({ trusted_proxies: v }); }}
          />
          <TextField
            label="Override host"
            value={config.override_host}
            placeholder="https://ha.example.com"
            hint="When set, the widget wizard uses this URL instead of the current browser host when generating code snippets."
            validate={validateOverrideHost}
            onChange={v => patch({ override_host: v })}
          />
          <TextField
            label="Widget script URL"
            value={config.widget_script_url}
            placeholder="https://cdn.jsdelivr.net/gh/sfox38/harvest@latest/widget/dist/harvest.min.js"
            hint="Custom URL for the widget JS. Accepts a full URL or a path (e.g. /js/harvest.min.js). Leave blank to use the default CDN."
            validate={validateWidgetScriptUrl}
            onChange={v => patch({ widget_script_url: v })}
          />
        </dl>
      </Card>

      {/* Sessions */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="plug" size={14} /> Sessions</span>}
      >
        <ToggleField
          label="Kill switch"
          value={config.kill_switch ?? false}
          hint="Immediately disconnect ALL sessions and block new connections. Use in emergencies."
          onChange={async (v) => {
            await patch({ kill_switch: v });
            onKillSwitchChange?.(v);
          }}
        />
        <div style={{ height: 1, background: "var(--divider)", margin: "8px 0 12px" }} />
        <dl>
          <NumberField label="Default session lifetime" value={config.default_session.lifetime_minutes} suffix="minutes" min={1}
            onChange={patchDefaultSession("lifetime_minutes")} />
          <NumberField label="Max session lifetime" value={config.default_session.max_lifetime_minutes} suffix="minutes" min={1}
            onChange={patchDefaultSession("max_lifetime_minutes")} />
          <NumberField label="Absolute session lifetime cap" value={config.absolute_session_lifetime_hours} suffix="hours" min={1}
            hint="Hard cap across all widgets. Sessions cannot exceed this regardless of widget settings."
            onChange={patchNum("absolute_session_lifetime_hours")} />
        </dl>
      </Card>

      {/* Performance */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="bolt" size={14} /> Performance</span>}
      >
        <dl>
          <NumberField label="Auth timeout" value={config.auth_timeout_seconds} suffix="seconds" min={1} max={60}
            onChange={patchNum("auth_timeout_seconds")} />
          <NumberField label="Keepalive interval" value={config.keepalive_interval_seconds} suffix="seconds" min={5} max={300}
            onChange={patchNum("keepalive_interval_seconds")} />
          <NumberField label="Keepalive timeout" value={config.keepalive_timeout_seconds} suffix="seconds" min={1} max={60}
            onChange={patchNum("keepalive_timeout_seconds")} />
          <NumberField label="Heartbeat timeout" value={config.heartbeat_timeout_seconds} suffix="seconds" min={5} max={600}
            onChange={patchNum("heartbeat_timeout_seconds")} />
        </dl>
      </Card>

      {/* Activity log */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="database" size={14} /> Activity log</span>}
      >
        <dl>
          <NumberField label="Retention" value={config.activity_log_retention_days} suffix="days" min={1} max={365}
            onChange={patchNum("activity_log_retention_days")} />
        </dl>
        <div className="badge badge-warn" style={{ fontSize: 12, marginTop: 4 }}>
          The activity database is not included in HA backups. Back it up manually if needed.
        </div>
      </Card>

      {/* HA Event Bus */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="waves" size={14} /> HA event bus</span>}
      >
        {(Object.keys(config.ha_event_bus) as (keyof HaEventBusConfig)[]).map(key => (
          <ToggleField
            key={key}
            label={key.replace(/^harvest_/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            value={config.ha_event_bus[key]}
            onChange={patchEventBus(key)}
          />
        ))}
      </Card>

      {/* Help & resources */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="help" size={14} /> Help & resources</span>}
        pad={false}
      >
        {[
          { label: "Documentation",     sub: "Widgets, tokens, security - everything.",     href: "https://github.com/sfox38/harvest/wiki" },
          { label: "Getting started",   sub: "Create your first widget in 2 minutes.",      href: "https://github.com/sfox38/harvest/blob/main/docs/getting-started.md" },
          { label: "Report an issue",   sub: "Found a bug? File it on GitHub.",             href: "https://github.com/sfox38/harvest/issues" },
          { label: "GitHub repository", sub: "Source, releases, and roadmap.",              href: "https://github.com/sfox38/harvest" },
        ].map(l => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="widget-row"
            style={{ textDecoration: "none", color: "inherit", gridTemplateColumns: "1fr auto" }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{l.label}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{l.sub}</div>
            </div>
            <Icon name="external" size={15} />
          </a>
        ))}
      </Card>

      <div className="muted" style={{ fontSize: 12, textAlign: "center", padding: "4px 0 20px" }}>
        HArvest - MIT License
      </div>
    </div>
  );
}
