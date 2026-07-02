import React from "react";
import { useNavigate } from "react-router-dom";
import Flag from "./Flag.jsx";
import StatusPill from "./StatusPill.jsx";
import { istParts, istDayLabel } from "../lib/time.js";
import { downloadIcs } from "../lib/ics.js";

export default function MatchRow({ m, fav = false, linkBase = "/match" }) {
  const navigate = useNavigate();
  const p = istParts(m.kickoff);
  const upcoming = m.state === "pre";
  const live = m.state === "in";
  // Skeleton slots with no live fixture yet have no detail page to open.
  const clickable = !m.placeholder && !!m.id;
  const go = () => clickable && navigate(`${linkBase}/${m.id}`);

  // Team names deep-link to their own page: World Cup sides by team code,
  // club sides by API-Football id (the club-page route id), derived from the
  // league the card lives in. Placeholder sides ("Winner Match 74") get none.
  const teamPage = (team) => {
    if (team?.code) return `/team/${team.code}`;
    const league = /^(\/league\/[^/]+)\/match$/.exec(linkBase || "");
    const cid = team === m.home ? m.apifHomeId : m.apifAwayId;
    return league && cid != null ? `${league[1]}/club/${cid}` : null;
  };
  const TeamName = ({ team, right }) => {
    const href = teamPage(team);
    const style = {
      fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis",
      whiteSpace: "nowrap", ...(right ? { textAlign: "right" } : {}),
    };
    if (!href) return <span style={style}>{team.name}</span>;
    return (
      <span
        role="link"
        tabIndex={0}
        style={style}
        onClick={(e) => { e.stopPropagation(); navigate(href); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); navigate(href); } }}
      >
        {team.name}
      </span>
    );
  };

  return (
    <div
      className={"card" + (fav ? " fav" : "")}
      style={{ padding: "12px 14px", marginBottom: 8, cursor: clickable ? "pointer" : "default", borderColor: live ? "var(--live)" : undefined }}
      onClick={go}
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => e.key === "Enter" && go() : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="eyebrow">{m.stage}{m.matchNo ? " · M" + m.matchNo : ""}{m.city ? " · " + m.city : ""}</span>
        <StatusPill status={m.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Flag team={m.home} />
          <TeamName team={m.home} />
        </div>
        <div
          className={"disp" + (live ? " pulse" : "")}
          style={{
            fontSize: upcoming ? 16 : 26,
            fontWeight: 800,
            textAlign: "center",
            minWidth: 64,
            color: upcoming ? "var(--saffron)" : live ? "var(--live)" : "var(--chalk)",
          }}
        >
          {upcoming ? (p ? p.time : "TBC") : `${m.hg ?? "–"} : ${m.ag ?? "–"}`}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
          <TeamName team={m.away} right />
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
