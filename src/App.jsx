import React, { Suspense, useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import BottomTabs from "./components/BottomTabs.jsx";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";

export default function App() {
  const online = useOnlineStatus();
  const [updateFn, setUpdateFn] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const onUpdate = (e) => setUpdateFn(() => e.detail);
    window.addEventListener("wc26:sw-update", onUpdate);
    return () => window.removeEventListener("wc26:sw-update", onUpdate);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app" data-comp={pathname.startsWith("/epl") ? "epl" : "wc"}>
      <header className="hdr">
        <div className="hdr-inner">
          <Link to="/" className="hdr-title disp">
            GOLA<span>ZO</span> <span style={{ fontSize: 14 }}>⚽</span>
          </Link>
          <Link to="/settings" className="gear" aria-label="Settings">⚙️</Link>
        </div>
        {!online && <div className="banner">Offline — showing the last saved data</div>}
      </header>
      <Suspense
        fallback={
          <div className="wrap" style={{ paddingTop: 24 }}>
            <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading…</p>
          </div>
        }
      >
        <Outlet />
      </Suspense>
      {pathname !== "/" && <BottomTabs />}
      {updateFn && (
        <div className="toast" role="status">
          <span>New version available</span>
          <button className="btn accent" onClick={() => updateFn(true)}>Reload</button>
        </div>
      )}
    </div>
  );
}
