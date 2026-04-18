/**
 * main.tsx - HArvest panel entry point.
 *
 * Defines the <ha-panel-harvest> custom element that HA instantiates when the
 * user navigates to the HArvest sidebar item. The custom element mounts the
 * React application into its shadow DOM so panel styles are fully isolated
 * from HA's own styling while still inheriting HA CSS custom properties from
 * the host document.
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";
import { setAuthToken, setTokenGetter } from "./api";
import { loadEntityCache } from "./entityCache";
import buildVersion from "./buildVersion.json";
import panelCss from "./panel.css?inline";

// Check panel_version.txt once at startup. If the deployed build number
// differs from the one baked into this bundle, reload once to pick up the
// new panel.js. No further polling - prevents reload loops in production.
function startBuildWatcher(): void {
  setTimeout(async () => {
    try {
      const res = await fetch("/harvest_assets/panel_version.txt", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const latest = parseInt(await res.text(), 10);
      if (!isNaN(latest) && latest !== buildVersion.build) {
        // Navigate with a cache-busting query param so the browser fetches
        // a fresh copy of the page and panel.js rather than a cached version.
        const url = new URL(window.location.href);
        url.searchParams.set("_hrv", String(latest));
        window.location.href = url.toString();
      }
    } catch { /* ignore network errors */ }
  }, 2000);
}

// Shape of the hass object HA passes to custom panel elements.
// Only the auth token field is needed here.
interface HassObject {
  auth: { data: { access_token: string } };
}

// Module-level hass reference so api.ts always reads the freshest token.
let _latestHass: HassObject | null = null;

class HaPanelHarvest extends HTMLElement {
  private _root: ReturnType<typeof createRoot> | null = null;
  private _mounted = false;

  connectedCallback(): void {
    // Clear any stale 401-reload flag from a previous session in this tab.
    sessionStorage.removeItem("hrv_401_reload");

    // Attach shadow DOM for style isolation.
    const shadow = this.attachShadow({ mode: "open" });

    // Mount point inside shadow DOM.
    const container = document.createElement("div");
    container.id = "harvest-panel-root";
    shadow.appendChild(container);

    // Inject CSS reset and panel-level base styles.
    // HA CSS custom properties are accessible inside shadow DOM via inheritance
    // from the host document's :root styles.
    const style = document.createElement("style");
    style.textContent = BASE_STYLES + panelCss;
    shadow.insertBefore(style, container);

    this._root = createRoot(container);
    // Defer first render until HA sets the hass property with the auth token.
  }

  // HA calls this setter every time the hass state updates. The first call
  // provides the auth token we need before any API requests fire.
  set hass(h: HassObject) {
    _latestHass = h;
    // Keep the fallback token in sync for any call that happens
    // in the brief window before setTokenGetter is registered.
    setAuthToken(h.auth.data.access_token);
    if (!this._mounted && this._root) {
      this._mounted = true;
      // Register a live getter so every API call reads the freshest token
      // directly from the hass object rather than a cached copy.
      setTokenGetter(() => _latestHass?.auth.data.access_token ?? "");
      loadEntityCache();
      startBuildWatcher();
      this._root.render(<App />);
    }
  }

  disconnectedCallback(): void {
    this._root?.unmount();
    this._root = null;
    this._mounted = false;
  }
}

// Register only once.
if (!customElements.get("ha-panel-harvest")) {
  customElements.define("ha-panel-harvest", HaPanelHarvest);
}

// ---------------------------------------------------------------------------
// Base styles injected into shadow DOM
// ---------------------------------------------------------------------------

const BASE_STYLES = /* css */`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  #harvest-panel-root {
    height: 100%;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--ink);
    background: var(--bg);
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  a {
    color: var(--accent);
    text-decoration: none;
  }

  a:hover { text-decoration: underline; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
