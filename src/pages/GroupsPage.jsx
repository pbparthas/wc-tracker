import React from "react";
import GroupTable from "../components/GroupTable.jsx";
import ThirdPlaceTable from "../components/ThirdPlaceTable.jsx";
import TopScorers from "../components/TopScorers.jsx";
import { useStandings } from "../hooks/useStandings.js";
import { GROUPS } from "../data/teams.js";
import { IST } from "../lib/time.js";

export default function GroupsPage() {
  const { standings, loading, error, refresh, fetchedAt } = useStandings();
  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span className="eyebrow">Top 2 qualify · 8 best 3rd-placed advance</span>
        <button className="btn" onClick={() => refresh(true)} disabled={loading}>
          {loading ? "Fetching…" : "↻ Refresh"}
        </button>
      </div>
      {error && (
        <div className="card error" style={{ padding: 12, margin: "8px 0", fontSize: 13 }}>
          Couldn't fetch standings ({error}).
        </div>
      )}
      <ThirdPlaceTable standings={standings} />
      <TopScorers />
      {GROUPS.map((g) => (
        <GroupTable key={g.id} group={g} rows={standings[g.id]} />
      ))}
      {fetchedAt ? (
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>
          Updated {fetchedAt.toLocaleTimeString("en-IN", { timeZone: IST })} IST · dashed line marks the qualification edge
        </p>
      ) : (
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>Tap refresh to pull live standings.</p>
      )}
    </div>
  );
}
