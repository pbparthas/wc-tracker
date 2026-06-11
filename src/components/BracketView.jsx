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
  return (
    <div
      className="card tie"
      style={{ cursor: "pointer" }}
      onClick={() => m.id && navigate(`/match/${m.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && m.id && navigate(`/match/${m.id}`)}
    >
      {["home", "away"].map((side) => (
        <div className="tie-row" key={side}>
          <Flag team={m[side]} size={16} />
          <span className="nm" style={{ fontWeight: winner === side ? 800 : 600, color: done && winner && winner !== side ? "var(--muted)" : "var(--chalk)" }}>
            {m[side].name}
          </span>
          <span className="sc" style={{ color: winner === side ? "var(--saffron)" : "var(--chalk)" }}>
            {m.state === "pre" ? "" : side === "home" ? m.hg : m.ag}
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

export default function BracketView({ matches }) {
  const rounds = assembleBracket(matches);
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
