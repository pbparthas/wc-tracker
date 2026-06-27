import React from "react";
import { useNavigate } from "react-router-dom";
import Flag from "./Flag.jsx";
import { assembleBracket } from "../lib/bracket.js";
import { istParts } from "../lib/time.js";

function Tie({ m }) {
  const navigate = useNavigate();
  if (!m)
    return (
      <div className="card tie" style={{ opacity: 0.5 }}>
        <div className="tie-row"><span className="nm" style={{ color: "var(--muted)" }}>TBD</span></div>
        <div className="tie-row"><span className="nm" style={{ color: "var(--muted)" }}>TBD</span></div>
      </div>
    );
  const p = istParts(m.kickoff);
  const done = m.state === "post";
  const winner = done ? (m.hg > m.ag ? "home" : m.ag > m.hg ? "away" : null) : null;
  // Skeleton slots with no live fixture yet: show the feeder labels ("Winner
  // Group A", "Winner Match 73") muted and don't link anywhere.
  const place = m.placeholder;
  const clickable = !place && !!m.id;
  const go = () => clickable && navigate(`/match/${m.id}`);
  return (
    <div
      className="card tie"
      style={{ cursor: clickable ? "pointer" : "default", opacity: place ? 0.92 : 1 }}
      onClick={go}
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === "Enter" && go() : undefined}
    >
      {["home", "away"].map((side) => (
        <div className="tie-row" key={side}>
          <Flag team={m[side]} size={16} />
          <span
            className="nm"
            style={{
              fontWeight: winner === side ? 800 : 600,
              color: place || (done && winner && winner !== side) ? "var(--muted)" : "var(--chalk)",
            }}
          >
            {m[side].name}
          </span>
          <span className="sc" style={{ color: winner === side ? "var(--saffron)" : "var(--chalk)" }}>
            {place || m.state === "pre" ? "" : side === "home" ? m.hg : m.ag}
          </span>
        </div>
      ))}
      <div className="tie-meta">
        {m.state === "in" ? <span style={{ color: "var(--live)", fontWeight: 700 }}>{m.status}</span> : p ? `${p.day} · ${p.time} IST` : "TBC"}
        {m.city ? ` · ${m.city}` : ""}
      </div>
    </div>
  );
}

export default function BracketView({ matches, standings }) {
  const rounds = assembleBracket(matches, standings);
  return (
    <div className="bracket">
      {rounds.map((r) => (
        <div className="bracket-col" key={r.id}>
          <div className="eyebrow" style={{ textAlign: "center", color: r.id === "FINAL" ? "var(--gold)" : undefined }}>
            {r.id === "FINAL" ? "🏆 " : ""}{r.label}
          </div>
          {r.matches.map((m, i) => (
            <Tie m={m} key={m?.id || r.id + i} />
          ))}
        </div>
      ))}
    </div>
  );
}
