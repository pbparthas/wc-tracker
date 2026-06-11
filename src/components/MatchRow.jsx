import React from "react";
import { useNavigate } from "react-router-dom";
import Flag from "./Flag.jsx";
import StatusPill from "./StatusPill.jsx";
import { istParts, istDayLabel } from "../lib/time.js";
import { downloadIcs } from "../lib/ics.js";

export default function MatchRow({ m, fav = false }) {
  const navigate = useNavigate();
  const p = istParts(m.kickoff);
  const upcoming = m.state === "pre";

  return (
    <div
      className={"card" + (fav ? " fav" : "")}
      style={{ padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}
      onClick={() => m.id && navigate(`/match/${m.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && m.id && navigate(`/match/${m.id}`)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="eyebrow">{m.stage}{m.city ? " · " + m.city : ""}</span>
        <StatusPill status={m.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Flag team={m.home} />
          <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.home.name}
          </span>
        </div>
        <div
          className="disp"
          style={{
            fontSize: upcoming ? 16 : 26,
            fontWeight: 800,
            textAlign: "center",
            minWidth: 64,
            color: upcoming ? "var(--saffron)" : "var(--chalk)",
          }}
        >
          {upcoming ? (p ? p.time : "TBC") : `${m.hg ?? "–"} : ${m.ag ?? "–"}`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
            {m.away.name}
          </span>
          <Flag team={m.away} />
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {p ? (
          <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: ".06em" }}>
            {upcoming ? istDayLabel(m.kickoff) : p.day + " · " + p.time}
            <span style={{ color: "var(--saffron)", marginLeft: 6, fontWeight: 600 }}>IST</span>
          </span>
        ) : (
          <span />
        )}
        {upcoming && (
          <button
            className="iconbtn"
            style={{ padding: "4px 8px", minHeight: 30, fontSize: 13 }}
            aria-label="Add reminder to calendar"
            onClick={(e) => {
              e.stopPropagation();
              downloadIcs(m);
            }}
          >
            🔔
          </button>
        )}
      </div>
    </div>
  );
}
