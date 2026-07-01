import React from "react";
import { Link } from "react-router-dom";
import Flag from "./Flag.jsx";
import StatusPill from "./StatusPill.jsx";
import { EventSummary, PitchView, BenchList, CommentaryCard, StatsCard, TimelineCard } from "./MatchParts.jsx";
import { istParts } from "../lib/time.js";

/* The pieces both match-detail pages (World Cup and club leagues) share: the
   score header, the tab bar and the timeline/lineups/stats tab bodies. Each
   page stays a thin data container; fixes here apply to both. */

/* Team column in the score header — links to the team page when the caller can
   provide one (World Cup sides), and highlights the winner. */
function TeamCol({ team, outcome, href }) {
  const win = outcome === "win";
  const lose = outcome === "lose";
  const inner = (
    <>
      <Flag team={team} size={40} />
      <div style={{
        fontWeight: win ? 800 : 700, marginTop: 6,
        color: win ? "var(--saffron)" : lose ? "var(--muted)" : undefined,
      }}>
        {team?.name}{win ? " ✓" : ""}
      </div>
    </>
  );
  return href
    ? <Link to={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{inner}</Link>
    : <div>{inner}</div>;
}

export function ScoreHeader({ match, eyebrow, events, teamHref, children }) {
  const p = istParts(match.kickoff);
  const live = match.state === "in";
  const upcoming = match.state === "pre";
  const done = match.state === "post";
  // Penalties break a level knockout tie for the winner highlight.
  const pens = match.phg != null && match.pag != null;
  const winnerSide = done
    ? (match.hg > match.ag ? "home" : match.ag > match.hg ? "away"
      : pens ? (match.phg > match.pag ? "home" : match.pag > match.phg ? "away" : null) : null)
    : null;
  const outcomeOf = (side) => (winnerSide ? (winnerSide === side ? "win" : "lose") : null);

  return (
    <div className="card" style={{ padding: 16, margin: "10px 0", borderColor: live ? "var(--live)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="eyebrow">{eyebrow}</span>
        <StatusPill status={match.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, textAlign: "center" }}>
        <TeamCol team={match.home} outcome={outcomeOf("home")} href={teamHref?.(match.home)} />
        <div>
          <div className={"disp" + (live ? " pulse" : "")} style={{
            fontSize: live ? 48 : upcoming ? 22 : 38,
            fontWeight: 800,
            color: live ? "var(--live)" : upcoming ? "var(--saffron)" : "var(--chalk)",
            lineHeight: 1.1,
          }}>
            {upcoming ? (p ? p.time : "TBC") : `${match.hg ?? "–"} : ${match.ag ?? "–"}`}
          </div>
          {live && (
            <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: "var(--live)", marginTop: 4, letterSpacing: "0.08em" }}>
              {match.status}
            </div>
          )}
          {pens && (
            <div className="disp" style={{ fontSize: 13, fontWeight: 700, color: "var(--saffron)", marginTop: 2 }}>
              {match.phg}–{match.pag} on pens
            </div>
          )}
        </div>
        <TeamCol team={match.away} outcome={outcomeOf("away")} href={teamHref?.(match.away)} />
      </div>

      <EventSummary events={events} match={match} />

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
        {p ? `${p.day} · ${p.time}` : ""} <span style={{ color: "var(--saffron)", fontWeight: 600 }}>IST</span>
        {match.venue ? ` · ${match.venue}` : ""}
      </div>
      {children}
    </div>
  );
}

export function MatchTabsBar({ tabs, active, onTab }) {
  if (tabs.length < 2) return null;
  return (
    <div className="match-tabs">
      {tabs.map((t) => (
        <button key={t.id} className={"match-tab" + (active === t.id ? " on" : "")} onClick={() => onTab(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TimelineTab({ loading, summary }) {
  if (loading && !summary?.events) {
    return <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading timeline…</p>;
  }
  if (summary?.events?.length) {
    return (
      <>
        <TimelineCard events={summary.events} />
        {summary?.commentary?.length > 0 && <CommentaryCard items={summary.commentary} />}
      </>
    );
  }
  return <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Timeline not available yet.</p>;
}

export function LineupsTab({ loading, summary, upcoming, match }) {
  if (loading && !summary?.lineups) {
    return <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading lineups…</p>;
  }
  if (summary?.lineups) {
    return (
      <>
        <PitchView home={summary.lineups.home} away={summary.lineups.away} events={summary?.events} playerStats={summary?.playerStats} match={match} />
        <BenchList home={summary.lineups.home} away={summary.lineups.away} events={summary?.events} playerStats={summary?.playerStats} />
      </>
    );
  }
  if (upcoming) {
    return (
      <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Starting XI</div>
        Team sheets usually drop about an hour before kickoff — they'll appear here automatically.
      </div>
    );
  }
  return <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Lineups not available for this match.</p>;
}

export function StatsTab({ loading, summary }) {
  if (loading && !summary?.stats) {
    return <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading stats…</p>;
  }
  if (summary?.stats?.length) return <StatsCard stats={summary.stats} />;
  return <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Match stats not available yet.</p>;
}

export function InfoCard({ info }) {
  if (!info || (!info.attendance && !info.referee)) return null;
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
      {info.attendance ? <div>Attendance: {Number(info.attendance).toLocaleString("en-IN")}</div> : null}
      {info.referee ? <div>Referee: {info.referee}</div> : null}
    </div>
  );
}
