/**
 * api.ts - HTTP API client for the HArvest panel.
 *
 * All calls go to the HA HTTP API endpoints registered by http_views.py.
 * Auth uses the bearer token from the hass object HA passes to the panel
 * custom element. Before each request, the token expiry is checked and
 * refreshed proactively if within 60s of expiry; on 401, the token is
 * refreshed and the request retried once.
 */

import type {
  Token,
  TokenUpdate,
  TokenUpdateResponse,
  Session,
  ActivityPage,
  HarvestAction,
  ServiceCallDef,
  IntegrationConfig,
  PanelStats,
  HourlyBucket,
  HAEntity,
  HAEntityDetail,
  ThemeDefinition,
  RendererPack,
  PacksResponse,
} from "./types";

const BASE = "/api/harvest";

// ---------------------------------------------------------------------------
// Hass instance - set by main.tsx, used for auth token + refresh
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hass: any = null;

let _haDarkMode = false;
const _darkModeListeners: Array<(dark: boolean) => void> = [];

export function getHaDarkMode(): boolean { return _haDarkMode; }

export function onHaDarkModeChange(cb: (dark: boolean) => void): () => void {
  _darkModeListeners.push(cb);
  return () => {
    const i = _darkModeListeners.indexOf(cb);
    if (i >= 0) _darkModeListeners.splice(i, 1);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setHass(hass: any): void {
  _hass = hass;
  const dark = hass?.themes?.darkMode ?? false;
  if (dark !== _haDarkMode) {
    _haDarkMode = dark;
    _darkModeListeners.forEach(cb => cb(dark));
  }
}

// ---------------------------------------------------------------------------
// Core request helper with proactive token refresh and 401 retry
// ---------------------------------------------------------------------------

async function _doReq<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
  responseType: "json" | "text" = "json",
): Promise<T> {
  if (!retried && _hass?.auth) {
    const expires: number | undefined = _hass.auth.data?.expires;
    if (expires !== undefined && Date.now() > expires - 60_000) {
      await _hass.auth.refreshAccessToken();
    }
  }

  const token: string | undefined = _hass?.auth?.data?.access_token;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const url = path.startsWith("/api/") ? path : `${BASE}${path}`;
  const res = await fetch(url, opts);

  if (res.status === 401 && !retried && _hass?.auth) {
    await _hass.auth.refreshAccessToken();
    return _doReq<T>(method, path, body, true, responseType);
  }

  if (!res.ok) {
    const reason = await res.text().catch(() => "");
    throw new Error(`${method} ${path} failed: ${res.status}${reason ? ` - ${reason}` : ""}`);
  }

  if (res.status === 204) return undefined as T;
  if (responseType === "text") return res.text() as Promise<T>;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

function _get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return _doReq<T>("GET", url);
}

function _post<T>(path: string, body?: unknown): Promise<T> {
  return _doReq<T>("POST", path, body);
}

function _patch<T>(path: string, body: unknown): Promise<T> {
  return _doReq<T>("PATCH", path, body);
}

function _getText(path: string, params?: Record<string, string>): Promise<string> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return _doReq<string>("GET", url, undefined, false, "text");
}

function _delete(path: string, params?: Record<string, string>): Promise<void> {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return _doReq<void>("DELETE", url);
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export const api = {
  tokens: {
    list: (): Promise<Token[]> =>
      _get<Token[]>("/tokens"),

    get: (tokenId: string): Promise<Token> =>
      _get<Token>(`/tokens/${tokenId}`),

    create: (data: Partial<Token>): Promise<Token> =>
      _post<Token>("/tokens", data),

    createPreview: (data: { entity_id: string; capabilities: "read" | "read-write" }): Promise<{ token_id: string; expires: string | null }> =>
      _post("/tokens/preview", data),

    update: (tokenId: string, data: Partial<Token> | TokenUpdate): Promise<TokenUpdateResponse> =>
      _patch<TokenUpdateResponse>(`/tokens/${tokenId}`, data),

    revoke: (tokenId: string, reason?: string): Promise<void> =>
      _delete(`/tokens/${tokenId}`, { action: "revoke", ...(reason ? { reason } : {}) }),

    delete: (tokenId: string): Promise<void> =>
      _delete(`/tokens/${tokenId}`),

    generateAlias: (entityId: string): Promise<{ entity_id: string; alias: string }> =>
      _post("/alias", { entity_id: entityId }),
  },

  // ---------------------------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------------------------

  sessions: {
    list: (tokenId?: string): Promise<Session[]> =>
      _get<Session[]>("/sessions", tokenId ? { token_id: tokenId } : undefined),

    terminate: (sessionId: string): Promise<void> =>
      _delete(`/sessions/${sessionId}`),

    terminateAll: (tokenId: string): Promise<void> =>
      _delete(`/sessions`, { token_id: tokenId }),
  },

  // ---------------------------------------------------------------------------
  // Activity log
  // ---------------------------------------------------------------------------

  activity: {
    list: (params: {
      offset?: number;
      limit?: number;
      token_id?: string;
      event_type?: string;
      since?: string;
      until?: string;
      search?: string;
    }): Promise<ActivityPage> => {
      const p: Record<string, string> = {};
      if (params.offset     !== undefined) p.offset     = String(params.offset);
      if (params.limit      !== undefined) p.limit      = String(params.limit);
      if (params.token_id)   p.token_id   = params.token_id;
      if (params.event_type) p.event_type = params.event_type;
      if (params.since)      p.since      = params.since;
      if (params.until)      p.until      = params.until;
      if (params.search)     p.search     = params.search;
      return _get<ActivityPage>("/activity", p);
    },

    exportCsv: async (params: Record<string, string>): Promise<void> => {
      const csv = await _getText("/activity/export", params);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "harvest_activity.csv";
      a.click();
      URL.revokeObjectURL(url);
    },

    aggregates: (hours = 24): Promise<HourlyBucket[]> =>
      _get<HourlyBucket[]>("/activity/aggregates", { hours: String(hours) }),
  },

  // ---------------------------------------------------------------------------
  // Harvest actions
  // ---------------------------------------------------------------------------

  actions: {
    list: (): Promise<HarvestAction[]> =>
      _get<HarvestAction[]>("/actions"),

    create: (data: { label: string; icon: string; service_calls: ServiceCallDef[] }): Promise<HarvestAction> =>
      _post<HarvestAction>("/actions", data),

    update: (actionId: string, data: Partial<{ label: string; icon: string; service_calls: ServiceCallDef[] }>): Promise<HarvestAction> =>
      _patch<HarvestAction>(`/actions/${actionId}`, data),

    delete: (actionId: string): Promise<void> =>
      _delete(`/actions/${actionId}`),
  },

  // ---------------------------------------------------------------------------
  // Themes
  // ---------------------------------------------------------------------------

  themes: {
    list: (): Promise<ThemeDefinition[]> =>
      _get<ThemeDefinition[]>("/themes"),

    get: (themeId: string): Promise<ThemeDefinition> =>
      _get<ThemeDefinition>(`/themes/${themeId}`),

    create: (data: { name: string; variables: Record<string, string>; dark_variables?: Record<string, string>; author?: string; version?: string; renderer_pack?: boolean; capabilities?: unknown }): Promise<ThemeDefinition> =>
      _post<ThemeDefinition>("/themes", data),

    update: (themeId: string, data: Partial<{ name: string; author: string; version: string; variables: Record<string, string>; dark_variables: Record<string, string>; renderer_pack: boolean; capabilities: unknown }>): Promise<ThemeDefinition> =>
      _patch<ThemeDefinition>(`/themes/${themeId}`, data),

    delete: (themeId: string): Promise<void> =>
      _delete(`/themes/${themeId}`),

    reload: (): Promise<{ status: string; errors?: Record<string, string> }> =>
      _post<{ status: string; errors?: Record<string, string> }>("/themes/reload", {}),

    thumbnailUrl: (themeId: string): string =>
      `${BASE}/themes/${encodeURIComponent(themeId)}/thumbnail`,

    fetchThumbnail: async (themeId: string): Promise<Blob> => {
      const token: string | undefined = (_hass as any)?.auth?.data?.access_token;
      const res = await fetch(`${BASE}/themes/${encodeURIComponent(themeId)}/thumbnail`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.blob();
    },

    uploadThumbnail: async (themeId: string, file: File): Promise<void> => {
      const token: string | undefined = (_hass as any)?.auth?.data?.access_token;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/themes/${encodeURIComponent(themeId)}/thumbnail`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const reason = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status}${reason ? ` - ${reason}` : ""}`);
      }
    },

    deleteThumbnail: (themeId: string): Promise<void> =>
      _delete(`/themes/${themeId}/thumbnail`),
  },

  // ---------------------------------------------------------------------------
  // Renderer packs
  // ---------------------------------------------------------------------------

  packs: {
    list: (): Promise<PacksResponse> =>
      _get<PacksResponse>("/packs"),

    agree: (agreed: boolean): Promise<{ agreed: boolean }> =>
      _post<{ agreed: boolean }>("/packs/agree", { agreed }),

    getCode: (packId: string): Promise<{ pack_id: string; code: string }> =>
      _get<{ pack_id: string; code: string }>(`/packs/${packId}/code`),

    updateCode: (packId: string, code: string): Promise<{ pack_id: string; status: string }> =>
      _post<{ pack_id: string; status: string }>(`/packs/${packId}/code`, { code }),
  },

  // ---------------------------------------------------------------------------
  // Config (Settings screen)
  // ---------------------------------------------------------------------------

  config: {
    get: (): Promise<IntegrationConfig> =>
      _get<IntegrationConfig>("/config"),

    update: (data: Partial<IntegrationConfig>): Promise<IntegrationConfig> =>
      _patch<IntegrationConfig>("/config", data),
  },

  // ---------------------------------------------------------------------------
  // Stats (Dashboard sensor values)
  // ---------------------------------------------------------------------------

  stats: {
    get: (): Promise<PanelStats> =>
      _get<PanelStats>("/stats"),
  },

  // ---------------------------------------------------------------------------
  // Entities (entity picker cache)
  // ---------------------------------------------------------------------------

  entities: {
    list: (): Promise<HAEntity[]> =>
      _get<HAEntity[]>("/entities"),

    get: (entityId: string): Promise<HAEntityDetail> =>
      _doReq<HAEntityDetail>("GET", `/api/states/${entityId}`),
  },

  // ---------------------------------------------------------------------------
  // HA native states (for picking entities outside the harvest tier filter)
  // ---------------------------------------------------------------------------

  ha: {
    statesByDomain: async (domain: string): Promise<HAEntity[]> => {
      const states = await _doReq<{ entity_id: string; state: string; attributes: Record<string, unknown> }[]>(
        "GET", `/api/states`,
      );
      return states
        .filter(s => s.entity_id.startsWith(domain + "."))
        .map(s => ({
          entity_id: s.entity_id,
          friendly_name: (s.attributes.friendly_name as string) ?? s.entity_id,
          domain,
          state: s.state,
        }));
    },

    entityAttributes: async (entityId: string): Promise<string[]> => {
      const state = await _doReq<{ attributes: Record<string, unknown> }>(
        "GET", `/api/states/${entityId}`,
      );
      return Object.keys(state.attributes).filter(k => k !== "friendly_name").sort();
    },
  },
};
