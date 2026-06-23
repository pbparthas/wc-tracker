import React, { useEffect, useState } from "react";
import Flag from "./Flag.jsx";
import { fetchTopScorers } from "../lib/datasource.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

export default function TopScorers() {
  const [data, setData] = useState(() => cacheGet("scorers2"));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cacheGet("scorers2")) return;
    fetchTopScorers()
      .then((d) => {
        if (d?.goals?.length) {
          cacheSet("scorers2", d, 30 * 60 * 1000);
          setData(d);
        } else {
          setFailed(true);
        }
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

  const { goals, source } = data;

  return (
    <div className="card" style={{ padding: "12px 12px 6px", marginBottom: 10 }}>
      <div className="disp" style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
        GOLDEN <span style={{ color: "var(--gold)" }}>BOOT</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="tname">Player</th>
            <th>G</th>
            {source === "apif" && <th>A</th>}
          </tr>
        </thead>
        <tbody>
          {goals.slice(0, 15).map((l, i) => (
            <tr key={l.player + i}>
              <td style={{ color: "var(--muted)" }}>{i + 1}</td>
              <td className="tname">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {source === "apif" && l.photo ? (
                    <img src={l.photo} alt="" width={20} height={20} loading="lazy"
                      style={{ borderRadius: "50%", objectFit: "cover", background: "#222", flexShrink: 0 }} />
                  ) : (
                    <Flag team={{ name: l.team, logo: l.teamLogo }} size={16} />
                  )}
                  <span style={{ fontWeight: i === 0 ? 700 : 400 }}>{l.player}</span>
                  {source === "apif" && <span style={{ fontSize: 10, color: "var(--muted)" }}>{l.team}</span>}
                </span>
              </td>
              <td style={{ fontWeight: 700, color: "var(--gold)" }}>{l.goals}</td>
              {source === "apif" && (
                <td style={{ color: "var(--muted)" }}>{l.assists || 0}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
