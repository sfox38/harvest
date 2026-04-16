/**
 * api.ts - HTTP API client for the HArvest panel.
 *
 * All calls go to the HA HTTP API endpoints registered by http_views.py.
 * HA's cookie-based session authentication is used - the browser's session
 * cookie is sent automatically with every fetch (credentials: "include").
 *
 * All functions throw on non-2xx responses. The caller is responsible for
 * error handling and displaying messages to the user.
 */

import type {
  Token,
  Session,
  ActivityPage,
  HarvestAction,
  IntegrationConfig,
  PanelStats,
  HourlyBucket,
} from "./types";

const BASE = "/api/harvest";

// ---------------------------------------------------------------------------
// Auth token - set by main.tsx from the hass property before first render
// ---------------------------------------------------------------------------

let _authToken = "";

export function setAuthToken(token: string): void {
  _authToken = token;
}

function _authHeader(): Record<string, string> {
  return _authToken ? { "Authorization": `Bearer ${_authToken}` } : {};
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = params
    ? `${BASE}${path}?${new URLSearchParams(params)}`
    : `${BASE}${path}`;
  const res = await fetch(url, { headers: _authHeader() });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function _post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ..._authHeader() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function _patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ..._authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function _delete(path: string, params?: Record<string, string>): Promise<void> {
  const url = params
    ? `${BASE}${path}?${new URLSearchParams(params)}`
    : `${BASE}${path}`;
  const res = await fetch(url, { method: "DELETE", headers: _authHeader() });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
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

    createPreview: (data: { entity_ids: string[]; capability: "read" | "read-write" }): Promise<{ token_id: string; expires_at: string }> =>
      _post("/tokens/preview", data),

    update: (tokenId: string, data: Partial<Token>): Promise<Token> =>
      _patch<Token>(`/tokens/${tokenId}`, data),

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
    }): Promise<ActivityPage> => {
      const p: Record<string, string> = {};
      if (params.offset !== undefined) p.offset = String(params.offset);
      if (params.limit  !== undefined) p.limit  = String(params.limit);
      if (params.token_id)  p.token_id  = params.token_id;
      if (params.event_type) p.event_type = params.event_type;
      if (params.since) p.since = params.since;
      if (params.until) p.until = params.until;
      return _get<ActivityPage>("/activity", p);
    },

    exportCsvUrl: (params: Record<string, string>): string =>
      `${BASE}/activity/export?${new URLSearchParams(params)}`,

    aggregates: (hours = 24): Promise<HourlyBucket[]> =>
      _get<HourlyBucket[]>("/activity/aggregates", { hours: String(hours) }),
  },

  // ---------------------------------------------------------------------------
  // Harvest actions
  // ---------------------------------------------------------------------------

  actions: {
    list: (): Promise<HarvestAction[]> =>
      _get<HarvestAction[]>("/actions"),

    create: (data: Partial<HarvestAction>): Promise<HarvestAction> =>
      _post<HarvestAction>("/actions", data),

    delete: (actionId: string): Promise<void> =>
      _delete(`/actions/${actionId}`),
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
};
