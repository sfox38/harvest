/**
 * harvest-docs.js - Shared interactivity for HArvest documentation.
 * Handles: dark/light mode toggle, mobile sidebar, active nav highlighting,
 * basic syntax highlighting for code blocks.
 */

(function () {
  "use strict";

  // ---- Theme ----------------------------------------------------------------
  // Persists via localStorage (HTTP) and URL hash (file:// fallback).

  function getTheme() {
    var hash = location.hash;
    if (hash === "#theme-dark") return "dark";
    if (hash === "#theme-light") return "light";
    try {
      var stored = localStorage.getItem("hrv-docs-theme");
      if (stored) return stored;
    } catch (e) {}
    return "auto";
  }

  function persistTheme(theme) {
    try { localStorage.setItem("hrv-docs-theme", theme); } catch (e) {}
    var hashVal = theme === "auto" ? "" : "#theme-" + theme;
    history.replaceState(null, "", location.pathname + location.search + hashVal);
    updateNavLinks(hashVal);
  }

  function updateNavLinks(hashVal) {
    document.querySelectorAll("a.nav-item, a.nav-card").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      href = href.replace(/#theme-(?:dark|light)$/, "");
      if (hashVal) href += hashVal;
      link.setAttribute("href", href);
    });
  }

  function applyTheme(theme) {
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var useDark = theme === "dark" || (theme === "auto" && prefersDark);
    document.documentElement.dataset.theme = useDark ? "dark" : "light";
    var btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = useDark ? "Light mode" : "Dark mode";
  }

  function toggleTheme() {
    var current = getTheme();
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var next;
    if (current === "auto") {
      next = prefersDark ? "light" : "dark";
    } else if (current === "dark") {
      next = "light";
    } else {
      next = "dark";
    }
    persistTheme(next);
    applyTheme(next);
  }

  applyTheme(getTheme());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    if (getTheme() === "auto") applyTheme("auto");
  });

  // ---- Mobile sidebar -------------------------------------------------------

  function setupMobileSidebar() {
    var toggle = document.getElementById("menuToggle");
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebarOverlay");
    if (!toggle || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add("open");
      if (overlay) overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
      sidebar.classList.remove("open");
      if (overlay) overlay.classList.remove("open");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", function () {
      sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
    });

    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }

    // Close sidebar when a nav link is clicked on mobile
    var navLinks = sidebar.querySelectorAll("a.nav-item");
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 700) closeSidebar();
      });
    });
  }

  // ---- Active nav link ------------------------------------------------------

  function setActiveNav() {
    var page = location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll("a.nav-item");
    links.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var linkPage = href.split("/").pop() || "index.html";
      if (linkPage === page) {
        link.classList.add("active");
      }
    });
  }

  // ---- Syntax highlighting --------------------------------------------------
  // Single-pass tokenizer for each language. All patterns are combined into
  // one regex so later groups never re-match inside markup inserted by earlier
  // groups, which was the root cause of "tok-keyword" appearing as visible text.

  function tok(cls, content) {
    return '<span class="' + cls + '">' + content + "</span>";
  }

  function enc(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var LANG_LABELS = {
    html: "HTML", javascript: "JavaScript", js: "JavaScript",
    json: "JSON", python: "Python", css: "CSS"
  };

  function highlightBlock(el) {
    var lang = el.className.replace(/language-/, "").trim();
    var text = el.textContent;

    if (!lang || lang === "text" || lang === "none") return;

    var label = LANG_LABELS[lang];
    if (label && el.parentElement) el.parentElement.dataset.lang = label;

    var html;
    var e = enc(text);

    if (lang === "html") {
      // Attribute names matched only when preceded by whitespace (lookbehind)
      // so they never hit class= values inside inserted span markup.
      html = e.replace(
        /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[\w-]+)|(?<=[ \t\n])([\w:-]+)(?==)|("[^"]*")/g,
        function (m, comment, tag, attr, str) {
          if (comment) return tok("tok-comment", comment);
          if (tag)     return tok("tok-tag", tag);
          if (attr)    return tok("tok-attr", attr);
          if (str)     return tok("tok-string", str);
          return m;
        }
      );
    } else if (lang === "javascript" || lang === "js") {
      // Order: comments first (absorb strings/keywords inside), then strings
      // (absorb keywords inside), then keywords, then numbers.
      html = e.replace(
        /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(class|extends|const|let|var|function|return|if|else|new|this|null|undefined|true|false|for|of|in|async|await|import|export|default)\b|\b(\d+(?:\.\d+)?)\b/g,
        function (m, comment, str, keyword, num) {
          if (comment) return tok("tok-comment", comment);
          if (str)     return tok("tok-string", str);
          if (keyword) return tok("tok-keyword", keyword);
          if (num)     return tok("tok-number", num);
          return m;
        }
      );
    } else if (lang === "json") {
      // Keys: quoted string immediately before a colon (lookahead).
      // Values: any other quoted string (matched after keys so keys win).
      html = e.replace(
        /"((?:[^"\\]|\\.)*)"(?=\s*:)|"((?:[^"\\]|\\.)*)"|:\s*(true|false|null)\b|\b(\d+(?:\.\d+)?)\b/g,
        function (m, key, str, keyword, num) {
          if (key !== undefined) return tok("tok-key", '"' + key + '"');
          if (str !== undefined) return tok("tok-string", '"' + str + '"');
          if (keyword)           return ": " + tok("tok-keyword", keyword);
          if (num !== undefined) return tok("tok-number", num);
          return m;
        }
      );
    } else if (lang === "python") {
      html = e.replace(
        /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(def|class|return|import|from|if|elif|else|for|in|not|and|or|True|False|None|async|await|self|str|int|bool|list|dict|set)\b|\b(\d+(?:\.\d+)?)\b/g,
        function (m, comment, str, keyword, num) {
          if (comment) return tok("tok-comment", comment);
          if (str)     return tok("tok-string", str);
          if (keyword) return tok("tok-keyword", keyword);
          if (num)     return tok("tok-number", num);
          return m;
        }
      );
    } else if (lang === "css") {
      html = e.replace(
        /(\/\*[\s\S]*?\*\/)|(--[\w-]+)|("[^"]*")|(#[0-9a-fA-F]{3,8})\b/g,
        function (m, comment, attr, str, num) {
          if (comment) return tok("tok-comment", comment);
          if (attr)    return tok("tok-attr", attr);
          if (str)     return tok("tok-string", str);
          if (num)     return tok("tok-number", num);
          return m;
        }
      );
    } else {
      return;
    }

    el.innerHTML = html;
  }

  function highlightAll() {
    document.querySelectorAll("pre code").forEach(highlightBlock);
  }

  // ---- Init -----------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    // Theme toggle button
    var themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
      applyTheme(getTheme()); // re-apply to update button text
    }

    setupMobileSidebar();
    setActiveNav();
    highlightAll();

    // Stamp nav links with current theme hash so navigation preserves it
    var currentTheme = getTheme();
    if (currentTheme !== "auto") {
      updateNavLinks("#theme-" + currentTheme);
    }
  });

})();
