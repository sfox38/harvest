/**
 * Themes.tsx - Theme management screen.
 *
 * Horizontal theme strip at top, info card, preview card with mock widgets,
 * and JSON code editor. Supports CRUD for custom themes and read-only
 * viewing of bundled system themes.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { ThemeDefinition, Token, PacksResponse } from "../types";
import { api } from "../api";
import { Card, ConfirmDialog, Spinner, ErrorBanner, useThemeThumbs } from "./Shared";
import { Icon } from "./Icon";
import { WidgetPreview, clearPackCache } from "./WidgetPreview";

// ---------------------------------------------------------------------------
// Theme URL mapping helpers
// ---------------------------------------------------------------------------

function themeUrlToId(themeUrl: string): string {
  if (!themeUrl) return "default";
  if (themeUrl.startsWith("bundled:")) return themeUrl.slice(8);
  if (themeUrl.startsWith("user:")) return themeUrl.slice(5);
  return themeUrl;
}

// ---------------------------------------------------------------------------
// Clipboard hook
// ---------------------------------------------------------------------------

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    const fallback = () => {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.select();
      try { document.execCommand("copy"); } catch { /* */ }
      document.body.removeChild(el);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return { copied, copy };
}

// ---------------------------------------------------------------------------
// Main Themes component
// ---------------------------------------------------------------------------

interface ThemesProps {
  onSelectToken: (tokenId: string) => void;
}

export function Themes({ onSelectToken }: ThemesProps) {
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Code editor state
  const [editedJson, setEditedJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedVars, setParsedVars] = useState<Record<string, string> | null>(null);
  const [parsedDarkVars, setParsedDarkVars] = useState<Record<string, string> | null>(null);

  // Renderer pack state
  const [packsData, setPacksData] = useState<PacksResponse | null>(null);
  const [packCode, setPackCode] = useState<string | null>(null);
  const [packCodeDirty, setPackCodeDirty] = useState(false);
  const [packCodeSaving, setPackCodeSaving] = useState(false);
  const [showAgree, setShowAgree] = useState(false);
  const [agreeText, setAgreeText] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);


  // Pack upload reminder (shown after importing a theme that has a renderer_pack)
  const [showPackReminder, setShowPackReminder] = useState(false);

  // Incremented after a pack JS is uploaded to force the widget preview to remount
  const [previewKey, setPreviewKey] = useState(0);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Thumbnail state
  const [thumbKey, setThumbKey] = useState(0);
  const thumbUrls = useThemeThumbs(themes, thumbKey);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const packJsRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const [t, tk] = await Promise.all([api.themes.list(), api.tokens.list()]);
      setThemes(t);
      setTokens(tk);
      return t;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { api.packs.list().then(setPacksData).catch(() => {}); }, []);

  const selectedTheme = themes.find(t => t.theme_id === selected) ?? null;
  const packId = selectedTheme?.renderer_pack ? selectedTheme.theme_id : null;
  const selectedPack = packId
    ? packsData?.packs.find(p => p.pack_id === packId) ?? null
    : null;

  useEffect(() => {
    if (!packId) { setPackCode(null); setPackCodeDirty(false); return; }
    api.packs.getCode(packId).then(r => setPackCode(r.code)).catch(() => setPackCode(null));
    setPackCodeDirty(false);
  }, [packId]);

  const requireConsent = (action: () => Promise<void>) => {
    if (packsData?.agreed) { action(); return; }
    setPendingAction(() => action);
    setShowAgree(true);
  };

  const confirmAgree = async () => {
    try {
      await api.packs.agree(true);
      setPacksData(prev => prev ? { ...prev, agreed: true } : prev);
      setShowAgree(false);
      setAgreeText("");
      if (pendingAction) { await pendingAction(); setPendingAction(null); }
    } catch (e) { setError(String(e)); }
  };

  // When selection changes, sync the code editor
  useEffect(() => {
    if (!selectedTheme) { setEditedJson(""); setDirty(false); setJsonError(null); setParsedVars(null); setParsedDarkVars(null); return; }
    const obj: Record<string, unknown> = {
      name: selectedTheme.name,
      author: selectedTheme.author,
      version: selectedTheme.version,
      harvest_version: selectedTheme.harvest_version,
    };
    if (selectedTheme.renderer_pack) {
      obj.renderer_pack = true;
    }
    if (selectedTheme.capabilities) {
      obj.capabilities = selectedTheme.capabilities;
    }
    obj.variables = selectedTheme.variables;
    if (Object.keys(selectedTheme.dark_variables).length > 0) {
      obj.dark_variables = selectedTheme.dark_variables;
    }
    setEditedJson(JSON.stringify(obj, null, 2));
    setDirty(false);
    setJsonError(null);
    setParsedVars(null);
    setParsedDarkVars(null);
  }, [selected, selectedTheme?.name, selectedTheme?.author, selectedTheme?.version]);

  // Validate a theme name: 1-64 chars, only letters/digits/spaces/hyphens/underscores/parens/apostrophes/periods
  const _NAME_RE = /^[a-zA-Z0-9 \-_'().]+$/;
  const validateThemeName = (name: string): string | null => {
    const t = name.trim();
    if (!t) return "Theme name cannot be empty.";
    if (t.length > 64) return "Theme name must be 64 characters or fewer.";
    if (!_NAME_RE.test(t)) return "Theme name may only contain letters, numbers, spaces, hyphens, underscores, apostrophes, parentheses, and periods.";
    return null;
  };

  // Returns a name that doesn't conflict with any existing theme name
  const uniqueThemeName = (base: string): string => {
    if (!themes.some(t => t.name.toLowerCase() === base.toLowerCase())) return base;
    let i = 2;
    while (themes.some(t => t.name.toLowerCase() === `${base} (${i})`.toLowerCase())) i++;
    return `${base} (${i})`;
  };

  // Usage count helper
  const usageForTheme = (themeId: string) => tokens.filter(t => themeUrlToId(t.theme_url) === themeId).length;
  const widgetsUsingTheme = (themeId: string) => tokens.filter(t => themeUrlToId(t.theme_url) === themeId);

  // JSON edit handler with debounced parse
  const handleJsonChange = (value: string) => {
    setEditedJson(value);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value);
        if (!parsed.variables || typeof parsed.variables !== "object") {
          setJsonError("Missing or invalid 'variables' object.");
          return;
        }
        setJsonError(null);
        setParsedVars(parsed.variables);
        setParsedDarkVars(parsed.dark_variables ?? null);
      } catch (e) {
        setJsonError(String(e).replace("SyntaxError: ", ""));
      }
    }, 300);
  };

  // CRUD handlers
  const handleCreate = async () => {
    try {
      const theme = await api.themes.create({
        name: uniqueThemeName("New Theme"),
        author: "",
        version: "1.0",
        variables: themes.find(t => t.theme_id === "default")?.variables ?? {},
        dark_variables: themes.find(t => t.theme_id === "default")?.dark_variables ?? {},
      });
      const updated = await reload();
      if (updated) setSelected(theme.theme_id);
    } catch (e) { setError(String(e)); }
  };

  const handleDuplicate = () => {
    if (!selectedTheme) return;
    const doDuplicate = async () => {
      try {
        const theme = await api.themes.create({
          name: uniqueThemeName(`Copy of ${selectedTheme.name}`),
          variables: selectedTheme.variables,
          dark_variables: selectedTheme.dark_variables,
          author: "",
          version: "1.0",
          renderer_pack: selectedTheme.renderer_pack,
        });
        const updated = await reload();
        if (updated) {
          setSelected(theme.theme_id);
          const obj: Record<string, unknown> = {
            name: theme.name,
            author: theme.author,
            version: theme.version,
            harvest_version: theme.harvest_version,
          };
          if (theme.renderer_pack) obj.renderer_pack = true;
          if (theme.capabilities) obj.capabilities = theme.capabilities;
          obj.variables = theme.variables;
          if (Object.keys(theme.dark_variables ?? {}).length > 0) obj.dark_variables = theme.dark_variables;
          setEditedJson(JSON.stringify(obj, null, 2));
          setDirty(false);
          setJsonError(null);
          setParsedVars(null);
          setParsedDarkVars(null);
        }
      } catch (e) { setError(String(e)); }
    };
    if (selectedTheme.renderer_pack) { requireConsent(doDuplicate); }
    else { doDuplicate(); }
  };

  const handleDelete = async () => {
    if (!selectedTheme || selectedTheme.is_bundled) return;
    try {
      await api.themes.delete(selectedTheme.theme_id);
      setSelected(null);
      setConfirmDelete(false);
      await reload();
    } catch (e) { setError(String(e)); setConfirmDelete(false); }
  };

  const handleExport = async () => {
    if (!selectedTheme) return;
    const obj: Record<string, unknown> = {
      name: selectedTheme.name,
      author: selectedTheme.author,
      version: selectedTheme.version,
      harvest_version: selectedTheme.harvest_version,
    };
    if (selectedTheme.renderer_pack) {
      obj.renderer_pack = true;
    }
    if (selectedTheme.capabilities) {
      obj.capabilities = selectedTheme.capabilities;
    }
    obj.variables = selectedTheme.variables;
    if (Object.keys(selectedTheme.dark_variables).length > 0) {
      obj.dark_variables = selectedTheme.dark_variables;
    }
    const slug = selectedTheme.name.toLowerCase().replace(/\s+/g, "-");
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (packId) {
      try {
        const result = await api.packs.getCode(packId);
        if (result.code) {
          const jsBlob = new Blob([result.code], { type: "application/javascript" });
          const jsUrl = URL.createObjectURL(jsBlob);
          const jsA = document.createElement("a");
          jsA.href = jsUrl;
          jsA.download = `${slug}.js`;
          jsA.click();
          URL.revokeObjectURL(jsUrl);
        }
      } catch { /* pack code unavailable - skip JS export */ }
    }
  };

  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    const t0 = Date.now();
    try {
      const result = await api.themes.reload();
      if (result?.errors && Object.keys(result.errors).length > 0) {
        const msgs = Object.entries(result.errors).map(([id, err]) => `${id}: ${err}`).join("; ");
        setError(`Theme reload failed for: ${msgs}`);
      }
      if (packId) clearPackCache(packId);
      await reload();
      setPreviewKey(k => k + 1);
    } catch (e) { setError(String(e)); }
    const elapsed = Date.now() - t0;
    if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));
    setReloading(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.name || !parsed.variables || typeof parsed.variables !== "object") {
        setError("Invalid theme file: must contain 'name' and 'variables'.");
        return;
      }
      const importNameError = validateThemeName(String(parsed.name));
      if (importNameError) { setError(importNameError); if (fileRef.current) fileRef.current.value = ""; return; }
      if (themes.some(t => t.name.toLowerCase() === String(parsed.name).toLowerCase())) {
        setError(`A theme named "${parsed.name}" already exists. Rename the existing theme first, or edit the JSON before importing.`);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      const doImport = async () => {
        const theme = await api.themes.create({
          name: parsed.name,
          variables: parsed.variables,
          dark_variables: parsed.dark_variables,
          author: parsed.author ?? "",
          version: parsed.version ?? "1.0",
          renderer_pack: !!parsed.renderer_pack,
          capabilities: parsed.capabilities ?? undefined,
        });
        const updated = await reload();
        if (updated) setSelected(theme.theme_id);
        if (parsed.renderer_pack) {
          setShowPackReminder(true);
        }
      };
      if (parsed.renderer_pack) { requireConsent(doImport); }
      else { await doImport(); }
    } catch (err) {
      setError(String(err));
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!selectedTheme || selectedTheme.is_bundled || !dirty || jsonError) return;
    const doSave = async () => {
      setSaving(true);
      try {
        const parsed = JSON.parse(editedJson);
        await api.themes.update(selectedTheme.theme_id, {
          name: parsed.name ?? selectedTheme.name,
          author: parsed.author ?? selectedTheme.author,
          version: parsed.version ?? selectedTheme.version,
          variables: parsed.variables,
          dark_variables: parsed.dark_variables ?? {},
          renderer_pack: !!parsed.renderer_pack,
          capabilities: parsed.capabilities ?? null,
        });
        setDirty(false);
        setParsedVars(null);
        setParsedDarkVars(null);
        await reload();
      } catch (e) { setError(String(e)); }
      setSaving(false);
    };
    try {
      const parsed = JSON.parse(editedJson);
      if (parsed.renderer_pack && !selectedTheme.renderer_pack) {
        requireConsent(doSave);
      } else {
        await doSave();
      }
    } catch { await doSave(); }
  };

  const handleCancel = () => {
    if (!selectedTheme) return;
    const obj: Record<string, unknown> = {
      name: selectedTheme.name,
      author: selectedTheme.author,
      version: selectedTheme.version,
      harvest_version: selectedTheme.harvest_version,
    };
    if (selectedTheme.renderer_pack) {
      obj.renderer_pack = true;
    }
    if (selectedTheme.capabilities) {
      obj.capabilities = selectedTheme.capabilities;
    }
    obj.variables = selectedTheme.variables;
    if (Object.keys(selectedTheme.dark_variables).length > 0) {
      obj.dark_variables = selectedTheme.dark_variables;
    }
    setEditedJson(JSON.stringify(obj, null, 2));
    setDirty(false);
    setJsonError(null);
    setParsedVars(null);
    setParsedDarkVars(null);
  };

  const handleNameBlur = async (newName: string) => {
    if (!selectedTheme || selectedTheme.is_bundled) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === selectedTheme.name) return;
    const nameErr = validateThemeName(trimmed);
    if (nameErr) { setError(nameErr); return; }
    if (themes.some(t => t.theme_id !== selectedTheme.theme_id && t.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`A theme named "${trimmed}" already exists.`);
      return;
    }
    try {
      await api.themes.update(selectedTheme.theme_id, { name: trimmed });
      await reload();
    } catch (e) { setError(String(e)); }
  };

  const handleAuthorBlur = async (newAuthor: string) => {
    if (!selectedTheme || selectedTheme.is_bundled) return;
    const trimmed = newAuthor.trim();
    if (trimmed === selectedTheme.author) return;
    try {
      await api.themes.update(selectedTheme.theme_id, { author: trimmed });
      await reload();
    } catch (e) { setError(String(e)); }
  };

  const handleVersionBlur = async (newVersion: string) => {
    if (!selectedTheme || selectedTheme.is_bundled) return;
    const trimmed = newVersion.trim();
    if (!trimmed || trimmed === selectedTheme.version) return;
    try {
      await api.themes.update(selectedTheme.theme_id, { version: trimmed });
      await reload();
    } catch (e) { setError(String(e)); }
  };

  const handlePackJsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTheme?.renderer_pack) return;
    const expectedName = `${selectedTheme.name.toLowerCase()}.js`;
    if (file.name.toLowerCase() !== expectedName) {
      setError(`Expected file "${expectedName}" but got "${file.name}". The pack JS file must match the theme name.`);
      if (packJsRef.current) packJsRef.current.value = "";
      return;
    }
    try {
      const code = await file.text();
      const pid = selectedTheme.theme_id;
      await api.packs.updateCode(pid, code);
      const [updated, codeResult] = await Promise.all([
        api.packs.list(),
        api.packs.getCode(pid),
      ]);
      setPacksData(updated);
      setPackCode(codeResult.code);
      setPackCodeDirty(false);
      clearPackCache(pid);
      setPreviewKey(k => k + 1);
      await reload();
    } catch (err) { setError(String(err)); }
    if (packJsRef.current) packJsRef.current.value = "";
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTheme || selectedTheme.is_bundled) return;
    try {
      await api.themes.uploadThumbnail(selectedTheme.theme_id, file);
      setThumbKey(k => k + 1);
      await reload();
    } catch (err) { setError(String(err)); }
    if (thumbRef.current) thumbRef.current.value = "";
  };

  const handleThumbnailDelete = async () => {
    if (!selectedTheme || selectedTheme.is_bundled) return;
    try {
      await api.themes.deleteThumbnail(selectedTheme.theme_id);
      setThumbKey(k => k + 1);
      await reload();
    } catch (err) { setError(String(err)); }
  };

  // Preview vars: use edited JSON if dirty, otherwise theme data
  const previewVars = parsedVars ?? selectedTheme?.variables ?? {};
  const previewDarkVars = parsedDarkVars ?? selectedTheme?.dark_variables ?? {};

  const jsonCopy = useCopy(editedJson);
  const packCodeCopy = useCopy(packCode ?? "");

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="content-narrow col" style={{ gap: 18 }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Theme tray: fixed actions on left, scrollable strip on right */}
      <Card>
        <div className="theme-tray">
          <div className="theme-tray-actions">
            <button className="theme-tray-action" onClick={handleCreate}>
              <Icon name="plus" size={14} /> New Theme
            </button>
            <button className="theme-tray-action" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={14} /> Import
            </button>
            <button className="theme-tray-action" onClick={handleReload} disabled={reloading}>
              {reloading ? <Spinner size={14} /> : <Icon name="refresh" size={14} />}
              {reloading ? "Reloading..." : "Reload"}
            </button>
          </div>
          <div className="theme-strip">
            {themes.map(t => (
              <button
                key={t.theme_id}
                className={`theme-strip-item${selected === t.theme_id ? " selected" : ""}`}
                onClick={() => setSelected(t.theme_id)}
              >
                <div className="theme-thumb-wrap">
                  {thumbUrls[t.theme_id] ? (
                    <img
                      className="theme-strip-thumb"
                      src={thumbUrls[t.theme_id]}
                      alt={t.name}
                      draggable={false}
                    />
                  ) : (
                    <div className="theme-strip-thumb" />
                  )}
                  {t.renderer_pack && (
                    <span
                      className={`theme-pack-star${!t.has_pack ? " pack-missing" : ""}`}
                      title={t.has_pack ? "Theme includes a custom renderer pack" : "Renderer pack JS file is missing"}
                    >
                      {t.has_pack ? "★" : "⚠"}
                    </span>
                  )}
                </div>
                <span className="theme-strip-name">{t.name}</span>
                <div className="theme-strip-meta">
                  {t.is_bundled && <span className="badge badge-muted">System</span>}
                  <span className="muted" style={{ fontSize: 11 }}>{usageForTheme(t.theme_id)} widget{usageForTheme(t.theme_id) !== 1 ? "s" : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
        <input ref={thumbRef} type="file" accept=".png,.jpg,.jpeg" style={{ display: "none" }} onChange={handleThumbnailUpload} />
        <input ref={packJsRef} type="file" accept=".js" style={{ display: "none" }} onChange={handlePackJsUpload} />
      </Card>

      {selectedTheme && (
        <>
          {/* Info card */}
          <Card
            title="Theme Info"
            action={
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-sm" onClick={handleDuplicate}>
                  <Icon name="copy" size={13} /> Duplicate
                </button>
                <button className="btn btn-sm" onClick={handleExport}>
                  <Icon name="download" size={13} /> Export
                </button>
                {!selectedTheme.is_bundled && (
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>
                    <Icon name="trash" size={13} /> Delete
                  </button>
                )}
              </div>
            }
          >
            <div className="col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                {selectedTheme.is_bundled ? (
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{selectedTheme.name}</span>
                ) : (
                  <input
                    className="input"
                    defaultValue={selectedTheme.name}
                    style={{ fontSize: 16, fontWeight: 600, flex: 1 }}
                    onBlur={e => handleNameBlur(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  />
                )}
              </div>

              {selectedTheme.is_bundled ? (
                <>
                  {selectedTheme.author && (
                    <div className="muted" style={{ fontSize: 12 }}>Author: {selectedTheme.author}</div>
                  )}
                  {selectedTheme.version && (
                    <div className="muted" style={{ fontSize: 12 }}>Version: {selectedTheme.version}</div>
                  )}
                </>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <input
                    className="input"
                    defaultValue={selectedTheme.author}
                    key={`author-${selectedTheme.theme_id}`}
                    placeholder="Author"
                    style={{ flex: 1, fontSize: 12 }}
                    onBlur={e => handleAuthorBlur(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  />
                  <input
                    className="input"
                    defaultValue={selectedTheme.version}
                    key={`version-${selectedTheme.theme_id}`}
                    placeholder="Version"
                    style={{ width: 80, fontSize: 12 }}
                    onBlur={e => handleVersionBlur(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  />
                </div>
              )}

              {!selectedTheme.is_bundled && (
                <div className="row" style={{ gap: 6, alignItems: "center" }}>
                  <button className="btn btn-sm" onClick={() => thumbRef.current?.click()}>
                    <Icon name="upload" size={13} /> {selectedTheme.has_thumbnail ? "Replace Thumbnail" : "Upload Thumbnail"}
                  </button>
                  {selectedTheme.has_thumbnail && (
                    <button className="btn btn-sm" onClick={handleThumbnailDelete}>
                      <Icon name="trash" size={13} /> Remove
                    </button>
                  )}
                </div>
              )}

              {widgetsUsingTheme(selectedTheme.theme_id).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Used by</div>
                  <div className="col" style={{ gap: 2 }}>
                    {widgetsUsingTheme(selectedTheme.theme_id).map(tk => (
                      <button key={tk.token_id} className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }} onClick={() => onSelectToken(tk.token_id)}>
                        {tk.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Preview card */}
          <Card title="Preview">
            <WidgetPreview key={`preview-${selected}-${previewKey}`} variables={previewVars} darkVariables={previewDarkVars} packId={packId || undefined} />
          </Card>

          {/* Code card */}
          <Card
            title="Theme JSON"
            action={
              <button className={`btn btn-ghost btn-sm${jsonCopy.copied ? " btn-success" : ""}`} onClick={jsonCopy.copy}>
                <Icon name="copy" size={13} /> {jsonCopy.copied ? "Copied" : "Copy"}
              </button>
            }
          >
            <div className="col" style={{ gap: 8 }}>
              <textarea
                className={`theme-code-textarea${jsonError ? " error" : ""}`}
                value={editedJson}
                onChange={e => handleJsonChange(e.target.value)}
                readOnly={selectedTheme.is_bundled}
                spellCheck={false}
              />
              {jsonError && <div className="theme-code-error">{jsonError}</div>}
              {!selectedTheme.is_bundled && (
                <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn btn-sm" onClick={handleCancel} disabled={!dirty}>Cancel</button>
                  <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={!dirty || !!jsonError || saving}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Renderer Pack card - bundled pack */}
          {packId && selectedPack && (
            <Card title="Renderer Pack">
              <div className="col" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <strong>{selectedPack.name}</strong>
                  {selectedPack.is_bundled && <span className="badge badge-muted">Bundled</span>}
                </div>
                {selectedPack.description && (
                  <div className="muted" style={{ fontSize: 12 }}>{selectedPack.description}</div>
                )}
                {packCode !== null && (
                  <div className="col" style={{ gap: 8, marginTop: 4 }}>
                    <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Pack Source</div>
                      <button className={`btn btn-ghost btn-sm${packCodeCopy.copied ? " btn-success" : ""}`} onClick={packCodeCopy.copy}>
                        <Icon name="copy" size={13} /> {packCodeCopy.copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <textarea
                      className="theme-code-textarea"
                      value={packCode}
                      readOnly
                      spellCheck={false}
                      style={{ minHeight: 200 }}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Renderer Pack card - user pack with code loaded */}
          {packId && !selectedPack && packCode !== null && (
            <Card title="Renderer Pack">
              <div className="col" style={{ gap: 10 }}>
                <div className="col" style={{ gap: 8 }}>
                  <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Pack Source</div>
                    <button className={`btn btn-ghost btn-sm${packCodeCopy.copied ? " btn-success" : ""}`} onClick={packCodeCopy.copy}>
                      <Icon name="copy" size={13} /> {packCodeCopy.copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <textarea
                    className="theme-code-textarea"
                    value={packCode}
                    onChange={e => { setPackCode(e.target.value); setPackCodeDirty(true); }}
                    readOnly={selectedTheme.is_bundled}
                    spellCheck={false}
                    style={{ minHeight: 200 }}
                  />
                  {!selectedTheme.is_bundled && (
                    <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn btn-sm" onClick={() => {
                        if (packId) api.packs.getCode(packId).then(r => { setPackCode(r.code); setPackCodeDirty(false); }).catch(() => {});
                      }} disabled={!packCodeDirty}>Cancel</button>
                      <button className="btn btn-sm btn-primary" disabled={!packCodeDirty || packCodeSaving} onClick={async () => {
                        if (!packId) return;
                        setPackCodeSaving(true);
                        try {
                          await api.packs.updateCode(packId, packCode);
                          setPackCodeDirty(false);
                        } catch (e) { setError(String(e)); }
                        setPackCodeSaving(false);
                      }}>
                        {packCodeSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Renderer Pack card - pack JS not yet uploaded */}
          {packId && !selectedPack && packCode === null && (
            <Card title="Renderer Pack">
              <div className="col" style={{ gap: 10 }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  This theme expects a renderer pack but the JS file is not installed yet.
                </div>
                <div style={{ fontSize: 12 }}>Upload <code>{selectedTheme.name.toLowerCase()}.js</code> to enable the renderer pack.</div>
                <button className="btn btn-sm btn-primary" style={{ alignSelf: "flex-start" }} onClick={() => packJsRef.current?.click()}>
                  <Icon name="upload" size={13} /> Upload Pack JS
                </button>
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedTheme && !loading && (
        <div className="muted" style={{ textAlign: "center", padding: 32, fontSize: 14 }}>
          Select a theme above to view and edit it.
        </div>
      )}

      {confirmDelete && selectedTheme && (
        <ConfirmDialog
          title="Delete theme"
          message={
            usageForTheme(selectedTheme.theme_id) > 0
              ? `"${selectedTheme.name}" is used by ${usageForTheme(selectedTheme.theme_id)} widget${usageForTheme(selectedTheme.theme_id) !== 1 ? "s" : ""}. They will fall back to the Default theme. Delete anyway?`
              : `Delete "${selectedTheme.name}" permanently?`
          }
          confirmLabel="Delete"
          confirmDestructive
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}


      {showPackReminder && (
        <div className="overlay" onClick={() => setShowPackReminder(false)}>
          <div className="dialog" onClick={e => e.stopPropagation()}>
            <h3 className="dialog-title">Upload Renderer Pack</h3>
            <div className="dialog-body">
              <p>
                This theme includes a renderer pack. Select the matching <code>.js</code> file to enable it.
              </p>
            </div>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowPackReminder(false)}>
                Skip
              </button>
              <button className="btn btn-primary" autoFocus onClick={() => { setShowPackReminder(false); setTimeout(() => packJsRef.current?.click(), 100); }}>
                Upload JS
              </button>
            </div>
          </div>
        </div>
      )}

      {showAgree && (
        <div className="overlay" onClick={() => { setShowAgree(false); setAgreeText(""); setPendingAction(null); }}>
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
              <button className="btn btn-ghost" onClick={() => { setShowAgree(false); setAgreeText(""); setPendingAction(null); }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={agreeText !== "AGREE"} onClick={confirmAgree}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
