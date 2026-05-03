/**
 * harvest-entry.js - Build entry point for the HArvest widget bundle.
 *
 * Assembles the public window.HArvest API, registers custom elements,
 * and wires up cross-module references (StateCache -> HarvestClient).
 *
 * This file is the single entry point passed to esbuild. The output is
 * an IIFE that assigns window.HArvest and defines the <hrv-card> and
 * <hrv-group> custom elements.
 *
 * Public API surface (window.HArvest):
 *   config(options)                        - Set page-level defaults
 *   create(config)                         - Programmatic card creation
 *   getCard(entityId)                      - Retrieve a registered card
 *   registerRenderer(key, rendererClass)   - Register a custom renderer
 *   renderers                              - All built-in renderer classes
 *   track.anyState(callback)               - Listen to all state updates
 */

import { config, getPageConfig, HrvCard } from "./hrv-card.js";
import { HrvGroup }                        from "./hrv-group.js";
import { getOrCreateClient, getClient, setStateCacheRef } from "./harvest-client.js";
import { StateCache }                      from "./state-cache.js";
import { registerRenderer, lookupRenderer } from "./renderers/index.js";
import * as Renderers                      from "./renderers/index.js";
import { buildEntityDef, filterAttributes } from "./entity-def-builder.js";
import "./hrv-mount.js";

// Wire StateCache into HarvestClient (avoids a circular import at module
// evaluation time - the proxy in harvest-client.js resolves it here).
setStateCacheRef(StateCache);

// hrv-group.js and hrv-card.js register their custom elements on import.
// The imports above are sufficient; no explicit define() calls needed here.

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an HrvCard element programmatically and mount it into the element
 * with the given target ID. haUrl and token in cardConfig are optional if
 * HArvest.config() has already been called.
 *
 * @param {{ targetId: string, entity?: string, alias?: string, token?: string,
 *           haUrl?: string, [key: string]: any }} cardConfig
 * @returns {HrvCard}
 */
function create(cardConfig) {
  const card = document.createElement("hrv-card");
  const pageConfig = getPageConfig();

  const token = cardConfig.token ?? pageConfig.token ?? "";
  const haUrl = cardConfig.haUrl ?? pageConfig.haUrl ?? "";

  if (token)             card.setAttribute("token",    token);
  if (haUrl)             card.setAttribute("ha-url",   haUrl);
  if (cardConfig.entity) card.setAttribute("entity",   cardConfig.entity);
  if (cardConfig.alias)  card.setAttribute("alias",    cardConfig.alias);
  if (cardConfig.lang)   card.setAttribute("lang",     cardConfig.lang);
  if (cardConfig.themeUrl) card.setAttribute("theme-url", cardConfig.themeUrl);

  if (cardConfig.targetId) {
    const target = document.getElementById(cardConfig.targetId);
    if (target) {
      target.appendChild(card);
    } else {
      console.warn(`[HArvest] create(): target element #${cardConfig.targetId} not found`);
    }
  }

  return card;
}

/**
 * Return the HrvCard instance currently registered for a given entity ID or
 * alias in the active client, or null if none exists. Uses the page-level
 * haUrl and token to locate the correct client.
 *
 * @param {string} entityId
 * @returns {HrvCard|null}
 */
function getCard(entityId) {
  const pageConfig = getPageConfig();
  const haUrl      = pageConfig.haUrl  ?? "";
  const token      = pageConfig.token  ?? "";
  if (!haUrl || !token) return null;

  const client = getClient(haUrl, token);
  if (!client) return null;
  return client._getCard?.(entityId) ?? null;
}

/**
 * Register a listener that is called on every state update for any entity
 * on the page-level client.
 *
 * @param {(entityId: string, state: string, attrs: object) => void} callback
 */
function anyState(callback) {
  const pageConfig = getPageConfig();
  const haUrl      = pageConfig.haUrl ?? "";
  const token      = pageConfig.token ?? "";
  if (!haUrl || !token) return;
  const client = getClient(haUrl, token);
  if (!client) return;
  client.onAnyState(callback);
}

// ---------------------------------------------------------------------------
// Preview mode
// ---------------------------------------------------------------------------

/**
 * Render a real widget card in preview mode - no WebSocket, no token needed.
 * Returns the HrvCard element so the caller can update theme/state later.
 *
 * @param {HTMLElement} container - DOM element to mount the card into
 * @param {object} entityDef     - EntityDefinition (domain, friendly_name, capabilities, supported_features, feature_config)
 * @param {string} state         - Entity state value
 * @param {object} attributes    - Entity attributes
 * @param {object} [themeVars]   - CSS custom properties to apply
 * @param {object} [options]     - Additional options (graph, hours, historyData, packId)
 * @returns {HrvCard}
 */
function preview(container, entityDef, state, attributes, themeVars, options) {
  const card = document.createElement("hrv-card");
  card.setAttribute("preview", "");
  card.setAttribute("entity", entityDef.entity_id ?? "preview.entity");
  container.appendChild(card);

  // setPreview must run after connectedCallback (which is synchronous).
  card.setPreview(
    entityDef, state, attributes, themeVars,
    options?.packId ?? null,
    options?.graph ?? null,
    !!options?.animate,
  );

  if (options?.graph && options?.historyData) {
    card.receiveHistoryData(options.historyData, options.hours ?? 24);
  }
  return card;
}

// ---------------------------------------------------------------------------
// window.HArvest
// ---------------------------------------------------------------------------

window.HArvest = {
  config,
  create,
  getCard,
  preview,
  buildEntityDef,
  filterAttributes,
  registerRenderer,
  renderers: {
    BaseCard:             Renderers.BaseCard,
    LightCard:            Renderers.LightCard,
    SwitchCard:           Renderers.SwitchCard,
    FanCard:              Renderers.FanCard,
    ClimateCard:          Renderers.ClimateCard,
    CoverCard:            Renderers.CoverCard,
    MediaPlayerCard:      Renderers.MediaPlayerCard,
    RemoteCard:           Renderers.RemoteCard,
    TemperatureSensorCard:Renderers.TemperatureSensorCard,
    HumiditySensorCard:   Renderers.HumiditySensorCard,
    GenericSensorCard:    Renderers.GenericSensorCard,
    BinarySensorCard:     Renderers.BinarySensorCard,
    InputBooleanCard:     Renderers.InputBooleanCard,
    InputNumberCard:      Renderers.InputNumberCard,
    InputSelectCard:      Renderers.InputSelectCard,
    HarvestActionCard:    Renderers.HarvestActionCard,
    TimerCard:            Renderers.TimerCard,
    WeatherCard:          Renderers.WeatherCard,
    GenericCard:          Renderers.GenericCard,
  },
  track: {
    anyState,
  },
};
