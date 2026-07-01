import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import { COMPETITIONS } from "../data/competitions.js";
import { TOURNAMENT, ROUNDS } from "../data/phases.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { mergeKnockoutSchedule, assembleBracket } from "../lib/bracket.js";
import { istParts } from "../lib/time.js";
import AiCard from "../components/AiCard.jsx";
import { useAiContent } from "../hooks/useAiContent.js";
import { tournamentRecapPrompt } from "../lib/prompts.js";

/* Club leagues that are live in the app (transfers + table + clubs + matches). */
const CLUB_LEAGUES = ["epl", "laliga", "bundesliga", "seriea", "ligue1"];
const LEAGUE_ACCENTS = {
  epl: "#0b7a45", laliga: "#c2571d", bundesliga: "#b02525", seriea: "#1f5fa8", ligue1: "#0c7a68",
};
const COMING_SOON = [["⭐", "Champions League"]];

const DAY = 24 * 60 * 60 * 1000;

/* The World Cup's place on the home screen over its lifecycle: the featured
   dashboard while it runs, then (leagues take precedence) a slim archive card.
   A short grace window after the final keeps the celebration up top. */
function wcPhase() {
  const end = new Date(TOURNAMENT.end + "T23:59:59Z").getTime();
  if (Date.now() <= end + 3 * DAY) return "featured";
  return "archive";
}

/* Mini-card in the live-now strip: a live match, or the next kickoff. */
function StripCard({ m, onOpen }) {
  const live = m.state === "in";
  const p = istParts(m.kickoff);
  const clickable = !m.placeholder && !!m.id;
  return (
    <div
      className="card"
      role={clickable ? "link" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => clickable && onOpen(m.id)}
      onKeyDown={(e) => e.key === "Enter" && clickable && onOpen(m.id)}
      style={{
        flex: "0 0 auto", minWidth: 200, padding: "10px 12px",
        cursor: clickable ? "pointer" : "default",
        borderColor: live ? "var(--live)" : "var(--line)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span className="eyebrow" style={live ? { color: "var(--live)" } : undefined}>
          {live ? <><span className="pulse">●</span> {m.status}</> : `Next · ${p ? p.time : "TBC"}`}
        </span>
        <span className="eyebrow">{m.matchNo ? `M${m.matchNo}` : m.city}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
        <Flag team={m.home} size={14} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.home.name}</span>
        <span style={{ color: live ? "var(--live)" : "var(--saffron)", fontWeight: 800 }}>
          {live || m.state === "post" ? `${m.hg}:${m.ag}` : "v"}
        </span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.away.name}</span>
        <Flag team={m.away} size={14} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { matches } = useSchedule();
  const { standings } = useStandings();
  const phase = wcPhase();

  const merged = useMemo(() => mergeKnockoutSchedule(matches, standings), [matches, standings]);

  const liveNow = merged.filter((m) => m.state === "in");
  const nextUp = merged
    .filter((m) => m.state === "pre" && new Date(m.kickoff) > new Date())
    .slice(0, 4 - Math.min(liveNow.length, 2));
  const strip = [...liveNow, ...nextUp];

  // Tournament progress: the first round with an unplayed slot is "current".
  const progress = useMemo(() => {
    const rounds = assembleBracket(matches, standings);
    for (const r of rounds) {
      const played = r.matches.filter((m) => m && m.state === "post").length;
      if (played < r.matches.length) return { label: r.label, played, total: r.matches.length };
    }
    const final = rounds[rounds.length - 1]?.matches?.[0];
    if (final && final.state === "post") {
      const champ = final.hg > final.ag ? final.home : final.ag > final.hg ? final.away
        : final.phg > final.pag ? final.home : final.away;
      return { label: "Champions", champion: champ?.name };
    }
    return null;
  }, [matches, standings]);

  const recap = useAiContent(
    "wcRecap2026",
    () => tournamentRecapPrompt(progress?.champion, merged)
  );

  const todayKey = istParts(new Date().toISOString())?.dateKey;
  const todayCount = merged.filter((m) => istParts(m.kickoff)?.dateKey === todayKey).length;

  const WcCard = phase === "featured" ? (
    <div
      className="card"
      role="link"
      tabIndex={0}
      onClick={() => navigate("/matches")}
      onKeyDown={(e) => e.key === "Enter" && navigate("/matches")}
      style={{ padding: 18, marginBottom: 12, cursor: "pointer", background: "linear-gradient(180deg, var(--grad-hi) 0%, var(--grad-lo) 100%)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow" style={{ color: "var(--saffron)" }}>USA · Mexico · Canada</span>
        <span className="eyebrow" style={{ color: liveNow.length ? "var(--live)" : undefined }}>
          {liveNow.length ? <><span className="pulse">●</span> {liveNow.length} live</> : todayCount ? `${todayCount} today` : "Live now"}
        </span>
      </div>
      <div className="disp" style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 2px" }}>
        🏆 WORLD CUP 2026
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        {progress?.champion
          ? `Champions: ${progress.champion}`
          : progress
            ? `${progress.label} · ${progress.played} of ${progress.total} played · final at MetLife, 19 July`
            : "48 teams · 104 matches · 11 June – 19 July · all times IST"}
      </div>
    </div>
  ) : (
    <div
      className="card"
      role="link"
      tabIndex={0}
      onClick={() => navigate("/matches")}
      onKeyDown={(e) => e.key === "Enter" && navigate("/matches")}
      style={{ padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
    >
      <span style={{ fontWeight: 700, fontSize: 14 }}>
        🏆 World Cup 2026{progress?.champion ? ` — champions: ${progress.champion}` : ""}
      </span>
      <span className="eyebrow">Results & bracket</span>
    </div>
  );

  const quick = [
    ["🗓", "Matches", "/matches"],
    ["🏆", "Bracket", "/knockout"],
    ["👟", "Golden Boot", "/goldenboot"],
    ["★", "My teams", "/yourteams"],
  ];

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      {phase === "featured" && strip.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: "touch" }}>
          {strip.map((m) => <StripCard key={m.id} m={m} onOpen={(id) => navigate(`/match/${id}`)} />)}
        </div>
      )}

      {phase === "featured" && (
        <>
          {WcCard}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 4 }}>
            {quick.map(([icon, label, to]) => (
              <button
                key={label}
                className="card"
                onClick={() => navigate(to)}
                style={{ padding: "10px 4px", textAlign: "center", cursor: "pointer", fontFamily: "inherit", color: "inherit" }}
              >
                <div style={{ fontSize: 18 }}>{icon}</div>
                <div className="eyebrow" style={{ marginTop: 4, letterSpacing: "0.08em" }}>{label}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Club football</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {CLUB_LEAGUES.map((id) => {
          const c = COMPETITIONS[id];
          if (!c) return null;
          const open = !!c.window?.closesIso && Date.now() < new Date(c.window.closesIso).getTime();
          return (
            <div
              key={id}
              className="card"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/league/${id}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/league/${id}`)}
              style={{ padding: 12, cursor: "pointer", borderLeft: `3px solid ${LEAGUE_ACCENTS[id]}` }}
            >
              <span className="eyebrow">{c.season.label}</span>
              <div className="disp" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>
                {c.flag} {c.name.toUpperCase()}
              </div>
              {open && (
                <div className="eyebrow" style={{ color: LEAGUE_ACCENTS[id], marginTop: 5, letterSpacing: "0.08em" }}>
                  ● Window open
                </div>
              )}
            </div>
          );
        })}
        {COMING_SOON.map(([flag, name]) => (
          <div key={name} className="card" style={{ padding: 12, opacity: 0.55 }}>
            <span className="eyebrow">Europe</span>
            <div className="disp" style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{flag} {name.toUpperCase()}</div>
            <div className="eyebrow" style={{ marginTop: 5, letterSpacing: "0.08em" }}>Coming soon</div>
          </div>
        ))}
      </div>

      {phase === "archive" && (
        <div style={{ marginTop: 14 }}>
          {WcCard}
          <AiCard title="How the tournament went" ai={recap} cta="✨ Recap the World Cup" />
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}
