import React from "react";
import { useNavigate } from "react-router-dom";
import { GROUPS, TEAMS } from "../data/teams.js";
import { useFavorites } from "../hooks/useFavorites.js";

export default function TeamsPage() {
  const navigate = useNavigate();
  const { favs } = useFavorites();
  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>48 TEAMS, 48 STORIES</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Tap a team for trivia, the full squad, fixtures and an AI deep-dive. ★ marks your favourites.
      </p>
      {GROUPS.map((g) => (
        <div key={g.id} style={{ marginBottom: 12 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Group {g.id}</div>
          <div className="team-grid">
            {g.teams.map((c) => (
              <button
                key={c}
                onClick={() => navigate(`/team/${c}`)}
                className="btn ghost"
                style={{ padding: "8px 4px", textAlign: "center", position: "relative", borderColor: favs.includes(c) ? "var(--saffron)" : "var(--line)" }}
              >
                {favs.includes(c) && (
                  <span style={{ position: "absolute", top: 2, right: 5, color: "var(--saffron)", fontSize: 11 }}>★</span>
                )}
                <div style={{ fontSize: 20 }}>{TEAMS[c].flag}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {TEAMS[c].name}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
