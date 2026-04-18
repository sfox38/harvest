/**
 * App.tsx - Root component and navigation for the HArvest panel.
 *
 * Two-row appbar: brand + "New widget" action on top, nav tabs below.
 * Five tabs: Dashboard, Widgets, Sessions, Activity, Settings & help.
 * Dark/light/auto theme toggled in Settings and persisted to localStorage.
 */

import { useState, useCallback, useEffect } from "react";
import type { Screen } from "./types";
import { Dashboard }   from "./components/Dashboard";
import { TokenList }   from "./components/TokenList";
import { ActivityLog } from "./components/ActivityLog";
import { Sessions }    from "./components/Sessions";
import { Settings }    from "./components/Settings";
import { Wizard }      from "./components/Wizard";
import { Icon }        from "./components/Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppTheme = "auto" | "light" | "dark";

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

const NAV_MAIN: { id: Screen; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "home"     },
  { id: "widgets",   label: "Widgets",   icon: "grid"     },
  { id: "sessions",  label: "Sessions",  icon: "plug"     },
  { id: "activity",  label: "Activity",  icon: "activity" },
];

const NAV_FOOT: { id: Screen; label: string; icon: string }[] = [
  { id: "settings", label: "Settings & help", icon: "settings" },
];

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

function readStoredTheme(): AppTheme {
  const v = localStorage.getItem("hrv_theme");
  if (v === "light" || v === "dark" || v === "auto") return v;
  return "auto";
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export function App() {
  const [screen, setScreen]         = useState<Screen>("dashboard");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [initialTokenId, setInitialTokenId] = useState<string | null>(null);
  // Increment to reset (remount) the TokenList when Widgets nav is clicked
  // while already viewing a token detail.
  const [tokenListKey, setTokenListKey] = useState(0);
  // Activity screen filter preset (set when navigating from dashboard).
  const [activityTypeFilter, setActivityTypeFilter] = useState<string | undefined>(undefined);
  // App-level theme: "auto" defers to prefers-color-scheme CSS media query.
  const [theme, setTheme] = useState<AppTheme>(readStoredTheme);

  // Persist theme choice and apply data-theme attribute.
  useEffect(() => {
    localStorage.setItem("hrv_theme", theme);
  }, [theme]);

  const openWizard = useCallback(() => setWizardOpen(true), []);

  const closeWizard = useCallback((newTokenId?: string) => {
    setWizardOpen(false);
    if (newTokenId) {
      setInitialTokenId(newTokenId);
      setTokenListKey(k => k + 1);
      setScreen("widgets");
    }
  }, []);

  // Navigate to a widget's detail page from any screen (e.g. activity log link).
  const goToToken = useCallback((tokenId: string) => {
    setInitialTokenId(tokenId);
    setTokenListKey(k => k + 1);
    setScreen("widgets");
  }, []);

  // Navigate to activity with an optional pre-set type filter.
  const goToActivity = useCallback((typeFilter?: string) => {
    setActivityTypeFilter(typeFilter);
    setScreen("activity");
  }, []);

  // data-theme is only set when the user has made an explicit choice.
  // When "auto", no attribute - CSS @media (prefers-color-scheme) handles it.
  const dataTheme = theme === "auto" ? undefined : theme;

  return (
    <div className="app" data-theme={dataTheme}>

      <header className="appbar">
        {/* Top row: brand + actions */}
        <div className="appbar-row top">
          <div className="brand">
            <div className="brand-mark">
              <Icon name="leaf" size={16} />
            </div>
            <span className="brand-name">HArvest</span>
          </div>
          <div className="appbar-actions">
            <button className="btn btn-primary btn-sm" onClick={openWizard}>
              <Icon name="plus" size={14} />
              <span>New widget</span>
            </button>
          </div>
        </div>

        {/* Bottom row: nav tabs */}
        <nav className="nav" aria-label="HArvest navigation">
          {NAV_MAIN.map(({ id, label, icon }) => (
            <button
              key={id}
              className="nav-item"
              aria-current={screen === id ? "page" : undefined}
              onClick={() => {
                if (id === "widgets") setTokenListKey(k => k + 1);
                if (id === "activity") setActivityTypeFilter(undefined);
                setScreen(id);
              }}
            >
              <span className="nav-icon"><Icon name={icon} size={16} /></span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
          <div className="nav-spacer" />
          {NAV_FOOT.map(({ id, label, icon }) => (
            <button
              key={id}
              className="nav-item"
              aria-current={screen === id ? "page" : undefined}
              onClick={() => setScreen(id)}
            >
              <span className="nav-icon"><Icon name={icon} size={16} /></span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Screen content */}
      <main className="main">
        <div className="content">
          {screen === "dashboard" && (
            <Dashboard
              onOpenWizard={openWizard}
              onNavigate={setScreen}
              onNavigateActivity={goToActivity}
            />
          )}
          {screen === "widgets" && (
            <TokenList
              key={tokenListKey}
              onOpenWizard={openWizard}
              initialTokenId={initialTokenId}
              onInitialTokenConsumed={() => setInitialTokenId(null)}
            />
          )}
          {screen === "sessions" && (
            <Sessions onSelectToken={goToToken} />
          )}
          {screen === "activity" && (
            <ActivityLog
              onSelectToken={goToToken}
              initialTypeFilter={activityTypeFilter}
            />
          )}
          {screen === "settings" && (
            <Settings theme={theme} onThemeChange={setTheme} />
          )}
        </div>
      </main>

      {/* Wizard side-sheet overlay */}
      {wizardOpen && (
        <Wizard onClose={closeWizard} />
      )}
    </div>
  );
}
