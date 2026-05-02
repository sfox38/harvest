/**
 * Settings.tsx - Integration configuration screen.
 *
 * Card-based sections with auto-save on blur (300ms debounce).
 * Dark/Light/Auto theme toggle stored in localStorage via App.tsx.
 * Integration Info card at the bottom.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { IntegrationConfig, HaEventBusConfig, PanelStats } from "../types";
import type { AppTheme } from "../App";
import { api } from "../api";
import { Spinner, ErrorBanner, Card, Hint, fmtBytes } from "./Shared";
import { Icon } from "./Icon";
import { Toggle } from "./Toggle";
import buildVersion from "../buildVersion.json";

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
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

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
        {hint && <div className="settings-field-hint">{hint}</div>}
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
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

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
        {hint && <div className="settings-field-hint">{hint}</div>}
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

  const toggle = async (v: boolean) => {
    setSaving(true);
    setErr("");
    try { await onChange(v); }
    catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="row" style={{ justifyContent: "space-between", paddingBottom: 8, gap: 12 }}>
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {hint && <div className="settings-field-hint">{hint}</div>}
      </div>
      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
        <Toggle checked={value} onChange={toggle} disabled={saving} />
        {err && <span style={{ fontSize: 12, color: "var(--danger)" }}>{err}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SelectField
// ---------------------------------------------------------------------------

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => Promise<void>;
  hint?: string;
}

function SelectField({ label, value, options, onChange, hint }: SelectFieldProps) {
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const commit = async (v: string) => {
    if (v === value) return;
    setSaving(true);
    setErr("");
    try { await onChange(v); }
    catch (e) { setErr(String(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="kv" style={{ paddingBottom: 8 }}>
      <dt>
        {label}
        {hint && <div className="settings-field-hint">{hint}</div>}
      </dt>
      <dd>
        <select
          value={value}
          onChange={e => commit(e.target.value)}
          disabled={saving}
          className="input"
          style={{ fontSize: 13 }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {err && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>{err}</div>}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TrustedProxiesField
// ---------------------------------------------------------------------------

function isValidCidr(entry: string): boolean {
  // IPv4 or IPv4/prefix
  const v4Match = entry.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(\/(\d{1,2}))?$/);
  if (v4Match) {
    const octets = [v4Match[1], v4Match[2], v4Match[3], v4Match[4]];
    if (octets.some(o => parseInt(o, 10) > 255)) return false;
    if (v4Match[6] !== undefined && parseInt(v4Match[6], 10) > 32) return false;
    return true;
  }
  // IPv6 with optional /prefix
  const v6Match = entry.match(/^([0-9a-fA-F:]+)(\/(\d{1,3}))?$/);
  if (v6Match) {
    if (v6Match[3] !== undefined && parseInt(v6Match[3], 10) > 128) return false;
    return true;
  }
  return false;
}

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
    const bad = lines.find(l => !isValidCidr(l));
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
        <div className="settings-field-hint">
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
  const [stats,   setStats]   = useState<PanelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.config.get(), api.stats.get()])
      .then(([cfg, st]) => { setConfig(cfg); setStats(st); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
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
        <div style={{ height: 1, background: "var(--divider)", margin: "8px 0 12px" }} />
        <div className="muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Widget defaults
        </div>
        <dl>
          <SelectField
            label="Accessibility"
            value={config.default_a11y}
            options={[
              { value: "standard", label: "Standard" },
              { value: "enhanced", label: "Enhanced" },
            ]}
            hint="Enhanced adds aria-live announcements for state changes."
            onChange={v => patch({ default_a11y: v } as Partial<IntegrationConfig>)}
          />
          <SelectField
            label="Language"
            value={config.default_lang}
            options={[
              { value: "auto", label: "Auto-detect" },
              { value: "en", label: "English" },
              { value: "de", label: "Deutsch" },
              { value: "fr", label: "Français" },
              { value: "es", label: "Español" },
              { value: "pt", label: "Português" },
              { value: "nl", label: "Nederlands" },
              { value: "ja", label: "日本語" },
              { value: "zh-Hans", label: "简体中文" },
              { value: "zh-Hant", label: "繁體中文" },
              { value: "th", label: "ไทย" },
            ]}
            hint="Default language for all widgets. Individual widgets can override this."
            onChange={v => patch({ default_lang: v } as Partial<IntegrationConfig>)}
          />
          <SelectField
            label="When offline"
            value={config.default_on_offline}
            options={[
              { value: "last-state", label: "Show last known state" },
              { value: "message", label: "Show message" },
              { value: "dim", label: "Dim card" },
              { value: "hide", label: "Hide card" },
            ]}
            hint="Default behavior when a widget loses connection."
            onChange={v => patch({ default_on_offline: v } as Partial<IntegrationConfig>)}
          />
          <TextField
            label="Default offline message"
            value={config.default_offline_text}
            placeholder="Auto (i18n)"
            hint="Shown when connection is lost. Leave blank for the localized default."
            validate={v => {
              if (v.length > 200) return "200 characters max.";
              if (v && /[<>"';\\]|--|\/\*|\*\/|\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC)\b/i.test(v)) return "Contains disallowed characters.";
              return null;
            }}
            onChange={v => patch({ default_offline_text: v } as Partial<IntegrationConfig>)}
          />
          <SelectField
            label="When error"
            value={config.default_on_error}
            options={[
              { value: "message", label: "Show message" },
              { value: "dim", label: "Dim card" },
              { value: "hide", label: "Hide card" },
            ]}
            hint="Default behavior on auth failure or missing entity."
            onChange={v => patch({ default_on_error: v } as Partial<IntegrationConfig>)}
          />
          <TextField
            label="Default error message"
            value={config.default_error_text}
            placeholder="Auto (i18n)"
            hint="Shown on auth failure or missing entity. Leave blank for the localized default."
            validate={v => {
              if (v.length > 200) return "200 characters max.";
              if (v && /[<>"';\\]|--|\/\*|\*\/|\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC)\b/i.test(v)) return "Contains disallowed characters.";
              return null;
            }}
            onChange={v => patch({ default_error_text: v } as Partial<IntegrationConfig>)}
          />
        </dl>
      </Card>

      {/* Security */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="shield" size={14} /> Security</span>}
      >
        <dl>
          <NumberField label="Max entities per widget" value={config.max_entities_per_token} min={1} max={250}
            hint="Maximum number of HA entities a single widget token can expose."
            onChange={patchNum("max_entities_per_token")} />
          <NumberField label="Max auth attempts per widget / min" value={config.max_auth_attempts_per_token_per_minute} suffix="/ min" min={1}
            hint="Rate limit on failed auth attempts per widget. Protects against brute-force token guessing."
            onChange={patchNum("max_auth_attempts_per_token_per_minute")} />
          <NumberField label="Max auth attempts per IP / min" value={config.max_auth_attempts_per_ip_per_minute} suffix="/ min" min={1}
            hint="Rate limit on failed auth attempts from a single IP address."
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
            placeholder="https://example.com/harvest.min.js"
            hint="URL for the widget JS. Accepts a full URL or a path (e.g. /js/harvest.min.js). Leave blank to serve the bundled file."
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
            hint="How long a widget has to complete the auth handshake before the connection is dropped."
            onChange={patchNum("auth_timeout_seconds")} />
          <NumberField label="Keepalive interval" value={config.keepalive_interval_seconds} suffix="seconds" min={5} max={300}
            hint="How often the server sends a ping to each connected widget to check it is still alive."
            onChange={patchNum("keepalive_interval_seconds")} />
          <NumberField label="Keepalive timeout" value={config.keepalive_timeout_seconds} suffix="seconds" min={1} max={60}
            hint="How long the server waits for a pong reply before considering the connection dead."
            onChange={patchNum("keepalive_timeout_seconds")} />
          <NumberField label="Heartbeat timeout" value={config.heartbeat_timeout_seconds} suffix="seconds" min={5} max={600}
            hint="If no message arrives from a widget within this window, the session is closed."
            onChange={patchNum("heartbeat_timeout_seconds")} />
        </dl>
      </Card>

      {/* Activity log */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="database" size={14} /> Activity log</span>}
      >
        <dl>
          <NumberField label="Retention" value={config.activity_log_retention_days} suffix="days" min={1} max={365}
            hint="Events older than this are automatically purged from the SQLite database."
            onChange={patchNum("activity_log_retention_days")} />
        </dl>
        <div className="badge badge-warn" style={{ fontSize: 12, marginTop: 4 }}>
          The activity database is not included in HA backups. Back it up manually if needed.
        </div>
      </Card>

      {/* HA Event Bus */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><Icon name="waves" size={14} /> HA event bus <Hint text="Enable or disable specific harvest_* events fired on the HA event bus. Automations can listen for these." /></span>}
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

      {/* Integration info */}
      <Card title={<span className="row" style={{ gap: 8 }}><Icon name="info" size={14} /> Integration info</span>}>
        <table className="info-table">
          <tbody>
            <tr>
              <td className="info-label">HArvest Version</td>
              <td>{config.platform_version ?? "-"}</td>
            </tr>
            <tr>
              <td className="info-label">JS Build</td>
              <td>{buildVersion.build}</td>
            </tr>
            <tr>
              <td className="info-label">Minimum HA Version</td>
              <td>2024.1.0</td>
            </tr>
            <tr>
              <td className="info-label">Database Size</td>
              <td>{stats ? fmtBytes(stats.db_size_bytes) : "-"}</td>
            </tr>
            <tr>
              <td className="info-label">GitHub Repository</td>
              <td>
                <a href="https://github.com/sfox38/harvest/" target="_blank" rel="noopener noreferrer" className="info-link">
                  https://github.com/sfox38/harvest/ <Icon name="external" size={12} />
                </a>
              </td>
            </tr>
            <tr>
              <td className="info-label">Report an Issue</td>
              <td>
                <a href="https://github.com/sfox38/harvest/issues" target="_blank" rel="noopener noreferrer" className="info-link">
                  https://github.com/sfox38/harvest/issues <Icon name="external" size={12} />
                </a>
              </td>
            </tr>
            <tr>
              <td className="info-label">Documentation</td>
              <td>
                <a href="https://sfox38.github.io/harvest/" target="_blank" rel="noopener noreferrer" className="info-link">
                  https://sfox38.github.io/harvest/ <Icon name="external" size={12} />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="muted" style={{ fontSize: 12, textAlign: "center", padding: "4px 0 20px" }}>
        HArvest - MIT License
      </div>
    </div>
  );
}
