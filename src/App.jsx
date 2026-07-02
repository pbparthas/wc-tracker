import React, { Suspense, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import BottomTabs from "./components/BottomTabs.jsx";
import Logo from "./components/Logo.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";

export default function App() {
  const online = useOnlineStatus();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
