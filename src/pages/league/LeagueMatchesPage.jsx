import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MatchRow from "../../components/MatchRow.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueMatches } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useResume } from "../../hooks/useResume.js";
import { istParts, istDateKey, IST } from "../../lib/time.js";

const DAY = 86400000;

/* Group a match list by IST date, keeping the incoming order. */
function groupByDay(list) {
  const byDate = new Map();
  for (const m of list) {
    const p = istParts(m.kickoff);
    const key = p?.dateKey || m.kickoff?.slice(0, 10) || "unknown";
    if (!byDate.has(key)) byDate.set(key, { label: p?.day || key, matches: [] });
    byDate.get(key).matches.push(m);
  }
  return [...byDate.values()];
}

function DayGroups({ groups, isFav, linkBase }) {
  return groups.map((g) => (
    <div key={g.label} style={{ marginBottom: 16 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{g.label}</div>
      {g.matches.map((m) => (
        <MatchRow key={m.id} m={m} fav={isFav(m)} linkBase={linkBase} />
      ))}
    </div>
  ));
}

/* "Regular Season - 5" / "League Stage - 5" → "Matchday 5"; knockout labels
   pass through as-is. */
function roundLabel(stage) {
  const m = /-\s*(\d+)\s*$/.exec(stage || "");
  if (m && /season|stage/i.test(stage)) return `Matchday ${m[1]}`;
  return stage || "Fixtures";
}

/* Group a (kickoff-sorted) list into matchday rounds, preserving order. */
function groupByRound(list) {
  const rounds = new Map();
  for (const m of list) {
    const key = roundLabel(m.stage);
    if (!rounds.has(key)) rounds.set(key, []);
    rounds.get(key).push(m);
  }
  return [...rounds.entries()].map(([label, matches]) => ({ label, matches }));
}

/* Collapsed-by-default section — a full club season is ~380 fixtures, so only
   the near-term window renders expanded; history and the far future fold away. */
function Collapsible({ label, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!count) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        className="ai-toggle"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", padding: "10px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}
      >
        <span className="disp" style={{ fontWeight: 800, letterSpacing: "0.04em" }}>
          {label} <span style={{ color: "var(--muted)", fontWeight: 600 }}>({count})</span>
        </span>
        <span className="ai-chev">{open ? "▾ hide" : "▸ show"}</span>
      </button>
      {open && children}
    </div>
  );
}

export default function LeagueMatchesPage() {
  const { comp } = useParams();
  const C = COMPETITIONS[comp] || COMPETITIONS.epl;
  const { data: matches, loading, error, refresh } = useCached(
    `matches:${C.id}`, 10 * 60 * 1000, () => fetchLeagueMatches(C.slug)
  );
  const { favs } = useFavorites(C.id);
  useResume(() => refresh());

  const anyLive = (matches || []).some((m) => m.state === "in");

  const { live, todayG, soonG, laterRounds, laterCount, resultRounds, resultsCount } = useMemo(() => {
    const list = matches || [];
    const today = istDateKey();
    const weekOut = istDateKey(new Date(Date.now() + 7 * DAY));
    const live = list.filter((m) => m.state === "in");
    const done = list.filter((m) => m.state === "post");
    const pre = list.filter((m) => m.state === "pre");
    const dayOf = (m) => istParts(m.kickoff)?.dateKey || "";
    const todayList = pre.filter((m) => dayOf(m) === today);
    const soon = pre.filter((m) => dayOf(m) > today && dayOf(m) <= weekOut);
    const later = pre.filter((m) => dayOf(m) > weekOut);
    const byKickoff = (a, b) => new Date(a.kickoff) - new Date(b.kickoff);
    return {
      live,
      todayG: groupByDay(todayList),
      soonG: groupByDay(soon),
      laterRounds: groupByRound([...later].sort(byKickoff)),
      laterCount: later.length,
      // newest matchday first, newest result first within it
      resultRounds: groupByRound([...done].sort(byKickoff).reverse()),
      resultsCount: done.length,
    };
  }, [matches]);

  // Starred clubs are stored by API-Football team id (the club-page route id);
  // espnId only exists on ESPN-fallback matches, so check both id spaces.
  const isFav = (m) => {
    const ids = [m.apifHomeId, m.apifAwayId, m.home.espnId, m.away.espnId];
    return ids.some((x) => x != null && favs.includes(String(x)));
  };

  const noFixtures = !loading && (!matches || matches.length === 0) && !error;
  const linkBase = `/league/${C.id}/match`;

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span className="eyebrow">{C.flag} {C.name} · matches</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {anyLive && <span className="pulse" style={{ color: "var(--live)", fontSize: 11, fontWeight: 700 }}>● LIVE</span>}
          <button className="iconbtn" style={{ fontSize: 14, padding: "6px 12px" }} onClick={() => refresh()} disabled={loading} aria-label="Refresh matches">
            {loading ? "…" : "↻"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card error" style={{ padding: 12, marginBottom: 10, fontSize: 13 }}>
          Couldn't load matches ({error}).{" "}
          <button className="btn ghost" style={{ marginLeft: 6 }} onClick={() => refresh()}>Retry</button>
        </div>
      )}

      {loading && !matches && (
        <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>
          <span className="pulse">Loading fixtures…</span>
        </div>
      )}

      {noFixtures && (
        <div className="card" style={{ padding: 16, marginBottom: 10 }}>
          <div className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
            {C.flag} SEASON {C.season.label}
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            {C.season.fixturesNote} Once the fixture list drops, this tab gets the full treatment:
            fixtures in IST, live scores, stats, lineups and AI previews.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            The transfer window is where the action is right now — <Link to={`/league/${C.id}`}>follow the transfers</Link>.
          </p>
        </div>
      )}

      {live.length > 0 && (
        <>
          <h2 className="disp section-h" style={{ color: "var(--live)" }}>LIVE NOW</h2>
          {live.map((m) => <MatchRow key={m.id} m={m} fav={isFav(m)} linkBase={linkBase} />)}
        </>
      )}

      {todayG.length > 0 && (
        <>
          <h2 className="disp section-h">TODAY</h2>
          <DayGroups groups={todayG} isFav={isFav} linkBase={linkBase} />
        </>
      )}

      {soonG.length > 0 && (
        <>
          <h2 className="disp section-h">THIS WEEK</h2>
          <DayGroups groups={soonG} isFav={isFav} linkBase={linkBase} />
        </>
      )}

      {laterCount > 0 && (
        <>
          <h2 className="disp section-h">LATER FIXTURES</h2>
          {laterRounds.map((r) => (
            <Collapsible key={r.label} label={r.label.toUpperCase()} count={r.matches.length}>
              <DayGroups groups={groupByDay(r.matches)} isFav={isFav} linkBase={linkBase} />
            </Collapsible>
          ))}
        </>
      )}

      {resultsCount > 0 && (
        <>
          <h2 className="disp section-h" style={{ color: "var(--muted)" }}>RESULTS</h2>
          {resultRounds.map((r) => (
            <Collapsible key={r.label} label={r.label.toUpperCase()} count={r.matches.length}>
              <DayGroups groups={groupByDay(r.matches)} isFav={isFav} linkBase={linkBase} />
            </Collapsible>
          ))}
        </>
      )}

      {matches?.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 20px" }}>
          Updated {new Date().toLocaleTimeString("en-IN", { timeZone: IST })} IST · data from API-Football
          {anyLive ? " · auto-refreshes during live play" : ""}
        </p>
      )}
    </div>
  );
}
