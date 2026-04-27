/**
 * TokenDetail.tsx - Widget (token) detail view.
 *
 * detail-grid split: embed code + entities (left), health/usage + sessions
 * + activity (right). Code blocks use step-pill labels.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Token, TokenUpdate, Session, ActivityPage, ThemeDefinition } from "../types";
import { validateLabel, DEFAULT_WIDGET_SCRIPT_URL } from "../types";
import { api } from "../api";
import { StatusBadge, ConfirmDialog, Spinner, ErrorBanner, Card, EventRow, fmtRel, EntityAutocomplete, useThemeThumbs } from "./Shared";
import { Icon } from "./Icon";
import { WidgetPreview } from "./WidgetPreview";
import { loadKnownOrigins, addKnownOrigin, removeKnownOrigin, validateOriginUrl, displayOriginLabel } from "./originMemory";
import { loadEntityCache, getEntityCache } from "../entityCache";

// ---------------------------------------------------------------------------
// Clipboard hook (works in non-secure contexts)
// ---------------------------------------------------------------------------

function doCopy(text: string) {
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch { /* ignore */ }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(fallback);
  } else {
    fallback();
  }
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = useCallback(() => {
    doCopy(text);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return { copied, copy };
}

function CopyBtn({ copied, copy, label }: { copied: boolean; copy: () => void; label: string }) {
  return (
    <button
      onClick={copy}
      className={`copy-btn copy-btn-sm${copied ? " copied" : ""}`}
      aria-label={copied ? "Copied to clipboard" : label}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

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

type CardMode = "single" | "group" | "page";

interface PrimaryWithCompanions {
  primary: Token["entities"][0];
  companions: Token["entities"][0][];
}

function groupEntities(entities: Token["entities"]): PrimaryWithCompanions[] {
  const primaries = entities.filter(e => !e.companion_of);
  const primaryIds = new Set(primaries.map(p => p.entity_id));
  const companionMap = new Map<string, Token["entities"][0][]>();
  for (const e of entities) {
    if (e.companion_of) {
      if (!primaryIds.has(e.companion_of)) {
        console.warn(`[harvest] orphaned companion ${e.entity_id}: companion_of "${e.companion_of}" not found`);
        continue;
      }
      const list = companionMap.get(e.companion_of) ?? [];
      list.push(e);
      companionMap.set(e.companion_of, list);
    }
  }
  return primaries.map(p => ({ primary: p, companions: companionMap.get(p.entity_id) ?? [] }));
}

const PERIOD_OPTIONS = [
  { value: 1440, label: "1 day" },
  { value: 60,   label: "1 hour" },
  { value: 30,   label: "30 minutes" },
  { value: 10,   label: "10 minutes" },
  { value: 5,    label: "5 minutes" },
  { value: 1,    label: "1 minute" },
];

function buildCardSnippet(token: Token, useAliases: boolean, mode: CardMode, haUrl: string, hmacSecret: string | null): string {
  const groups = groupEntities(token.entities);
  const secretAttr = hmacSecret ? ` token-secret="${hmacSecret}"` : "";

  function cardLine(g: PrimaryWithCompanions, indent = ""): string {
    const attr = useAliases && g.primary.alias ? `alias="${g.primary.alias}"` : `entity="${g.primary.entity_id}"`;
    return `${indent}<hrv-card ${attr}></hrv-card>`;
  }

  if (mode === "page") {
    return groups.map(g => cardLine(g)).join("\n");
  }

  const groupAttrs = `ha-url="${haUrl}" token="${token.token_id}"${secretAttr}`;
  if (mode === "group") {
    return `<hrv-group ${groupAttrs}>\n${groups.map(g => cardLine(g, "  ")).join("\n")}\n</hrv-group>`;
  }
  const g = groups[0];
  if (!g) return "";
  const entityAttr = useAliases && g.primary.alias ? `alias="${g.primary.alias}"` : `entity="${g.primary.entity_id}"`;
  return `<hrv-card ${groupAttrs} ${entityAttr}></hrv-card>`;
}

function buildWordPressSnippet(token: Token, useAliases: boolean, mode: CardMode, hmacSecret: string | null): string {
  const groups = groupEntities(token.entities);
  const secretAttr = hmacSecret ? ` token-secret="${hmacSecret}"` : "";

  function shortcodeLine(g: PrimaryWithCompanions, indent = ""): string {
    const attr = useAliases && g.primary.alias ? `alias="${g.primary.alias}"` : `entity="${g.primary.entity_id}"`;
    return `${indent}[harvest ${attr}]`;
  }

  if (mode === "page") {
    return groups.map(g => {
      const attr = useAliases && g.primary.alias ? `alias="${g.primary.alias}"` : `entity="${g.primary.entity_id}"`;
      return `[harvest token="${token.token_id}"${secretAttr} ${attr}]`;
    }).join("\n");
  }

  if (mode === "group") {
    return `[harvest_group token="${token.token_id}"${secretAttr}]\n${groups.map(g => shortcodeLine(g, "  ")).join("\n")}\n[/harvest_group]`;
  }

  const g = groups[0];
  if (!g) return "";
  const entityAttr = useAliases && g.primary.alias ? `alias="${g.primary.alias}"` : `entity="${g.primary.entity_id}"`;
  return `[harvest token="${token.token_id}"${secretAttr} ${entityAttr}]`;
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}


// ---------------------------------------------------------------------------
// Code section
// ---------------------------------------------------------------------------

function CodeSection({ token, setToken, setError, hmacSecret }: { token: Token; setToken: (t: Token) => void; setError: (e: string | null) => void; hmacSecret: string | null }) {
  const [useAliases,      setUseAliases]      = useState(() => { try { return localStorage.getItem("hrv_use_aliases") === "true"; } catch { return false; } });
  const [tab,             setTab]             = useState<"web" | "wordpress">(() => { try { return localStorage.getItem("hrv_code_tab") === "wordpress" ? "wordpress" : "web"; } catch { return "web"; } });
  const primaryCount = token.entities.filter(e => !e.companion_of).length;
  const [cardMode,        setCardMode]        = useState<CardMode>(token.embed_mode ?? "single");

  const changeMode = async (mode: CardMode) => {
    setCardMode(mode);
    try {
      const updated = await api.tokens.update(token.token_id, { embed_mode: mode });
      setToken(updated);
    } catch (e) { setError(String(e)); }
  };
  const [overrideHost,    setOverrideHost]    = useState("");
  const [widgetScriptUrl, setWidgetScriptUrl] = useState("");

  useEffect(() => {
    api.config.get().then(c => {
      setOverrideHost(c.override_host || "");
      setWidgetScriptUrl(c.widget_script_url || "");
    }).catch(() => {});
  }, []);

  const haUrl = overrideHost || window.location.origin;
  const isPage = cardMode === "page";
  const scriptUrl = widgetScriptUrl.trim() || DEFAULT_WIDGET_SCRIPT_URL;
  const scriptTag = `<script src="${scriptUrl}"></script>`;
  const pageConfigParts = [`haUrl: "${haUrl}"`, `token: "${token.token_id}"`];
  if (isPage && hmacSecret) pageConfigParts.push(`tokenSecret: "${hmacSecret}"`);
  const setupSnippet = isPage
    ? `${scriptTag}\n<script>HArvest.config({ ${pageConfigParts.join(", ")} });</script>`
    : scriptTag;

  const cardSnippet = tab === "web"
    ? buildCardSnippet(token, useAliases, cardMode, haUrl, hmacSecret)
    : buildWordPressSnippet(token, useAliases, cardMode, hmacSecret);

  const setupCopy = useCopy(setupSnippet);
  const cardCopy = useCopy(cardSnippet);

  return (
    <Card
      title="Embed code"
      action={
        <div className="segmented" role="group" aria-label="Code format">
          <button aria-pressed={tab === "web"} onClick={() => { setTab("web"); localStorage.setItem("hrv_code_tab", "web"); }}>HTML</button>
          <button aria-pressed={tab === "wordpress"} onClick={() => { setTab("wordpress"); localStorage.setItem("hrv_code_tab", "wordpress"); }}>WordPress</button>
        </div>
      }
    >
      {/* Mode selector */}
      <div className="segmented" role="group" aria-label="Embed mode" style={{ marginBottom: 12 }}>
        <button
          aria-pressed={cardMode === "single"}
          onClick={() => changeMode("single")}
          disabled={primaryCount > 1}
          title={primaryCount > 1 ? "Single card requires exactly one primary entity" : undefined}
        >Single card</button>
        <button aria-pressed={cardMode === "group"} onClick={() => changeMode("group")}>Group</button>
        <button aria-pressed={cardMode === "page"} onClick={() => changeMode("page")}>Page</button>
      </div>

      {/* Step 1 - script (HTML only; WordPress plugin handles it) */}
      {tab === "web" && (
        <div className="code-block-group">
          <div className="code-block-label">
            <span className="step-pill">1</span>
            <div style={{ flex: 1 }}>
              <div className="code-block-title">{isPage ? "Page setup" : "Widget script"}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {isPage
                  ? <>Add once to your site's <code>&lt;head&gt;</code>. All widgets inherit these defaults.</>
                  : <>Add once to your site's <code>&lt;head&gt;</code>.</>}
              </div>
            </div>
            <CopyBtn copied={setupCopy.copied} copy={setupCopy.copy} label={isPage ? "Copy setup" : "Copy script"} />
          </div>
          <pre className="code code-full" onClick={setupCopy.copy} title="Click to copy">{setupSnippet}</pre>
        </div>
      )}

      {/* Step 2 (or Step 1 for WordPress) */}
      <div className="code-block-group">
        <div className="code-block-label">
          <span className="step-pill">{tab === "web" ? "2" : "1"}</span>
          <div style={{ flex: 1 }}>
            <div className="code-block-title">{tab === "wordpress" ? "Shortcode" : "Widget markup"}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {tab === "wordpress"
                ? "Paste into any post or page. The HArvest plugin loads the widget script automatically."
                : isPage
                  ? "Drop cards anywhere on your page. Group related cards with <hrv-group> if needed."
                  : "Drop wherever this widget should render."}
            </div>
          </div>
          <CopyBtn copied={cardCopy.copied} copy={cardCopy.copy} label={tab === "wordpress" ? "Copy shortcode" : "Copy markup"} />
        </div>
        <pre className="code code-full" onClick={cardCopy.copy} title="Click to copy">{cardSnippet}</pre>
      </div>

      {/* Alias toggle */}
      <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer", marginTop: 8 }}>
        <input
          type="checkbox"
          checked={useAliases}
          onChange={e => { setUseAliases(e.target.checked); localStorage.setItem("hrv_use_aliases", String(e.target.checked)); }}
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
// Theme editor
// ---------------------------------------------------------------------------

function themeIdToUrl(id: string): string {
  if (id === "default") return "";
  if (id.startsWith("hth_")) return `custom:${id}`;
  return `bundled:${id}`;
}

function themeUrlToId(url: string): string {
  if (!url) return "default";
  if (url.startsWith("bundled:")) return url.slice(8);
  if (url.startsWith("custom:")) return url.slice(7);
  return url;
}

// ---------------------------------------------------------------------------
function ThemeEditor({ token, setToken, setError }: { token: Token; setToken: (t: Token) => void; setError: (e: string | null) => void }) {
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [packsAgreed, setPacksAgreed] = useState<boolean | null>(null);
  const [showAgree, setShowAgree] = useState(false);
  const [agreeText, setAgreeText] = useState("");
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);

  useEffect(() => { api.themes.list().then(setThemes).catch(() => {}); }, []);
  useEffect(() => { api.packs.list().then(d => setPacksAgreed(d.agreed)).catch(() => {}); }, []);
  const thumbUrls = useThemeThumbs(themes);

  const currentId = themeUrlToId(token.theme_url ?? "");
  const selectedTheme = themes.find(t => t.theme_id === currentId) ?? null;

  const applyTheme = async (themeId: string) => {
    try {
      const updated = await api.tokens.update(token.token_id, { theme_url: themeIdToUrl(themeId) });
      setToken(updated);
    } catch (e) { setError(String(e)); }
  };

  const change = (themeId: string) => {
    const target = themes.find(t => t.theme_id === themeId);
    if (target?.renderer_pack && !packsAgreed) {
      setPendingThemeId(themeId);
      setShowAgree(true);
      return;
    }
    applyTheme(themeId);
  };

  const confirmAgree = async () => {
    try {
      await api.packs.agree(true);
      setPacksAgreed(true);
      setShowAgree(false);
      setAgreeText("");
      if (pendingThemeId) {
        await applyTheme(pendingThemeId);
        setPendingThemeId(null);
      }
    } catch (e) { setError(String(e)); }
  };

  return (
    <>
      <Card title="Theme">
        <div className="col" style={{ gap: 12 }}>
          <div className="theme-strip">
            {themes.map(t => (
              <button
                key={t.theme_id}
                className={`theme-strip-item${currentId === t.theme_id ? " selected" : ""}`}
                onClick={() => change(t.theme_id)}
              >
                {thumbUrls[t.theme_id] ? (
                  <img className="theme-strip-thumb" src={thumbUrls[t.theme_id]} alt={t.name} draggable={false} />
                ) : (
                  <div className="theme-strip-thumb" />
                )}
                <span className="theme-strip-name">{t.name}</span>
                {t.renderer_pack && (
                  <div className="theme-strip-meta">
                    <span className="badge badge-accent">Pack</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          {selectedTheme && (
            <WidgetPreview
              variables={selectedTheme.variables}
              darkVariables={selectedTheme.dark_variables}
              packId={selectedTheme.renderer_pack || undefined}
            />
          )}
        </div>
      </Card>

      {showAgree && (
        <div className="overlay" onClick={() => { setShowAgree(false); setAgreeText(""); setPendingThemeId(null); }}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">Renderer Pack Warning</h3>
            <div className="dialog-body">
              <p>
                This theme includes a renderer pack that executes JavaScript from your HA instance
                inside the widget on the embedding page. Only enable themes with packs you trust.
              </p>
              <p style={{ marginTop: 12 }}>
                Type <strong>AGREE</strong> below to confirm.
              </p>
              <input
                type="text"
                className="input"
                value={agreeText}
                onChange={e => setAgreeText(e.target.value)}
                placeholder="Type AGREE"
                autoFocus
                style={{ marginTop: 8 }}
              />
            </div>
            <div className="dialog-actions">
              <button className="btn btn-ghost" onClick={() => { setShowAgree(false); setAgreeText(""); setPendingThemeId(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={agreeText !== "AGREE"} onClick={confirmAgree}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Display settings (lang, a11y, error behavior)
// ---------------------------------------------------------------------------

const LANG_OPTIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "th", label: "Thai" },
];

const ON_OFFLINE_OPTIONS = [
  { value: "last-state", label: "Show last known state" },
  { value: "message",    label: "Show message" },
  { value: "dim",        label: "Dim card" },
  { value: "hide",       label: "Hide card" },
];

const ON_ERROR_OPTIONS = [
  { value: "message", label: "Show message" },
  { value: "dim",     label: "Dim card" },
  { value: "hide",    label: "Hide card" },
];

const DISPLAY_TEXT_MAX_LEN = 200;
const DISPLAY_TEXT_FORBIDDEN = /[<>"';\\]|--|\/\*|\*\/|\b(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC)\b/i;

function validateDisplayText(val: string): string | null {
  if (val.length > DISPLAY_TEXT_MAX_LEN) return `${DISPLAY_TEXT_MAX_LEN} characters max.`;
  if (val && DISPLAY_TEXT_FORBIDDEN.test(val)) return "Contains disallowed characters.";
  return null;
}

interface DisplaySettingsProps {
  token: Token;
  readonly: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setToken: (t: Token) => void;
  setError: (e: string) => void;
}

function DisplaySettings({ token, readonly, saving, setSaving, setToken, setError }: DisplaySettingsProps) {
  const canEdit = !readonly && !saving;
  const [offlineText, setOfflineText] = useState(token.offline_text);
  const [errorText, setErrorText] = useState(token.error_text);
  const [offlineTextErr, setOfflineTextErr] = useState<string | null>(null);
  const [errorTextErr, setErrorTextErr] = useState<string | null>(null);

  const patchToken = async (data: Partial<Token>) => {
    setSaving(true);
    try {
      const updated = await api.tokens.update(token.token_id, data);
      setToken(updated);
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const saveLang = (val: string) => patchToken({ lang: val } as Partial<Token>);
  const saveA11y = (val: string) => patchToken({ a11y: val } as Partial<Token>);
  const saveColorScheme = (val: string) => patchToken({ color_scheme: val } as Partial<Token>);
  const saveOnOffline = (val: string) => patchToken({ on_offline: val } as Partial<Token>);
  const saveOnError = (val: string) => patchToken({ on_error: val } as Partial<Token>);

  const saveOfflineText = (val: string) => {
    const err = validateDisplayText(val);
    setOfflineTextErr(err);
    if (err) return;
    patchToken({ offline_text: val } as Partial<Token>);
  };

  const saveErrorText = (val: string) => {
    const err = validateDisplayText(val);
    setErrorTextErr(err);
    if (err) return;
    patchToken({ error_text: val } as Partial<Token>);
  };

  const toggleMessages = (checked: boolean) => {
    patchToken({ custom_messages: checked } as Partial<Token>);
  };

  return (
    <Card title="Display">
      <div className="col" style={{ gap: 14 }}>

        {/* Theme mode */}
        <div className="display-settings-row">
          <div>
            <div className="display-settings-label">Theme mode</div>
            <div className="muted" style={{ fontSize: 11 }}>Force light or dark theme regardless of the visitor's OS setting.</div>
          </div>
          <div className="segmented" role="group" aria-label="Theme mode" style={{ flexShrink: 0 }}>
            {(["auto", "light", "dark"] as const).map(v => (
              <button
                key={v}
                aria-pressed={token.color_scheme === v}
                onClick={() => canEdit && saveColorScheme(v)}
                disabled={!canEdit}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* Accessibility */}
        <div className="display-settings-row">
          <div>
            <div className="display-settings-label">Accessibility</div>
            <div className="muted" style={{ fontSize: 11 }}>Enhanced mode adds aria-live announcements for state changes.</div>
          </div>
          <select
            value={token.a11y}
            onChange={e => saveA11y(e.target.value)}
            disabled={!canEdit}
            className="input display-settings-select"
          >
            <option value="standard">Standard</option>
            <option value="enhanced">Enhanced</option>
          </select>
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* Language */}
        <div className="display-settings-row">
          <div>
            <div className="display-settings-label">Language</div>
            <div className="muted" style={{ fontSize: 11 }}>Widget UI language for all cards using this token.</div>
          </div>
          <select
            value={token.lang}
            onChange={e => saveLang(e.target.value)}
            disabled={!canEdit}
            className="input display-settings-select"
          >
            {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* Custom error messages - gated behind checkbox */}
        <label className="display-settings-row" style={{ cursor: canEdit ? "pointer" : "default" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={token.custom_messages}
              onChange={e => toggleMessages(e.target.checked)}
              disabled={!canEdit}
            />
            <div>
              <div className="display-settings-label">Custom error messages</div>
              <div className="muted" style={{ fontSize: 11 }}>Override the default offline and error behavior for this token.</div>
            </div>
          </div>
        </label>

        {token.custom_messages && (
          <div className="display-settings-messages">
            {/* When offline */}
            <div className="display-settings-row">
              <span className="display-settings-text-label">When offline</span>
              <select
                value={token.on_offline}
                onChange={e => saveOnOffline(e.target.value)}
                disabled={!canEdit}
                className="input display-settings-select"
              >
                {ON_OFFLINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <label className="display-settings-text-field">
              <span className="display-settings-text-label">Offline message</span>
              <input
                type="text"
                value={offlineText}
                onChange={e => { setOfflineText(e.target.value); setOfflineTextErr(validateDisplayText(e.target.value)); }}
                onBlur={() => saveOfflineText(offlineText)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                disabled={!canEdit}
                placeholder="Default: auto (i18n)"
                maxLength={DISPLAY_TEXT_MAX_LEN}
                className={`input${offlineTextErr ? " input-error" : ""}`}
                style={{ fontSize: 12 }}
              />
              {offlineTextErr && <span className="display-settings-text-error">{offlineTextErr}</span>}
              <span className="muted" style={{ fontSize: 10 }}>{offlineText.length}/{DISPLAY_TEXT_MAX_LEN}</span>
            </label>

            <div style={{ height: 1, background: "var(--divider)" }} />

            {/* When error */}
            <div className="display-settings-row">
              <span className="display-settings-text-label">When error</span>
              <select
                value={token.on_error}
                onChange={e => saveOnError(e.target.value)}
                disabled={!canEdit}
                className="input display-settings-select"
              >
                {ON_ERROR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <label className="display-settings-text-field">
              <span className="display-settings-text-label">Error message</span>
              <input
                type="text"
                value={errorText}
                onChange={e => { setErrorText(e.target.value); setErrorTextErr(validateDisplayText(e.target.value)); }}
                onBlur={() => saveErrorText(errorText)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                disabled={!canEdit}
                placeholder="Default: auto (i18n)"
                maxLength={DISPLAY_TEXT_MAX_LEN}
                className={`input${errorTextErr ? " input-error" : ""}`}
                style={{ fontSize: 12 }}
              />
              {errorTextErr && <span className="display-settings-text-error">{errorTextErr}</span>}
              <span className="muted" style={{ fontSize: 10 }}>{errorText.length}/{DISPLAY_TEXT_MAX_LEN}</span>
            </label>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Entities editor
// ---------------------------------------------------------------------------

interface EntitiesEditorProps {
  token: Token;
  readonly: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setToken: (t: Token) => void;
  setError: (e: string) => void;
}

const MAX_COMPANIONS = 4;
const COMPANION_ALLOWED_DOMAINS = new Set(["light", "switch", "binary_sensor", "input_boolean", "cover", "remote", "lock"]);
const HISTORY_DOMAINS = new Set(["sensor", "input_number", "binary_sensor"]);
const HOURS_OPTIONS = [1, 6, 12, 24, 48, 72, 168];

function EntitiesEditor({ token, readonly, saving, setSaving, setToken, setError }: EntitiesEditorProps) {
  const [addInput, setAddInput]         = useState("");
  const [companionInputs, setCompanionInputs] = useState<Record<string, string>>({});
  const [adding,   setAdding]           = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [expandedCompanions, setExpandedCompanions] = useState<Set<string>>(new Set());
  const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());
  const [attrCache, setAttrCache] = useState<Record<string, string[]>>({});
  const [attrLoading, setAttrLoading] = useState<Set<string>>(new Set());
  const [haActionEntities, setHaActionEntities] = useState<import("../types").HAEntity[]>([]);

  useEffect(() => {
    if (getEntityCache().length === 0) loadEntityCache();
  }, []);

  useEffect(() => {
    api.entities.list()
      .then(list => setHaActionEntities(list.filter(e => e.domain === "harvest_action")))
      .catch(() => {});
  }, []);

  const canEdit = !readonly && !saving;
  const existingIds = token.entities.map(e => e.entity_id);
  const grouped = groupEntities(token.entities);

  const patchEntities = async (updated: Token["entities"]) => {
    setSaving(true);
    try {
      const t = await api.tokens.update(token.token_id, { entities: updated });
      setToken(t);
    } catch (err) { setError(String(err)); }
    finally { setSaving(false); }
  };

  const toggleCap = (entityId: string, newCap: "read" | "read-write") => {
    if (!canEdit) return;
    patchEntities(token.entities.map(en =>
      en.entity_id === entityId ? { ...en, capabilities: newCap } : en
    ));
  };

  const addEntity = async (entityId: string) => {
    if (!canEdit || existingIds.includes(entityId)) return;
    setAdding(true);
    let alias: string | null = null;
    try {
      const result = await api.tokens.generateAlias(entityId);
      alias = result.alias;
    } catch { /* alias stays null */ }

    const defaultCap = token.entities[0]?.capabilities ?? "read";
    const updated = [...token.entities, {
      entity_id: entityId,
      alias,
      capabilities: defaultCap,
      exclude_attributes: [] as string[],
      companion_of: null,
      graph: null,
      hours: 24,
      period: 10,
      animate: false,
      gesture_config: {},
    }];
    await patchEntities(updated);
    setAdding(false);
    setAddInput("");
  };

  const addCompanion = async (primaryEntityId: string, companionEntityId: string) => {
    if (!canEdit || existingIds.includes(companionEntityId)) return;
    setAdding(true);
    let alias: string | null = null;
    try {
      const result = await api.tokens.generateAlias(companionEntityId);
      alias = result.alias;
    } catch { /* alias stays null */ }

    const defaultCap = token.entities[0]?.capabilities ?? "read";
    const updated = [...token.entities, {
      entity_id: companionEntityId,
      alias,
      capabilities: defaultCap,
      exclude_attributes: [] as string[],
      companion_of: primaryEntityId,
      graph: null,
      hours: 24,
      period: 10,
      animate: false,
      gesture_config: {},
    }];
    await patchEntities(updated);
    setAdding(false);
    setCompanionInputs(prev => { const next = { ...prev }; delete next[primaryEntityId]; return next; });
  };

  const removeEntity = (entityId: string) => {
    if (!canEdit) return;
    patchEntities(token.entities.filter(e => e.entity_id !== entityId && e.companion_of !== entityId));
    setConfirmRemove(null);
  };

  const removeCompanion = (entityId: string) => {
    if (!canEdit) return;
    patchEntities(token.entities.filter(e => e.entity_id !== entityId));
  };

  const toggleCompanionExpand = (entityId: string) => {
    setCompanionInputs(prev => { const next = { ...prev }; delete next[entityId]; return next; });
    setExpandedCompanions(prev => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId); else next.add(entityId);
      return next;
    });
  };

  const toggleSettingsExpand = (entityId: string) => {
    const isOpen = expandedSettings.has(entityId);
    setExpandedSettings(prev => {
      const next = new Set(prev);
      if (isOpen) next.delete(entityId); else next.add(entityId);
      return next;
    });
    if (!isOpen && !attrCache[entityId]) {
      setAttrLoading(prev => new Set(prev).add(entityId));
      api.ha.entityAttributes(entityId)
        .then(keys => setAttrCache(prev => ({ ...prev, [entityId]: keys })))
        .catch(() => {})
        .finally(() => setAttrLoading(prev => {
          const next = new Set(prev);
          next.delete(entityId);
          return next;
        }));
    }
  };

  const updateGraphSetting = (entityId: string, field: "graph" | "hours" | "period", value: string | number | null) => {
    if (!canEdit) return;
    patchEntities(token.entities.map(en =>
      en.entity_id === entityId ? { ...en, [field]: value } : en
    ));
  };

  const updateGestureSetting = (entityId: string, gesture: "tap" | "hold" | "double_tap", action: string, targetEntityId?: string) => {
    if (!canEdit) return;
    patchEntities(token.entities.map(en => {
      if (en.entity_id !== entityId) return en;
      const gc = { ...(en.gesture_config ?? {}) };
      if (action) {
        const entry: import("../types").GestureAction = { action };
        if (targetEntityId) entry.entity_id = targetEntityId;
        gc[gesture] = entry;
      } else {
        delete gc[gesture];
      }
      return { ...en, gesture_config: gc };
    }));
  };

  const toggleExcludeAttr = (entityId: string, attrKey: string) => {
    if (!canEdit) return;
    const entity = token.entities.find(e => e.entity_id === entityId);
    if (!entity) return;
    const excluded = new Set(entity.exclude_attributes);
    if (excluded.has(attrKey)) excluded.delete(attrKey); else excluded.add(attrKey);
    patchEntities(token.entities.map(e =>
      e.entity_id === entityId ? { ...e, exclude_attributes: [...excluded] } : e
    ));
  };

  const primaryCount = grouped.length;

  return (
    <Card
      title={`Entities (${primaryCount} primary, ${token.entities.length - primaryCount} companion)`}
      pad={false}
      action={!readonly ? (
        <span className="muted" style={{ fontSize: 11 }}>
          {adding ? "Adding..." : ""}
        </span>
      ) : undefined}
    >
      {grouped.map(g => {
        const e = g.primary;
        const domain = e.entity_id.split(".")[0];
        const isRW = e.capabilities === "read-write";
        const companionCount = g.companions.length;
        const isCompanionExpanded = expandedCompanions.has(e.entity_id);
        const isSettingsOpen = expandedSettings.has(e.entity_id);
        const showGraphOption = HISTORY_DOMAINS.has(domain);
        const showAnimateOption = domain === "fan";
        const hasGestures = Object.keys(e.gesture_config ?? {}).length > 0;
        const settingsBadge = (e.exclude_attributes.length > 0 || e.graph || e.animate || hasGestures) ? "entity-settings-badge" : "";
        return (
          <div key={e.entity_id} className="entity-card">
            {/* Row 1: entity name + alias + delete */}
            <div className="entity-row-1">
              <div className="widget-thumb" style={{ width: 28, height: 28 }}>
                <Icon name="plug" size={14} />
              </div>
              <span className="entity-name mono">{e.entity_id}</span>
              {e.alias && <span className="entity-alias mono">Alias: {e.alias}</span>}
              {canEdit && (
                <button
                  onClick={() => setConfirmRemove(e.entity_id)}
                  className="btn btn-sm btn-ghost entity-delete"
                  aria-label={`Remove ${e.entity_id}`}
                >
                  <Icon name="close" size={12} />
                </button>
              )}
            </div>

            {/* Row 2: controls */}
            <div className="entity-row-2">
              <select
                value={e.capabilities}
                onChange={ev => toggleCap(e.entity_id, ev.target.value as "read" | "read-write")}
                disabled={!canEdit}
                className="entity-cap-pill"
                style={{
                  background: isRW ? "var(--info-weak)" : "var(--ok-weak)",
                  color: isRW ? "var(--info)" : "var(--ok)",
                }}
              >
                <option value="read">READ</option>
                <option value="read-write">READ-WRITE</option>
              </select>
              <button
                className="btn-link entity-row-2-btn"
                onClick={() => toggleCompanionExpand(e.entity_id)}
              >
                {companionCount > 0 ? `${companionCount} companion${companionCount > 1 ? "s" : ""}` : "Add companion"}
                {" "}<Icon name={isCompanionExpanded ? "chevron-up" : "chevron-down"} size={10} />
              </button>
              <button
                className={`btn-link entity-row-2-btn ${settingsBadge}`}
                onClick={() => toggleSettingsExpand(e.entity_id)}
              >
                Settings
                {" "}<Icon name={isSettingsOpen ? "chevron-up" : "chevron-down"} size={10} />
              </button>
            </div>

            {/* Expandable: Companions */}
            {isCompanionExpanded && (
              <div className="entity-expand-panel">
                <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                  Companions ({companionCount}/{MAX_COMPANIONS})
                </div>
                {g.companions.map(c => (
                  <div key={c.entity_id} className="chip" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 12 }} className="mono">{c.entity_id}</span>
                    {c.alias && <span className="muted" style={{ fontSize: 10 }}>alias: {c.alias}</span>}
                    {canEdit && (
                      <button
                        onClick={() => removeCompanion(c.entity_id)}
                        className="btn btn-sm btn-ghost"
                        style={{ padding: "1px 4px" }}
                        aria-label={`Remove companion ${c.entity_id}`}
                      ><Icon name="close" size={10} /></button>
                    )}
                  </div>
                ))}
                {canEdit && companionCount < MAX_COMPANIONS && (
                  <EntityAutocomplete
                    value={companionInputs[e.entity_id] ?? ""}
                    onChange={v => setCompanionInputs(prev => ({ ...prev, [e.entity_id]: v }))}
                    onSelect={(id) => addCompanion(e.entity_id, id)}
                    disabled={adding || saving}
                    excludeIds={existingIds}
                    filterDomains={COMPANION_ALLOWED_DOMAINS}
                    placeholder="Add companion entity..."
                  />
                )}
              </div>
            )}

            {/* Expandable: Settings (Exclude attributes + Graph settings) */}
            {isSettingsOpen && (
              <div className="entity-expand-panel">
                {/* Exclude attributes - always visible when settings open */}
                <div style={{ marginBottom: showGraphOption ? 10 : 0 }}>
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                    Exclude{e.exclude_attributes.length > 0 ? ` ${e.exclude_attributes.length}` : ""} attributes
                    {e.exclude_attributes.length > 0 && canEdit && (
                      <>{" "}<button
                        className="btn-link"
                        style={{ fontSize: 11 }}
                        onClick={() => patchEntities(token.entities.map(en =>
                          en.entity_id === e.entity_id ? { ...en, exclude_attributes: [] } : en
                        ))}
                      >Clear all</button></>
                    )}
                  </div>
                  {attrLoading.has(e.entity_id) ? (
                    <Spinner size={16} />
                  ) : attrCache[e.entity_id] ? (
                    <div className="attr-filter-grid">
                      {attrCache[e.entity_id].map(attr => {
                        const excluded = e.exclude_attributes.includes(attr);
                        return (
                          <label key={attr} className={`attr-filter-item${excluded ? " excluded" : ""}`}>
                            <input
                              type="checkbox"
                              checked={excluded}
                              onChange={() => toggleExcludeAttr(e.entity_id, attr)}
                              disabled={!canEdit}
                            />
                            <span className="mono">{attr}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 12 }}>Entity not found in HA.</div>
                  )}
                </div>

                {/* Graph settings - only for applicable domains */}
                {showGraphOption && (
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Graph settings</div>
                    <div className="entity-graph-settings">
                      <label className="entity-graph-field">
                        Graph
                        <select
                          value={e.graph ?? ""}
                          onChange={ev => updateGraphSetting(e.entity_id, "graph", ev.target.value || null)}
                          disabled={!canEdit}
                          className="input entity-graph-select"
                        >
                          <option value="">None</option>
                          <option value="line">Line</option>
                          <option value="bar">Bar</option>
                        </select>
                      </label>
                      <label className="entity-graph-field">
                        Hours
                        <select
                          value={e.hours ?? 24}
                          onChange={ev => updateGraphSetting(e.entity_id, "hours", Number(ev.target.value))}
                          disabled={!canEdit || !e.graph}
                          className="input entity-graph-select"
                        >
                          {HOURS_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </label>
                      <label className="entity-graph-field">
                        Period
                        <select
                          value={e.period ?? 10}
                          onChange={ev => updateGraphSetting(e.entity_id, "period", Number(ev.target.value))}
                          disabled={!canEdit || !e.graph}
                          className="input entity-graph-select"
                        >
                          {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {/* Fan animation - only for fan domain */}
                {showAnimateOption && (
                  <div>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Fan settings</div>
                    <label className="entity-graph-field" style={{ gap: 6, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={e.animate ?? false}
                        onChange={ev => {
                          if (!canEdit) return;
                          patchEntities(token.entities.map(en =>
                            en.entity_id === e.entity_id ? { ...en, animate: ev.target.checked } : en
                          ));
                        }}
                        disabled={!canEdit}
                      />
                      Animated
                    </label>
                  </div>
                )}

                {/* Gesture settings - available for all entities */}
                {(() => {
                  const haActions = haActionEntities;
                  return (
                    <div style={{ marginTop: showGraphOption || showAnimateOption ? 10 : 0 }}>
                      <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Gestures</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {(["tap", "hold", "double_tap"] as const).map(gesture => {
                          const label = gesture === "double_tap" ? "Double-tap" : gesture.charAt(0).toUpperCase() + gesture.slice(1);
                          const gc = e.gesture_config ?? {};
                          const currentAction = gc[gesture]?.action ?? "";
                          const currentTarget = gc[gesture]?.entity_id ?? "";
                          return (
                            <div key={gesture} style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: "var(--ink-3)", minWidth: 68 }}>{label}</span>
                              <select
                                value={currentAction}
                                onChange={ev => {
                                  const action = ev.target.value;
                                  if (action === "trigger-action" && haActions.length) {
                                    updateGestureSetting(e.entity_id, gesture, action, haActions[0].entity_id);
                                  } else {
                                    updateGestureSetting(e.entity_id, gesture, action);
                                  }
                                }}
                                disabled={!canEdit}
                                className="input entity-graph-select"
                              >
                                <option value="">Default</option>
                                <option value="toggle">Toggle</option>
                                <option value="none">None (disable)</option>
                                {haActions.length > 0 && <option value="trigger-action">Trigger action...</option>}
                              </select>
                              {currentAction === "trigger-action" && haActions.length > 0 && (
                                <select
                                  value={currentTarget}
                                  onChange={ev => updateGestureSetting(e.entity_id, gesture, "trigger-action", ev.target.value)}
                                  disabled={!canEdit}
                                  className="input entity-graph-select"
                                  style={{ minWidth: 120 }}
                                >
                                  {haActions.map(ha => (
                                    <option key={ha.entity_id} value={ha.entity_id}>
                                      {ha.friendly_name || ha.entity_id.replace("harvest_action.", "")}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        );
      })}

      {!readonly && (
        <div style={{ padding: "8px 12px" }}>
          <EntityAutocomplete
            value={addInput}
            onChange={setAddInput}
            onSelect={addEntity}
            disabled={adding || saving}
            excludeIds={existingIds}
            placeholder="Add primary entity..."
          />
        </div>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove entity"
          message={`Remove ${confirmRemove} and its companions from this widget? Active sessions using this entity will lose access.`}
          confirmLabel="Remove"
          confirmDestructive
          onConfirm={() => removeEntity(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
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
              <div className="session-row-top" style={{ gridTemplateColumns: "1fr auto 18px" }}>
                <code className="mono" style={{ fontSize: 11 }}>
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

const ORIGIN_CUSTOM = "__custom__";

// ---------------------------------------------------------------------------
// IANA timezone list (common subset)
// ---------------------------------------------------------------------------

const COMMON_TIMEZONES = [
  "UTC",
  "Pacific/Auckland", "Pacific/Fiji",
  "Australia/Sydney", "Australia/Adelaide", "Australia/Perth",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Asia/Hong_Kong",
  "Asia/Singapore", "Asia/Bangkok", "Asia/Kolkata", "Asia/Dubai",
  "Europe/Moscow", "Europe/Istanbul", "Europe/Athens", "Europe/Helsinki",
  "Europe/Berlin", "Europe/Paris", "Europe/Amsterdam", "Europe/London",
  "Atlantic/Reykjavik",
  "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
];

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && COMMON_TIMEZONES.includes(tz)) return tz;
    if (tz) return tz;
  } catch { /* ignore */ }
  return "UTC";
}

function tzOffsetLabel(tz: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
    const parts = fmt.formatToParts(new Date());
    const offset = parts.find(p => p.type === "timeZoneName")?.value ?? "";
    return offset.replace("GMT", "UTC");
  } catch { return ""; }
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

// ---------------------------------------------------------------------------
// SecurityEditor
// ---------------------------------------------------------------------------

interface SecurityEditorProps {
  token: Token & { created_by_name?: string | null };
  readonly: boolean;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setToken: (t: Token & { created_by_name?: string | null }) => void;
  setError: (e: string) => void;
  generatedSecret: string | null;
  setGeneratedSecret: (s: string | null) => void;
}

function SecurityEditor({ token, readonly, saving, setSaving, setToken, setError, generatedSecret, setGeneratedSecret }: SecurityEditorProps) {
  const canEdit = !readonly && !saving;
  const prevName = token.created_by_name;
  const patchToken = async (data: Partial<Token> | TokenUpdate) => {
    setSaving(true);
    try {
      const updated = await api.tokens.update(token.token_id, data);
      setToken({ ...updated, created_by_name: prevName });
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  // -- Origins --
  const [knownOrigins, setKnownOrigins]   = useState<string[]>(loadKnownOrigins);
  const [usingCustom,  setUsingCustom]    = useState(false);
  const [customInput,  setCustomInput]    = useState("");
  const [dropdownSel,  setDropdownSel]    = useState("");
  const [urlError,     setUrlError]       = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<{ url: string; newOrigin: string; path: string | null } | null>(null);
  const [showOriginInput, setShowOriginInput] = useState(false);

  const baseOrigin = token.origins.allowed[0] ?? "";
  const paths = token.origins.allow_paths;
  const hasOrigins = !!(baseOrigin || paths.length > 0);
  const effectiveAllowAny = token.origins.allow_any || !hasOrigins;
  const displayUrls: string[] = effectiveAllowAny
    ? []
    : paths.length > 0
      ? paths.map(p => `${baseOrigin}${p}`)
      : baseOrigin ? [baseOrigin] : [];

  const saveOrigins = async (origins: Token["origins"]) => {
    await patchToken({ origins });
  };

  const removeUrl = (displayUrl: string) => {
    if (!canEdit) return;
    try {
      const u = new URL(displayUrl);
      const path = (u.pathname && u.pathname !== "/") ? u.pathname : null;
      if (path) {
        const newPaths = paths.filter(p => p !== path);
        if (newPaths.length > 0) {
          saveOrigins({ allow_any: false, allowed: [baseOrigin], allow_paths: newPaths });
        } else {
          saveOrigins({ allow_any: true, allowed: [], allow_paths: [] });
        }
      } else {
        saveOrigins({ allow_any: true, allowed: [], allow_paths: [] });
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
    setShowOriginInput(false);
    setPendingReplace(null);
  };

  const addUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || !canEdit) return;
    const err = validateOriginUrl(trimmed);
    if (err) { setUrlError(err); return; }
    const u = new URL(trimmed);
    const newOrigin = u.origin;
    const path = (u.pathname && u.pathname !== "/") ? u.pathname : null;
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

  const originDropdownItems = knownOrigins.filter(o => {
    if (displayUrls.includes(o)) return false;
    if (!baseOrigin) return true;
    try { return new URL(o).origin === baseOrigin; } catch { return false; }
  });
  const hasOriginDropdown = originDropdownItems.length > 0;

  // -- Expiry --
  const today = new Date().toISOString().slice(0, 10);
  const [editExpiry, setEditExpiry] = useState(token.expires ? token.expires.slice(0, 10) : "");
  const expiryInvalid = editExpiry !== "" && (
    !/^\d{4}-\d{2}-\d{2}$/.test(editExpiry) || editExpiry <= today
  );
  const saveExpiry = async (val: string) => {
    if (!canEdit) return;
    if (val === "") {
      await patchToken({ expires: null });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val) || val <= today) return;
    await patchToken({ expires: `${val}T23:59:59Z` });
  };

  // -- Active Schedule --
  const hasSchedule = token.active_schedule !== null;
  const [schedExpand, setSchedExpand] = useState(hasSchedule);
  const [schedTz, setSchedTz] = useState(token.active_schedule?.timezone ?? detectTimezone());
  const [schedDays, setSchedDays] = useState<string[]>(
    token.active_schedule?.windows[0]?.days ?? ["mon", "tue", "wed", "thu", "fri"],
  );
  const [schedStart, setSchedStart] = useState(token.active_schedule?.windows[0]?.start ?? "09:00");
  const [schedEnd, setSchedEnd] = useState(token.active_schedule?.windows[0]?.end ?? "18:00");
  const [schedDirty, setSchedDirty] = useState(false);

  const saveSchedule = async () => {
    if (!canEdit) return;
    await patchToken({
      active_schedule: {
        timezone: schedTz,
        windows: [{ days: schedDays, start: schedStart, end: schedEnd }],
      },
    });
    setSchedDirty(false);
  };

  const clearSchedule = async () => {
    if (!canEdit) return;
    await patchToken({ active_schedule: null });
    setSchedExpand(false);
    setSchedDirty(false);
  };

  const markSchedDirty = () => setSchedDirty(true);

  // -- Allowed IPs --
  const [ipText, setIpText] = useState(token.allowed_ips.join("\n"));
  const [ipError, setIpError] = useState<string | null>(null);

  const isValidCidr = (s: string): boolean => {
    const cidrV4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const cidrV6 = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;
    if (!cidrV4.test(s) && !cidrV6.test(s)) return false;
    const parts = s.split("/");
    if (parts[0].includes(":")) return true;
    const octets = parts[0].split(".");
    if (octets.some(o => parseInt(o, 10) > 255)) return false;
    if (parts[1] !== undefined && parseInt(parts[1], 10) > 32) return false;
    return true;
  };

  const saveIps = async (raw: string) => {
    if (!canEdit) return;
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const invalid = lines.filter(l => !isValidCidr(l));
    if (invalid.length > 0) {
      setIpError(`Invalid: ${invalid.join(", ")}`);
      return;
    }
    setIpError(null);
    const current = token.allowed_ips;
    if (lines.length === current.length && lines.every((l, i) => l === current[i])) return;
    await patchToken({ allowed_ips: lines });
  };

  // -- Max Sessions --
  const [maxSess, setMaxSess] = useState(token.max_sessions !== null ? String(token.max_sessions) : "");

  const saveMaxSess = async (raw: string) => {
    if (!canEdit) return;
    const val = raw.trim() === "" ? null : parseInt(raw, 10);
    if (val !== null && (isNaN(val) || val < 1 || val > 1000)) return;
    const current = token.max_sessions;
    if (val === current) return;
    await patchToken({ max_sessions: val });
  };

  // -- HMAC --
  const [confirmDisableHmac, setConfirmDisableHmac] = useState(false);
  const secretCopy = useCopy(generatedSecret ?? "");

  const enableHmac = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const data = await api.tokens.update(token.token_id, { token_secret: "generate" });
      setGeneratedSecret(data.generated_secret ?? null);
      setToken({ ...data, created_by_name: prevName });
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const disableHmac = async () => {
    setConfirmDisableHmac(false);
    await patchToken({ token_secret: null });
    setGeneratedSecret(null);
  };

  return (
    <Card title="Security">
      <div className="col" style={{ gap: 16 }}>

        {/* Allow from any website */}
        <div>
          {!readonly && (
            <label className="row" style={{ gap: 8, fontSize: 13, cursor: canEdit ? "pointer" : "default", marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={effectiveAllowAny && !showOriginInput}
                onChange={() => {
                  if (effectiveAllowAny && !showOriginInput) {
                    setShowOriginInput(true);
                  } else {
                    setShowOriginInput(false);
                    if (hasOrigins) {
                      saveOrigins({ allow_any: true, allowed: token.origins.allowed, allow_paths: token.origins.allow_paths });
                    }
                  }
                }}
                disabled={saving}
              />
              Allow from any website
            </label>
          )}
          {(effectiveAllowAny && !showOriginInput) ? (
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
                      <button onClick={() => removeUrl(url)} disabled={saving} className="btn btn-sm btn-danger">Remove</button>
                    )}
                  </div>
                ))}
              </div>
              {!readonly && (
                <div className="col" style={{ gap: 6 }}>
                  {hasOriginDropdown && (
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
                        {originDropdownItems.map(o => <option key={o} value={o}>{displayOriginLabel(o)}</option>)}
                        <option value={ORIGIN_CUSTOM}>Enter a new URL...</option>
                      </select>
                      {dropdownSel && !usingCustom && (
                        <>
                          <button onClick={() => addUrl(dropdownSel)} disabled={saving} className="btn btn-sm">Add URL</button>
                          <button onClick={handleDeleteFromDropdown} disabled={saving} className="btn btn-sm btn-danger">Delete URL</button>
                        </>
                      )}
                    </div>
                  )}
                  {(usingCustom || !hasOriginDropdown) && (
                    <div className="row" style={{ gap: 6 }}>
                      <input
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addUrl(customInput); }}
                        placeholder="https://example.com/page.html"
                        disabled={saving}
                        autoFocus={hasOriginDropdown}
                        className="input"
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button onClick={() => addUrl(customInput)} disabled={saving || !customInput.trim()} className="btn btn-sm">Add URL</button>
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
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* Expiry */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Expiry date</div>
          {readonly ? (
            <div className="muted" style={{ fontSize: 13 }}>
              {token.expires ? new Date(token.expires).toLocaleString() : "No expiry set"}
            </div>
          ) : (
            <div className="col" style={{ gap: 4 }}>
              <input
                type="date"
                value={editExpiry}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                onChange={e => { setEditExpiry(e.target.value); saveExpiry(e.target.value); }}
                disabled={saving}
                className="input"
                style={{ fontSize: 13, width: 180, borderColor: expiryInvalid ? "var(--danger)" : undefined }}
              />
              {expiryInvalid && (
                <div style={{ fontSize: 12, color: "var(--danger)" }}>Date must be in the future.</div>
              )}
              {!editExpiry && !expiryInvalid && (
                <div className="muted" style={{ fontSize: 12 }}>No expiry - widget never expires</div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* HMAC */}
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Enhanced security (HMAC)</div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                Signs auth messages with a shared secret to prevent token reuse.
              </div>
            </div>
            {!readonly && (
              <div className="row" style={{ gap: 6 }}>
                {generatedSecret && <CopyBtn copied={secretCopy.copied} copy={secretCopy.copy} label="Copy secret" />}
                <button
                  className={`btn btn-sm ${token.token_secret ? "btn-danger" : "btn-primary"}`}
                  disabled={saving}
                  onClick={() => token.token_secret ? setConfirmDisableHmac(true) : enableHmac()}
                >
                  {token.token_secret ? "Disable" : "Enable"}
                </button>
              </div>
            )}
          </div>
          {token.token_secret && !generatedSecret && (
            <div className="badge badge-ok" style={{ fontSize: 12, marginTop: 6 }}>HMAC enabled</div>
          )}
          {generatedSecret && (
            <div style={{ marginTop: 8 }}>
              <div className="badge badge-warn" style={{ fontSize: 12, marginBottom: 6 }}>
                Copy this secret now. It will not be shown again. Do not share your screen while this is visible.
              </div>
              <pre className="code code-full" onClick={secretCopy.copy} title="Click to copy">{generatedSecret}</pre>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* Active Schedule */}
        <div>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Active schedule</div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                Restrict this widget to specific days and times.
              </div>
            </div>
            {!readonly && !hasSchedule && !schedExpand && (
              <button className="btn btn-sm btn-ghost" disabled={saving} onClick={() => setSchedExpand(true)}>
                Configure
              </button>
            )}
          </div>
          {(hasSchedule || schedExpand) && (
            <div className="col" style={{ gap: 8, marginTop: 10 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 500 }}>Timezone</label>
                <select
                  value={schedTz}
                  onChange={e => { setSchedTz(e.target.value); markSchedDirty(); }}
                  disabled={!canEdit}
                  className="input"
                  style={{ fontSize: 12, flex: 1, minWidth: 160 }}
                >
                  {(!COMMON_TIMEZONES.includes(schedTz)) && <option key={schedTz} value={schedTz}>{schedTz} ({tzOffsetLabel(schedTz)})</option>}
                  {COMMON_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz} ({tzOffsetLabel(tz)})</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {DAY_KEYS.map(d => (
                  <button
                    key={d}
                    className={`btn btn-sm ${schedDays.includes(d) ? "btn-primary" : "btn-ghost"}`}
                    disabled={!canEdit}
                    onClick={() => {
                      setSchedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
                      markSchedDirty();
                    }}
                    style={{ minWidth: 38, fontSize: 11.5, padding: "3px 6px" }}
                  >
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 500 }}>From</label>
                <input
                  type="time" value={schedStart}
                  onChange={e => { setSchedStart(e.target.value); markSchedDirty(); }}
                  disabled={!canEdit} className="input" style={{ fontSize: 12 }}
                />
                <label style={{ fontSize: 12, fontWeight: 500 }}>to</label>
                <input
                  type="time" value={schedEnd}
                  onChange={e => { setSchedEnd(e.target.value); markSchedDirty(); }}
                  disabled={!canEdit} className="input" style={{ fontSize: 12 }}
                />
              </div>
              {!readonly && (
                <div className="row" style={{ gap: 8, marginTop: 4 }}>
                  <button className="btn btn-sm btn-primary" disabled={saving || (hasSchedule && !schedDirty) || schedDays.length === 0} onClick={saveSchedule}>
                    {hasSchedule ? "Update" : "Apply"}
                  </button>
                  {hasSchedule && (
                    <button className="btn btn-sm btn-ghost" disabled={saving} onClick={clearSchedule}>Remove</button>
                  )}
                  {!hasSchedule && (
                    <button className="btn btn-sm btn-ghost" disabled={saving} onClick={() => { setSchedExpand(false); setSchedDirty(false); }}>Cancel</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* IP Restrictions */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>IP restrictions</div>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>
            CIDR ranges that may connect (one per line). Empty means all IPs allowed.
          </div>
          <textarea
            value={ipText}
            placeholder={"203.0.113.0/24\n10.0.0.0/8"}
            rows={3}
            onChange={e => { setIpText(e.target.value); setIpError(null); }}
            onBlur={() => saveIps(ipText)}
            disabled={!canEdit}
            className="input"
            style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
          />
          {ipError && <div style={{ color: "var(--color-danger)", fontSize: 11.5, marginTop: 4 }}>{ipError}</div>}
        </div>

        <div style={{ height: 1, background: "var(--divider)" }} />

        {/* Max Sessions */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Max concurrent sessions</div>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>
            Limit simultaneous connections for this widget. Leave blank for unlimited.
          </div>
          <input
            type="number"
            value={maxSess}
            placeholder="unlimited"
            min={1}
            max={1000}
            onChange={e => setMaxSess(e.target.value)}
            onBlur={() => saveMaxSess(maxSess)}
            onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
            disabled={!canEdit}
            className="input"
            style={{ width: 100, fontSize: 13 }}
          />
        </div>

      </div>

      {confirmDisableHmac && (
        <ConfirmDialog
          title="Disable HMAC?"
          message="Disabling HMAC removes the shared secret. Any pages using this token with HMAC signing will stop working."
          confirmLabel="Disable"
          confirmDestructive
          onConfirm={disableHmac}
          onCancel={() => setConfirmDisableHmac(false)}
        />
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
  const [saving,        setSaving]        = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPause,  setConfirmPause]  = useState(false);
  const [hmacSecret,    setHmacSecret]    = useState<string | null>(null);

  const load = useCallback(() => {
    api.tokens.get(tokenId)
      .then(t => {
        setToken(t);
        setEditLabel(t.label);
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

  const doPause = async () => {
    if (!token) return;
    try {
      const updated = await api.tokens.update(token.token_id, { paused: !token.paused } as Partial<Token>);
      setToken({ ...updated, created_by_name: token.created_by_name });
      setConfirmPause(false);
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
              <StatusBadge status={token.paused ? "inactive" : token.status} label={token.paused ? "Paused" : undefined} />
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
              <>
                <button
                  className={`btn btn-sm ${token.paused ? "btn-primary" : ""}`}
                  onClick={() => token.paused ? doPause() : setConfirmPause(true)}
                >
                  <Icon name={token.paused ? "play" : "pause"} size={13} />
                  {token.paused ? "Resume" : "Pause"}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => setConfirmRevoke(true)}>
                  <Icon name="trash" size={13} /> Revoke
                </button>
              </>
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
          {!readonly && <CodeSection token={token} setToken={t => setToken({ ...t, created_by_name: token.created_by_name })} setError={setError} hmacSecret={hmacSecret} />}

          {/* Theme */}
          {!readonly && <ThemeEditor token={token} setToken={t => setToken({ ...t, created_by_name: token.created_by_name })} setError={setError} />}

          {/* Entities */}
          <EntitiesEditor
            token={token}
            readonly={readonly}
            saving={saving}
            setSaving={setSaving}
            setToken={t => setToken({ ...t, created_by_name: token.created_by_name })}
            setError={setError}
          />

          {/* Display settings */}
          {!readonly && (
            <DisplaySettings
              token={token}
              readonly={readonly}
              saving={saving}
              setSaving={setSaving}
              setToken={t => setToken({ ...t, created_by_name: token.created_by_name })}
              setError={setError}
            />
          )}

          {/* Security */}
          <SecurityEditor
            token={token}
            readonly={readonly}
            saving={saving}
            setSaving={setSaving}
            setToken={t => setToken({ ...t, created_by_name: token.created_by_name })}
            setError={setError}
            generatedSecret={hmacSecret}
            setGeneratedSecret={setHmacSecret}
          />
        </div>

        {/* Right column */}
        <div className="col" style={{ gap: 18 }}>
          <Card title="Usage">
            <dl className="kv">
              <dt>Live sessions</dt><dd>{token.active_sessions}</dd>
              <dt>Token ID</dt><dd className="mono" style={{ fontSize: 11 }}>{token.token_id}</dd>
              <dt>Version</dt><dd>{token.token_version}</dd>
            </dl>
          </Card>

          <SessionsPanel tokenId={tokenId} />
          <ActivityPanel tokenId={tokenId} />
        </div>
      </div>

      {confirmPause && (
        <ConfirmDialog
          title="Pause widget"
          message={`Pausing "${token.label}" will immediately close all active sessions and block new connections until you resume it.`}
          confirmLabel="Pause"
          confirmDestructive
          onConfirm={doPause}
          onCancel={() => setConfirmPause(false)}
        />
      )}
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
