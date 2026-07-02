import React from "react";

/* ESPN position abbreviations start with G/D/M/F; anything else goes last. */
const POS_BUCKETS = [
  ["G", "Goalkeepers"],
  ["D", "Defenders"],
  ["M", "Midfielders"],
  ["F", "Forwards"],
  ["", "Squad"],
];
const bucketOf = (p) => {
  const c = (p.pos || "")[0]?.toUpperCase();
  return ["G", "D", "M", "F"].includes(c) ? c : "";
};

export default function SquadList({ players, loading, onPick, emptyNote }) {
  // An empty list is as blank as no list — without this an empty squad
  // rendered nothing at all (every position bucket empty, no message).
  if (!players?.length) {
    if (loading) return <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading squad…</p>;
    return (
      <p style={{ color: "var(--muted)", fontSize: 13 }}>
        {emptyNote || "Squad not available from the data feed yet — check back later."}
      </p>
    );
  }
  return POS_BUCKETS.map(([b, label]) => {
    const group = players.filter((p) => bucketOf(p) === b);
    if (!group.length) return null;
    return (
      <div key={label} style={{ marginBottom: 6 }}>
        <h4 className="eyebrow" style={{ margin: "10px 0 2px" }}>{label}</h4>
        <ul className="squad">
          {group.map((p) => (
            <li key={p.id || p.name}>
              <button className="squad-row" onClick={() => onPick(p)}>
                <span className="jersey">{p.jersey || "–"}</span>
                <span className="pname">{p.name}</span>
                {p.age && <span style={{ color: "var(--muted)", fontSize: 12 }}>{p.age} yrs</span>}
                <span className="chev">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  });
}
