import React, { useEffect, useState } from "react";
import Flag from "./Flag.jsx";
import { fetchScorers } from "../lib/espn.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

export default function TopScorers() {
  const [data, setData] = useState(() => cacheGet("scorers"));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cacheGet("scorers")) return;
    fetchScorers()
      .then((d) => {
        cacheSet("scorers", d, 30 * 60 * 1000);
        setData(d);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed && !data)
    return (
      <div className="card" style={{ padding: 14, marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
        Golden Boot standings aren't available from the feed yet — check back after a few matches.
      </div>
    );
  if (!data) return null;

  return (
    <div className="card" style={{ padding: "12px 12px 6px", marginBottom: 10 }}>
      <div className="disp" style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
        GOLDEN <span style={{ color: "var(--gold)" }}>BOOT</span>
      </div>
      <table>
        <thead>
          <tr><th>#</th><th className="tname">Player</th><th>Goals</th></tr>
        </thead>
        <tbody>
          {data.goals.map((l, i) => (
            <tr key={l.player}>
              <td style={{ color: "var(--muted)" }}>{i + 1}</td>
              <td className="tname">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Flag team={l.team} size={16} />
                  <span style={{ fontWeight: i === 0 ? 700 : 400 }}>{l.player}</span>
                </span>
              </td>
              <td style={{ fontWeight: 700, color: "var(--gold)" }}>{l.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
