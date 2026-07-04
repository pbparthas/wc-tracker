import React, { Suspense, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import BottomTabs from "./components/BottomTabs.jsx";
import Logo from "./components/Logo.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";
import { purgeVolatile } from "./lib/freshStart.js";

/* Coming back counts as "opening the app" once you've been away a while: the
   OS usually restores an installed PWA from memory (same session, so the
   main.jsx fresh-start doesn't fire), parked on whatever page you left. Short
   hops away — checking a message during a match — keep your place. */
const AWAY_RESET_MS = 15 * 60 * 1000;

export default function App() {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    let hiddenAt = null;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_RESET_MS) {
        purgeVolatile();
        navigate("/", { replace: true });
      }
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [navigate]);

  return (
    <div className="app" data-comp={pathname.match(/^\/league\/([^/]+)/)?.[1] || "wc"}>
      <header className="hdr">
        <div className="hdr-inner">
          <Link to="/" className="hdr-title disp">
            GOLA<span>ZO</span> <Logo size={18} />
          </Link>
          <Link to="/settings" className="gear" aria-label="Settings">⚙️</Link>
        </div>
        {!online && <div className="banner">Offline — showing the last saved data</div>}
      </header>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="wrap" style={{ paddingTop: 24 }}>
              <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</p>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </ErrorBoundary>
      {/* No tabs on home (it has its own nav) or settings — settings is a
          common utility page, not part of the World Cup or any league. */}
      {pathname !== "/" && pathname !== "/settings" && <BottomTabs />}
    </div>
  );
}
