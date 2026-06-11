import React, { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

/* "Install as app" UI. compact = dismissible one-liner for the Matches tab;
   full = explanatory card for Settings. Hidden once running standalone. */
export default function InstallCard({ compact = false }) {
  const { canPrompt, standalone, isIos, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(() => compact && !!cacheGet("installDismissed"));

  if (standalone || hidden) return null;
  // Compact banner only when there's a one-tap path or a short iOS recipe;
  // other browsers get the full instructions in Settings instead.
  if (compact && !canPrompt && !isIos) return null;

  const dismiss = () => {
    cacheSet("installDismissed", true);
    setHidden(true);
  };

  const action = canPrompt ? (
    <button className="btn accent" onClick={install}>📲 Install app</button>
  ) : isIos ? (
    <span style={{ fontSize: 12, color: "var(--muted)" }}>
      Tap <b>Share</b> <span aria-hidden="true">⎋</span> then <b>Add to Home Screen</b>
    </span>
  ) : (
    <span style={{ fontSize: 12, color: "var(--muted)" }}>
      In Chrome or Edge: browser menu → <b>Install app</b> / <b>Add to Home screen</b>
    </span>
  );

  if (compact) {
    return (
      <div className="card" style={{ padding: "10px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 13 }}>Get Golazo on your home screen — full screen, works offline.</span>
        {action}
        <button className="iconbtn" onClick={dismiss} aria-label="Dismiss" style={{ border: "none", padding: "4px 6px" }}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Install as app</div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        Golazo is a PWA: installed, it opens full screen from your home screen, keeps scores available
        offline, and uses no app-store account.
      </p>
      {action}
    </div>
  );
}
