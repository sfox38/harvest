/**
 * i18n.js - Internationalisation string lookup with language fallback.
 *
 * Usage:
 *   const i18n = new I18n("auto");  // resolves from navigator.language
 *   const i18n = new I18n("de");    // explicit language code
 *   i18n.t("state.on");             // "An"
 *
 * Fallback chain: requested language -> English -> raw key string.
 *
 * Language codes follow BCP 47 primary subtags (two-letter ISO 639-1).
 * When lang="auto", navigator.language is resolved with script-tag
 * awareness (e.g. "en-US" -> "en", "zh-TW" -> "zh-Hant", "zh-CN" -> "zh-Hans").
 *
 * String keys are dot-separated namespaces:
 *   state.*        - entity state labels
 *   action.*       - user-facing action labels
 *   error.*        - error overlay messages
 *   indicator.*    - status indicator labels
 *   history.*      - history graph labels
 *   unit.*         - measurement unit labels
 *   climate.*      - climate mode labels
 *   cover.*        - cover position labels
 *   media.*        - media player labels
 *   timer.*        - timer button labels
 *   fan.*          - fan control labels
 *   ui.*           - general UI labels
 */

import en from "../i18n/en.json";
import de from "../i18n/de.json";
import fr from "../i18n/fr.json";
import es from "../i18n/es.json";
import pt from "../i18n/pt.json";
import nl from "../i18n/nl.json";
import th from "../i18n/th.json";
import ja from "../i18n/ja.json";
import zhHans from "../i18n/zh-Hans.json";
import zhHant from "../i18n/zh-Hant.json";

/** @type {Record<string, Record<string, string>>} */
const STRINGS = { en, de, fr, es, pt, nl, th, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };

const _HANT_REGIONS = new Set(["tw", "hk", "mo"]);

function _resolveCode(lang) {
  if (lang === "auto") lang = navigator.language ?? "en";
  lang = lang.toLowerCase();
  if (lang === "zh-hans") return "zh-Hans";
  if (lang === "zh-hant") return "zh-Hant";
  if (lang.startsWith("zh")) {
    const region = lang.split("-")[1] ?? "";
    return _HANT_REGIONS.has(region) ? "zh-Hant" : "zh-Hans";
  }
  return lang.split("-")[0];
}

// ---------------------------------------------------------------------------
// I18n class
// ---------------------------------------------------------------------------

/**
 * Per-card i18n instance. Created once in HrvCard.connectedCallback() and
 * passed to the renderer. Resolves string lookups at call time so language
 * switching (if ever needed) only requires creating a new I18n instance.
 */
export class I18n {
  /** @type {Record<string, string>} */
  #strings;

  /**
   * @param {string} lang - BCP 47 primary subtag ("en", "de", ...) or "auto".
   *   "auto" resolves from navigator.language at construction time.
   */
  constructor(lang) {
    const code = _resolveCode(lang);
    this.#strings = STRINGS[code] ?? STRINGS["en"];
  }

  /**
   * Look up a translation string. Falls back through:
   *   1. Requested language strings
   *   2. English strings
   *   3. The raw key itself (visible only during development)
   *
   * @param {string} key - Dot-separated key, e.g. "state.on"
   * @returns {string}
   */
  t(key) {
    return this.#strings[key] ?? STRINGS["en"][key] ?? key;
  }
}
