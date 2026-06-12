import React from "react";
import { useNavigate } from "react-router-dom";

const LEAGUES = [
  ["🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Premier League"],
  ["🇪🇸", "La Liga"],
  ["🇮🇹", "Serie A"],
  ["🇩🇪", "Bundesliga"],
  ["🇫🇷", "Ligue 1"],
  ["⭐", "Champions League"],
];

/* Competition picker — the app's front door. The World Cup is the live
   product; club leagues are the post-tournament roadmap. */
export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="wrap" style={{ paddingTop: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Competitions</div>

      <div
        className="card"
        role="link"
        tabIndex={0}
        onClick={() => navigate("/matches")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/matches")}
        style={{ padding: 18, marginBottom: 14, cursor: "pointer", background: "linear-gradient(180deg,#10241B 0%,#13211A 100%)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="eyebrow" style={{ color: "var(--saffron)" }}>USA · Mexico · Canada</span>
          <span className="eyebrow" style={{ color: "var(--live)" }}>
            <span className="pulse">●</span> Live now
          </span>
        </div>
        <div className="disp" style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 2px" }}>
          🏆 FIFA WORLD CUP 2026
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          48 teams · 104 matches · 11 June – 19 July · all times IST
        </div>
        <div style={{ marginTop: 12 }}>
          <span className="btn accent" style={{ display: "inline-block" }}>Open →</span>
        </div>
      </div>

      <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Club football</div>
      {LEAGUES.map(([flag, name]) => (
        <div
          key={name}
          className="card"
          style={{ padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {flag} {name}
          </span>
          <span className="eyebrow">Coming soon</span>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
