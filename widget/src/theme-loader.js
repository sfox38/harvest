/**
 * theme-loader.js - Theme JSON fetch, in-memory cache, and CSS variable injection.
 *
 * Theme objects are fetched once per URL and cached for the lifetime of the
 * page session. Multiple cards sharing the same theme-url share one fetch.
 *
 * Theme JSON format (theming.md):
 * {
 *   "name": "...",
 *   "author": "...",          // optional
 *   "version": "...",         // optional
 *   "harvest_version": 1,
 *   "variables": {
 *     "--hrv-color-primary": "#6366f1",
 *     ...
 *   },
 *   "dark_variables": {       // optional, merged over variables when dark mode is active
 *     "--hrv-color-primary": "#818cf8",
 *     ...
 *   }
 * }
 *
 * apply() sets CSS custom properties on the shadow host element so they
 * cascade into the shadow DOM via the :host selector. Dark-mode overrides
 * are merged at apply time using window.matchMedia("prefers-color-scheme").
 * A MediaQueryList listener is attached to re-apply when the system theme
 * changes while the card is visible.
 */

/**
 * In-memory cache: theme URL -> ThemeObject (or null on fetch failure).
 * Null entries are cached so a bad URL is not retried on every card mount.
 * @type {Map<string, object|null>}
 */
const _cache = new Map();

/**
 * In-flight fetches: URL -> Promise<object|null>.
 * Prevents duplicate concurrent requests for the same URL.
 * @type {Map<string, Promise<object|null>>}
 */
const _inflight = new Map();

/**
 * Shared dark-mode listener. All themed cards register a callback here
 * instead of each attaching its own matchMedia listener.
 * @type {Set<() => void>}
 */
const _darkCallbacks = new Set();
let _darkMq = null;

// ---------------------------------------------------------------------------
// ThemeLoader
// ---------------------------------------------------------------------------

export class ThemeLoader {

  /**
   * Resolve a theme for the given card config. Returns:
   *   - The inline theme object if config.theme is set (no fetch needed).
   *   - A fetched ThemeObject if config.themeUrl is set.
   *   - null if neither is set or the fetch fails.
   *
   * @param {{ theme?: object, themeUrl?: string }} config
   * @returns {Promise<object|null>}
   */
  static async resolve(config) {
    if (config.theme) return config.theme;
    if (config.themeUrl) return this.fetch(config.themeUrl);
    return null;
  }

  /**
   * Fetch a theme JSON from the given URL. Results are cached in memory.
   * Concurrent requests for the same URL share one in-flight Promise.
   * Null is cached on failure so the URL is not retried every card mount.
   *
   * @param {string} url
   * @returns {Promise<object|null>}
   */
  static async fetch(url) {
    // Cache hit.
    if (_cache.has(url)) return _cache.get(url);

    // In-flight dedup.
    if (_inflight.has(url)) return _inflight.get(url);

    const promise = (async () => {
      try {
        const res = await globalThis.fetch(url);
        if (!res.ok) {
          console.warn(`[HArvest] Theme fetch failed (${res.status}):`, url);
          _cache.set(url, null);
          return null;
        }
        const json = await res.json();
        _cache.set(url, json);
        return json;
      } catch (err) {
        console.warn("[HArvest] Failed to load theme from", url, err);
        _cache.set(url, null);
        return null;
      } finally {
        _inflight.delete(url);
      }
    })();

    _inflight.set(url, promise);
    return promise;
  }

  /**
   * Apply a theme object to a shadow root by setting CSS custom properties on
   * the :host element. Merges dark_variables when prefers-color-scheme:dark
   * is active.
   *
   * Also attaches a MediaQueryList change listener (stored on the host element
   * as _harvThemeCleanup) so that toggling system dark mode re-applies the
   * correct variable set without a page reload. Call detach() to remove it.
   *
   * @param {object}      theme       - ThemeObject
   * @param {ShadowRoot}  shadowRoot
   * @param {"light"|"dark"|"auto"} [colorScheme="auto"] - Force light or dark regardless of OS
   */
  static apply(theme, shadowRoot, colorScheme = "auto") {
    const host = /** @type {HTMLElement} */ (shadowRoot.host);

    // Remove any previous listener before attaching a new one.
    ThemeLoader.detach(shadowRoot);

    if (!_darkMq) {
      _darkMq = window.matchMedia("(prefers-color-scheme: dark)");
      _darkMq.addEventListener("change", () => {
        for (const cb of _darkCallbacks) cb();
      });
    }

    const applyVars = () => {
      const isDark = colorScheme === "dark" || (colorScheme !== "light" && _darkMq.matches);
      const vars = (isDark && theme.dark_variables)
        ? { ...theme.variables, ...theme.dark_variables }
        : theme.variables;

      for (const [key, value] of Object.entries(vars ?? {})) {
        host.style.setProperty(key, value);
      }
    };

    applyVars();

    // Only register OS-change listener when not forced to a specific scheme.
    if (colorScheme === "auto") {
      _darkCallbacks.add(applyVars);
      host[_CLEANUP_KEY] = () => _darkCallbacks.delete(applyVars);
    }
  }

  /**
   * Remove the dark-mode change listener attached by apply(), if any.
   * Call this from disconnectedCallback to avoid listener leaks.
   *
   * @param {ShadowRoot} shadowRoot
   */
  static detach(shadowRoot) {
    const host = /** @type {any} */ (shadowRoot.host);
    if (typeof host[_CLEANUP_KEY] === "function") {
      host[_CLEANUP_KEY]();
      delete host[_CLEANUP_KEY];
    }
  }

  /**
   * Clear the in-memory URL cache. Intended for testing only.
   */
  static _clearCache() {
    _cache.clear();
    _inflight.clear();
  }
}

// Private symbol used to store the MediaQueryList cleanup function on the
// host element without polluting its public interface.
const _CLEANUP_KEY = Symbol("harvThemeCleanup");
