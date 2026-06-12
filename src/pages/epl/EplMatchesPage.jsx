import React from "react";
import { Link } from "react-router-dom";
import { COMPETITIONS } from "../../data/competitions.js";

const EPL = COMPETITIONS.epl;

/* Phase 2 surface: the matchweek pager and live scores arrive with the
   fixture release. No countdown clocks here — league matches are days apart,
   so the next fixture's date and time is the honest display. */
export default function EplMatchesPage() {
  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <h2 className="disp" style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
        {EPL.flag} SEASON {EPL.season.label}
      </h2>
      <div className="card" style={{ padding: 16, marginBottom: 10, fontSize: 13 }}>
        <p style={{ marginBottom: 8 }}>
          The fixture list hasn't been released yet. {EPL.season.fixturesNote} Once it lands, this tab gets
          the full treatment: matchweek-by-matchweek fixtures in IST, live scores, stats, lineups and AI
          previews — same as the World Cup.
        </p>
        <p style={{ color: "var(--muted)" }}>
          Until then, the window is where the action is — <Link to="/epl">follow the transfers</Link>.
        </p>
      </div>
    </div>
  );
}
