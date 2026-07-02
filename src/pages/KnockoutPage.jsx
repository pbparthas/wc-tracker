import React from "react";
import BracketView from "../components/BracketView.jsx";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { PHASES } from "../data/phases.js";

export default function KnockoutPage() {
  const { matches, loading, refresh } = useSchedule();
  const { standings } = useStandings();
  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
        ROAD TO THE <span style={{ color: "var(--gold)" }}>FINAL</span>
      </h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 14 }}>
        Tracking every round until the trophy is lifted at MetLife — 12:30 AM IST, 20 July. Swipe the bracket sideways.
      </p>

      <BracketView matches={matches} standings={standings} />

      <div style={{ margin: "6px 0 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">Tournament phases · IST dates</span>
        <button className="btn" onClick={() => refresh(true)} disabled={loading}>
          {loading ? "Fetching…" : "↻ Refresh"}
        </button>
      </div>
      {PHASES.map((ph) => (
        <div
          key={ph.label}
          className="card"
          style={{
            padding: "12px 14px",
            marginBottom: 8,
            borderColor: ph.final ? "var(--gold)" : "var(--line)",
            background: ph.final ? "linear-gradient(135deg, var(--grad-hi), var(--grad-lo))" : "var(--card)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="disp" style={{ fontSize: 16, fontWeight: 800, color: ph.final ? "var(--gold)" : "var(--chalk)" }}>
              {ph.final ? "🏆 " : ""}{ph.label}
            </span>
            <span style={{ color: "var(--saffron)", fontWeight: 600, fontSize: 13 }}>{ph.dates}</span>
          </div>
          {ph.detail && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{ph.detail}</div>}
        </div>
      ))}
      <div style={{ height: 12 }} />
    </div>
  );
}
