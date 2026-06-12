import React from "react";
import { Link, useNavigate } from "react-router-dom";
import MatchRow from "../components/MatchRow.jsx";
import { useSchedule } from "../hooks/useSchedule.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { TEAMS } from "../data/teams.js";

/* Every match involving a favourite team, tournament-wide. */
export default function YourTeamsPage() {
  const navigate = useNavigate();
  const { matches, loading } = useSchedule();
  const { favs } = useFavorites();

  const favMatches = matches.filter((m) => favs.includes(m.home.code) || favs.includes(m.away.code));
  const live = favMatches.filter((m) => m.state === "in");
  const next = favMatches.filter((m) => m.state === "pre");
  const done = favMatches.filter((m) => m.state === "post").reverse();

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/" style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, margin: "10px 0 4px", color: "var(--saffron)" }}>
        YOUR ★ TEAMS
      </h2>

      {favs.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
          No favourites yet — star teams from the <Link to="/teams">Teams tab</Link> or in{" "}
          <Link to="/settings">Settings</Link> and their matches will be tracked here.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0 4px" }}>
            {favs.map((c) =>
              TEAMS[c] ? (
                <button key={c} className="iconbtn on" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => navigate(`/team/${c}`)}>
                  {TEAMS[c].flag} {TEAMS[c].name}
                </button>
              ) : null
            )}
          </div>

          {loading && favMatches.length === 0 && (
            <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>Loading fixtures…</p>
          )}

          {live.length > 0 && (
            <>
              <h2 className="disp section-h" style={{ color: "var(--live)" }}>LIVE NOW</h2>
              {live.map((m) => <MatchRow key={m.id} m={m} fav />)}
            </>
          )}
          {next.length > 0 && (
            <>
              <h2 className="disp section-h">NEXT UP</h2>
              {next.map((m) => <MatchRow key={m.id} m={m} fav />)}
            </>
          )}
          {done.length > 0 && (
            <>
              <h2 className="disp section-h" style={{ color: "var(--muted)" }}>RESULTS</h2>
              {done.map((m) => <MatchRow key={m.id} m={m} fav />)}
            </>
          )}
          {!loading && favMatches.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 10 }}>No fixtures for your teams yet.</p>
          )}
        </>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}
