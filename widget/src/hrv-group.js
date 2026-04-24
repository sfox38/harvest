/**
 * hrv-group.js - <hrv-group> custom element context provider.
 *
 * HrvGroup is a zero-UI context provider. It stores token, ha-url, theme-url,
 * and lang values that child <hrv-card> elements inherit during their own
 * connectedCallback. The group renders no shadow DOM and applies no styles.
 *
 * Design: children pull config from the group; the group never pushes to
 * children. This keeps the implementation simple and avoids the need for
 * the group to track or notify children. If group attributes change after
 * children have mounted, children are not automatically re-configured.
 * This is an accepted limitation for v1.
 *
 * Usage:
 *   <hrv-group token="hwt_..." ha-url="https://ha.example.com">
 *     <hrv-card entity="light.bedroom_main"></hrv-card>
 *     <hrv-card entity="switch.hallway"></hrv-card>
 *   </hrv-group>
 */

export class HrvGroup extends HTMLElement {

  static get observedAttributes() {
    return ["token", "ha-url", "theme-url", "lang"];
  }

  // -------------------------------------------------------------------------
  // Property accessors
  // Read by HrvCard.#inheritFromGroup() during connectedCallback.
  // -------------------------------------------------------------------------

  /** @returns {string} */
  get tokenId() { return this.getAttribute("token") ?? ""; }

  /** @returns {string} */
  get haUrl()   { return this.getAttribute("ha-url") ?? ""; }

  /** @returns {string|null} */
  get themeUrl() { return this.getAttribute("theme-url") ?? null; }

  /** @returns {string} */
  get lang()    { return this.getAttribute("lang") ?? "auto"; }
}

if (!customElements.get("hrv-group")) {
  customElements.define("hrv-group", HrvGroup);
}
