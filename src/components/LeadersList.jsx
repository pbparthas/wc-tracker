import React, { useState } from "react";

/* Scoring / assist leaderboard rows. `metric` picks which number leads. */
export default function LeadersList({ rows, metric = "goals", loading, error, emptyNote }) {
  if (loading && !rows) return <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading leaders…</p>;
  if (error && !rows?.length) return <p style={{ color: "var(--muted)", fontSize: 13 }}>{error}</p>;
  if (!rows?.length) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>{emptyNote || "No leaders yet — fills in once matches are played."}</p>;
  }
  // The feed is already sorted by the relevant metric, but re-rank by it so the
  // displayed positions match the chosen column exactly.
  const ranked = [...rows].sort((a, b) => (b[metric] - a[metric]) || (b.goals - a.goals));
  return (
    <div className="card" style={{ padding: "6px 12px 10px", marginBottom: 10 }}>
      {ranked.slice(0, 20).map((p, i) => (
        <div key={p.player + i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none",
        }}>
          <span className="disp" style={{ width: 22, textAlign: "center", fontWeight: 800, color: "var(--muted)", fontSize: 14 }}>{i + 1}</span>
          {p.photo
            ? <Avatar src={p.photo} />
            : <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--line)", flexShrink: 0 }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.player}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
              {p.teamLogo && <img src={p.teamLogo} alt="" width={13} height={13} loading="lazy" style={{ objectFit: "contain" }} />}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.team}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span className="disp" style={{ fontSize: 20, fontWeight: 800, color: "var(--saffron)" }}>{p[metric]}</span>
            <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.04em" }}>
              {metric === "goals" ? "GOALS" : "ASSISTS"}
              {metric === "goals" && p.assists ? ` · ${p.assists} A` : ""}
              {metric === "assists" && p.goals ? ` · ${p.goals} G` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ src }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--line)", flexShrink: 0 }} />;
  return (
    <img
      src={src}
      alt=""
      width={30}
      height={30}
      loading="lazy"
      onError={() => setBroken(true)}
      style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "var(--line)" }}
    />
  );
}
