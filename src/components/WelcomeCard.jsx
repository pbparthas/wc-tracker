import React, { useState } from "react";
import { Link } from "react-router-dom";
import { cacheGet, cacheSet } from "../lib/storage.js";

/* One-time orientation for people who received a shared link. */
export default function WelcomeCard() {
  const [hidden, setHidden] = useState(() => !!cacheGet("welcomed"));
  if (hidden) return null;
  const dismiss = () => {
    cacheSet("welcomed", true);
    setHidden(true);
  };
  return (
    <div className="card" style={{ padding: 16, marginBottom: 10, borderLeft: "3px solid var(--saffron)" }}>
      <div className="disp" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
        WELCOME TO GOLAZO ⚽
      </div>
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        Every World Cup 2026 match in IST — live scores, groups, bracket, squads and stats.
        Free, no ads, no account, and it works offline once loaded.
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        Optional: AI previews, recaps and digests run on your own free Gemini key —{" "}
        <Link to="/settings">add it in Settings</Link> whenever you like. Star teams from the
        Teams tab to pin their matches.
      </p>
      <button className="btn accent" onClick={dismiss}>Got it</button>
    </div>
  );
}
