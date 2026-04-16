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
import { setAuthToken } from "./api";

// Shape of the hass object HA passes to custom panel elements.
// Only the auth token field is needed here.
interface HassObject {
  auth: { data: { access_token: string } };
}

class HaPanelHarvest extends HTMLElement {
  private _root: ReturnType<typeof createRoot> | null = null;
  private _mounted = false;

  connectedCallback(): void {
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
    style.textContent = BASE_STYLES;
    shadow.insertBefore(style, container);

    this._root = createRoot(container);
    // Defer first render until HA sets the hass property with the auth token.
  }

  // HA calls this setter every time the hass state updates. The first call
  // provides the auth token we need before any API requests fire.
  set hass(h: HassObject) {
    setAuthToken(h.auth.data.access_token);
    if (!this._mounted && this._root) {
      this._mounted = true;
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
    font-family: var(--paper-font-body1_-_font-family,
                  var(--mdc-typography-body1-font-family,
                  "Roboto", sans-serif));
    font-size: 14px;
    color: var(--primary-text-color, #212121);
    background: var(--secondary-background-color, #f5f5f5);
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
    color: var(--primary-color, #6200ea);
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
