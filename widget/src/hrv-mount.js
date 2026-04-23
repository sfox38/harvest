/**
 * hrv-mount.js - Data-attribute mount mode entry point.
 *
 * Handles the alternative "data-attribute mount mode" for CMS environments
 * (WordPress, etc.) where custom elements may not be suitable. Instead of
 * writing <hrv-card> directly, authors write:
 *
 *   <div class="hrv-mount" data-entity="light.bedroom_main"
 *        data-token="hwt_..." data-ha-url="https://ha.example.com"></div>
 *
 * This module scans for .hrv-mount and .hrv-group divs on DOMContentLoaded
 * and starts a MutationObserver to catch elements added dynamically
 * (e.g. by page builders or AJAX).
 *
 * Mount is idempotent: data-harv-mounted="true" is set on each processed
 * element so re-scanning never double-mounts.
 *
 * Attribute mapping (data-* -> hrv-card attribute):
 *   data-entity       -> entity       (priority over data-alias)
 *   data-alias        -> alias
 *   data-token        -> token
 *   data-ha-url       -> ha-url
 *   data-companion    -> companion
 *   data-theme-url    -> theme-url
 *   data-lang         -> lang
 *   data-on-offline   -> on-offline
 *   data-on-error     -> on-error
 *   data-offline-text -> offline-text
 *   data-error-text   -> error-text
 *   data-graph        -> graph
 *   data-hours        -> hours
 *   data-period       -> period
 *   data-animate      -> animate
 *
 * Per CLAUDE.md Open Question #3: mountCard() walks parentElement until
 * document.body to find a parent .hrv-group and inherit token/ha-url when
 * not set on the mount element itself.
 */

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function initMounts() {
  // Process elements already in the DOM at load time.
  document.querySelectorAll(".hrv-mount, .hrv-group")
    .forEach(mountElement);

  // Watch for elements added or removed dynamically.
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches(".hrv-mount, .hrv-group")) {
          mountElement(node);
        }
        // Also process matching descendants added inside a container node.
        node.querySelectorAll(".hrv-mount, .hrv-group")
          .forEach(mountElement);
      }
      for (const node of mutation.removedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches(".hrv-mount")) {
          unmountElement(node);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// ---------------------------------------------------------------------------
// Mount / unmount
// ---------------------------------------------------------------------------

/**
 * Process a single .hrv-mount or .hrv-group element. Idempotent.
 * @param {HTMLElement} el
 */
function mountElement(el) {
  if (el.dataset.harvMounted === "true") return;
  el.dataset.harvMounted = "true";

  if (el.classList.contains("hrv-group")) {
    mountGroup(el);
  } else {
    mountCard(el);
  }
}

/**
 * Convert a .hrv-group div into an <hrv-group> element by transferring
 * data attributes to a newly created <hrv-group> that wraps the div's
 * children.
 *
 * Implementation note: we do not replace the div in-place because that
 * would remove existing children from the DOM tree. Instead we create the
 * <hrv-group> element, move children into it, and append it to the div.
 * Child .hrv-mount divs have their own idempotency guard and will be
 * processed by the MutationObserver when re-added.
 *
 * @param {HTMLElement} el
 */
function mountGroup(el) {
  const group = document.createElement("hrv-group");

  if (el.dataset.token)    group.setAttribute("token",     el.dataset.token);
  if (el.dataset.haUrl)    group.setAttribute("ha-url",    el.dataset.haUrl);
  if (el.dataset.themeUrl) group.setAttribute("theme-url", el.dataset.themeUrl);
  if (el.dataset.lang)     group.setAttribute("lang",      el.dataset.lang);

  // Move existing children into the group element.
  while (el.firstChild) group.appendChild(el.firstChild);
  el.appendChild(group);
}

/**
 * Create an <hrv-card> from a .hrv-mount div and append it to that div.
 * entity= takes priority over alias= when both data attributes are set.
 *
 * Token and ha-url are inherited from a parent .hrv-group div if not set
 * directly on the mount element (per CLAUDE.md Open Question #3).
 *
 * @param {HTMLElement} el
 */
function mountCard(el) {
  // Warn and apply entity= priority when both are present.
  if (el.dataset.entity && el.dataset.alias) {
    console.warn(
      "[HArvest] Both data-entity and data-alias are set on .hrv-mount. " +
      "data-entity takes priority. Remove data-alias to suppress this warning.",
    );
  }

  const card = document.createElement("hrv-card");

  // Inherit token and ha-url from the nearest ancestor .hrv-group if absent.
  const inherited = _inheritFromParentGroup(el);

  const token = el.dataset.token || inherited.token;
  const haUrl = el.dataset.haUrl || inherited.haUrl;

  if (token)               card.setAttribute("token",        token);
  if (haUrl)               card.setAttribute("ha-url",       haUrl);

  // entity takes priority over alias.
  if (el.dataset.entity)           card.setAttribute("entity",       el.dataset.entity);
  else if (el.dataset.alias)       card.setAttribute("alias",        el.dataset.alias);

  if (el.dataset.companion)        card.setAttribute("companion",    el.dataset.companion);
  if (el.dataset.themeUrl)         card.setAttribute("theme-url",    el.dataset.themeUrl);
  if (el.dataset.lang)             card.setAttribute("lang",         el.dataset.lang);
  if (el.dataset.onOffline)        card.setAttribute("on-offline",   el.dataset.onOffline);
  if (el.dataset.onError)          card.setAttribute("on-error",     el.dataset.onError);
  if (el.dataset.offlineText)      card.setAttribute("offline-text", el.dataset.offlineText);
  if (el.dataset.errorText)        card.setAttribute("error-text",   el.dataset.errorText);
  if (el.dataset.graph)            card.setAttribute("graph",        el.dataset.graph);
  if (el.dataset.hours)            card.setAttribute("hours",        el.dataset.hours);
  if (el.dataset.period)           card.setAttribute("period",       el.dataset.period);
  if (el.dataset.animate)          card.setAttribute("animate",      "");

  el.appendChild(card);
}

/**
 * Remove the injected <hrv-card> from an unmounted .hrv-mount element and
 * clear the idempotency flag so it can be re-mounted if re-added.
 *
 * @param {HTMLElement} el
 */
function unmountElement(el) {
  const card = el.querySelector("hrv-card");
  if (card) card.remove();
  delete el.dataset.harvMounted;
}

// ---------------------------------------------------------------------------
// Parent group walk (Open Question #3)
// ---------------------------------------------------------------------------

/**
 * Walk parentElement toward document.body looking for the nearest ancestor
 * that has class "hrv-group" and return its token/ha-url data attributes.
 * Returns empty strings if no ancestor group is found.
 *
 * @param {HTMLElement} el
 * @returns {{ token: string, haUrl: string }}
 */
function _inheritFromParentGroup(el) {
  let ancestor = el.parentElement;
  while (ancestor && ancestor !== document.body) {
    if (ancestor.classList.contains("hrv-group")) {
      return {
        token: ancestor.dataset.token ?? "",
        haUrl: ancestor.dataset.haUrl ?? "",
      };
    }
    ancestor = ancestor.parentElement;
  }
  return { token: "", haUrl: "" };
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// Guard against the script being loaded in <head> before <body> exists.
if (document.body) {
  initMounts();
} else {
  document.addEventListener("DOMContentLoaded", initMounts);
}
