import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import MatchRow from "../../components/MatchRow.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueMatches } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useResume } from "../../hooks/useResume.js";
import { istParts, IST } from "../../lib/time.js";

const EPL = COMPETITIONS.epl;

export default function EplMatchesPage() {
  const { data: matches, loading, error, refresh } = useCached(
    "eplmatches", 10 * 60 * 1000, () => fetchLeagueMatches(EPL.slug)
  );
  const { favs } = useFavorites("epl");
  useResume(() => refresh());

  const anyLive = (matches || []).some((m) => m.state === "in");

  const groups = useMemo(() => {
    if (!matches?.length) return [];
    const byDate = new Map();
    for (const m of matches) {
      const p = istParts(m.kickoff);
      const key = p?.dateKey || m.kickoff?.slice(0, 10) || "unknown";
      if (!byDate.has(key)) byDate.set(key, { label: p?.day || key, matches: [] });
      byDate.get(key).matches.push(m);
    }
    return [...byDate.values()];
  }, [matches]);

  const isFav = (m) => {
    const hid = m.home.espnId;
    const aid = m.away.espnId;
    return (hid && favs.includes(hid)) || (aid && favs.includes(aid));
  };

  const noFixtures = !loading && (!matches || matches.length === 0) && !error;

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span className="eyebrow">{EPL.flag} {EPL.name} · matches</span>
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
            {EPL.flag} SEASON {EPL.season.label}
          </div>
          <p style={{ fontSize: 13, marginBottom: 8 }}>
            {EPL.season.fixturesNote} Once the fixture list drops, this tab gets the full treatment:
            matchweek-by-matchweek fixtures in IST, live scores, stats, lineups and AI previews.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            The transfer window is where the action is right now — <Link to="/epl">follow the transfers</Link>.
          </p>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{g.label}</div>
          {g.matches.map((m) => (
            <MatchRow key={m.id} m={m} fav={isFav(m)} linkBase="/epl/match" />
          ))}
        </div>
      ))}

      {matches?.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 20px" }}>
          Updated {new Date().toLocaleTimeString("en-IN", { timeZone: IST })} IST · data from API-Football
          {anyLive ? " · auto-refreshes during live play" : ""}
        </p>
      )}
    </div>
  );
}
