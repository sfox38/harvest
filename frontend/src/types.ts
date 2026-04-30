/**
 * types.ts - Shared TypeScript types for the HArvest panel frontend.
 * Mirrors the data models defined in api-internal.md and SPEC.md.
 */

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export interface OriginConfig {
  allow_any: boolean;
  allowed: string[];
  allow_paths: string[];
}

export interface RateLimitConfig {
  override_defaults: boolean;
  max_push_per_second: number | null;
  max_commands_per_minute: number | null;
}

export interface SessionConfig {
  lifetime_minutes: number;
  max_lifetime_minutes: number;
  max_renewals: number | null;
  absolute_lifetime_hours: number | null;
}

export interface ActiveScheduleWindow {
  days: string[]; // "mon", "tue", "wed", "thu", "fri", "sat", "sun"
  start: string;  // "HH:MM"
  end: string;    // "HH:MM"
}

export interface ActiveSchedule {
  timezone: string;
  windows: ActiveScheduleWindow[];
}

export interface GestureAction {
  action: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

export interface GestureConfig {
  tap?: GestureAction | null;
  hold?: GestureAction | null;
  double_tap?: GestureAction | null;
}

export interface EntityAccess {
  entity_id: string;
  alias: string | null;
  capabilities: "read" | "read-write";
  exclude_attributes: string[];
  companion_of: string | null;
  graph: "line" | "bar" | null;
  hours: number;
  period: number;
  animate: boolean;
  gesture_config: GestureConfig;
}

export type TokenStatus = "active" | "inactive" | "expiring_soon" | "expired" | "revoked";

export interface Token {
  token_id: string;
  token_version: number;
  created_at: string;
  created_by: string;
  created_by_name?: string | null;
  label: string;
  expires: string | null;
  token_secret: boolean; // true when HMAC is enabled; plaintext never returned
  origins: OriginConfig;
  entities: EntityAccess[];
  rate_limits: RateLimitConfig;
  session: SessionConfig;
  max_sessions: number | null;
  active_schedule: ActiveSchedule | null;
  allowed_ips: string[];
  status: TokenStatus;
  active_sessions: number;
  paused: boolean;
  embed_mode: "single" | "group" | "page";
  theme_url: string;
  renderer_pack: string;
  lang: string;
  a11y: "standard" | "enhanced";
  color_scheme: "auto" | "light" | "dark";
  custom_messages: boolean;
  on_offline: "dim" | "hide" | "message" | "last-state";
  on_error: "dim" | "hide" | "message";
  offline_text: string;
  error_text: string;
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface Session {
  session_id: string;
  widget_token_id: string;
  issued_at: string;
  expires_at: string;
  absolute_expires_at: string | null;
  origin: string;
  referer: string | null;
  ip_address: string | null;
  renewal_count: number;
  subscribed_entity_ids: string[];
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export type ActivityEventType =
  | "AUTH_OK"
  | "AUTH_FAIL"
  | "COMMAND"
  | "SESSION_END"
  | "TOKEN_CREATED"
  | "TOKEN_REVOKED"
  | "TOKEN_DELETED"
  | "RENEWAL"
  | "SUSPICIOUS_ORIGIN"
  | "FLOOD_PROTECTION"
  | "RATE_LIMITED"
  | "ERROR";

export interface ActivityEvent {
  id: number;
  type: ActivityEventType;
  timestamp: string;
  token_id: string | null;
  token_label: string | null;
  session_id: string | null;
  origin: string | null;
  referer: string | null;
  entity_id: string | null;
  action: string | null;
  code: string | null;
  message: string | null;
}

export interface ActivityPage {
  total: number;
  offset: number;
  limit: number;
  events: ActivityEvent[];
}

// ---------------------------------------------------------------------------
// Harvest action
// ---------------------------------------------------------------------------

export interface ServiceCallDef {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

export interface HarvestAction {
  action_id: string;
  label: string;
  icon: string;
  service_calls: ServiceCallDef[];
  created_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface ThemeDefinition {
  theme_id: string;
  name: string;
  author: string;
  version: string;
  harvest_version: number;
  variables: Record<string, string>;
  dark_variables: Record<string, string>;
  renderer_pack: boolean;
  has_pack: boolean;
  is_bundled: boolean;
  has_thumbnail: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Renderer packs
// ---------------------------------------------------------------------------

export interface RendererPack {
  pack_id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  is_bundled: boolean;
}

export interface PacksResponse {
  agreed: boolean;
  packs: RendererPack[];
}

// ---------------------------------------------------------------------------
// Integration config (Settings)
// ---------------------------------------------------------------------------

export interface HaEventBusConfig {
  harvest_token_revoked: boolean;
  harvest_suspicious_origin: boolean;
  harvest_session_limit_reached: boolean;
  harvest_flood_protection: boolean;
  harvest_session_connected: boolean;
  harvest_auth_failure: boolean;
}

export interface IntegrationConfig {
  auth_timeout_seconds: number;
  max_entities_per_token: number;
  keepalive_interval_seconds: number;
  keepalive_timeout_seconds: number;
  heartbeat_timeout_seconds: number;
  activity_log_retention_days: number;
  absolute_session_lifetime_hours: number;
  max_auth_attempts_per_token_per_minute: number;
  max_auth_attempts_per_ip_per_minute: number;
  override_host: string;
  widget_script_url: string;
  trusted_proxies: string[];
  kill_switch: boolean;
  default_lang: string;
  default_a11y: "standard" | "enhanced";
  default_on_offline: "dim" | "hide" | "message" | "last-state";
  default_on_error: "dim" | "hide" | "message";
  default_offline_text: string;
  default_error_text: string;
  default_session: {
    lifetime_minutes: number;
    max_lifetime_minutes: number;
  };
  ha_event_bus: HaEventBusConfig;
  platform_version?: string;
}

// ---------------------------------------------------------------------------
// Diagnostic stats
// ---------------------------------------------------------------------------

export interface PanelStats {
  active_sessions: number;
  active_tokens: number;
  commands_today: number;
  errors_today: number;
  db_size_bytes: number;
  is_running: boolean;
}

// ---------------------------------------------------------------------------
// Activity aggregates (for graphs)
// ---------------------------------------------------------------------------

export interface HourlyBucket {
  hour: string; // ISO datetime, truncated to hour
  commands: number;
  sessions: number;
  auth_failures: number;
}

// ---------------------------------------------------------------------------
// HA entity (entity picker cache)
// ---------------------------------------------------------------------------

export interface HAEntity {
  entity_id: string;
  friendly_name: string;
  domain: string;
  state: string;
}

export interface HAEntityDetail {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Panel navigation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const DEFAULT_WIDGET_SCRIPT_URL = "";

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

export const LABEL_ILLEGAL = /[\x00-\x1f<>"&]/;

export function validateLabel(label: string, otherLabels: string[]): string | null {
  const t = label.trim();
  if (!t) return "Name is required.";
  if (t.length > 100) return "Name must be 100 characters or fewer.";
  if (LABEL_ILLEGAL.test(t)) return "Name contains invalid characters.";
  if (otherLabels.some(l => l.trim().toLowerCase() === t.toLowerCase())) {
    return "A widget with this name already exists.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// API mutation types (token_secret accepts sentinel values, not just boolean)
// ---------------------------------------------------------------------------

export type TokenUpdate = Omit<Partial<Token>, "token_secret"> & {
  token_secret?: "generate" | null;
};

export interface TokenUpdateResponse extends Token {
  generated_secret?: string;
}

// ---------------------------------------------------------------------------
// Panel navigation
// ---------------------------------------------------------------------------

export type Screen = "dashboard" | "widgets" | "themes" | "actions" | "activity" | "sessions" | "settings";
