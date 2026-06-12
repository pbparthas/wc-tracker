import React from "react";
import { useNavigate } from "react-router-dom";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchTeams } from "../../lib/espn.js";
import { useCached } from "../../hooks/useCached.js";
import { useFavorites } from "../../hooks/useFavorites.js";

const EPL = COMPETITIONS.epl;
const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function ClubsPage() {
  const navigate = useNavigate();
  const { data: clubs, loading, error, refresh } = useCached("clubs:epl", WEEK, () => fetchTeams(EPL.slug));
  const { favs } = useFavorites("epl");

  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>20 CLUBS</h2>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        Tap a club for its squad, window business and an AI profile. ★ marks your clubs.
      </p>
      {loading && !clubs && <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading clubs…</p>}
      {error && !clubs && (
        <div className="card" style={{ padding: 12, fontSize: 13, color: "var(--muted)" }}>
          Couldn't load the club list ({error}).{" "}
          <button className="btn ghost" style={{ marginLeft: 6 }} onClick={refresh}>Retry</button>
        </div>
      )}
      <div className="team-grid">
        {(clubs || []).map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/epl/club/${c.id}`)}
            className="btn ghost"
            style={{ padding: "10px 4px", textAlign: "center", position: "relative", borderColor: favs.includes(c.id) ? "var(--saffron)" : "var(--line)" }}
          >
            {favs.includes(c.id) && (
              <span style={{ position: "absolute", top: 2, right: 5, color: "var(--saffron)", fontSize: 11 }}>★</span>
            )}
            {c.logo ? (
              <img src={c.logo} alt="" width={28} height={28} loading="lazy" style={{ objectFit: "contain" }} />
            ) : (
              <div style={{ fontSize: 20 }}>⚽</div>
            )}
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.name}
            </div>
          </button>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
