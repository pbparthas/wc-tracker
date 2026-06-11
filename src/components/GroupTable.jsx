import React from "react";
import { Link } from "react-router-dom";
import Flag from "./Flag.jsx";
import { TEAMS } from "../data/teams.js";

export default function GroupTable({ group, rows }) {
  const data =
    rows ||
    group.teams.map((c) => ({ team: { code: c, ...TEAMS[c] }, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  return (
    <div className="card" style={{ padding: "12px 12px 6px", marginBottom: 10 }}>
      <div className="disp" style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>
        GROUP <span style={{ color: "var(--saffron)" }}>{group.id}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th className="tname">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.team.code || r.team.name} className={i === 2 ? "qline" : ""}>
              <td className="tname">
                <Link
                  to={r.team.code ? `/team/${r.team.code}` : "#"}
                  style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <Flag team={r.team} size={16} />
                  <span style={{ fontWeight: i < 2 ? 700 : 400 }}>{r.team.name}</span>
                </Link>
              </td>
              <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
              <td>{(r.gf - r.ga > 0 ? "+" : "") + (r.gf - r.ga)}</td>
              <td style={{ fontWeight: 700, color: "var(--saffron)" }}>{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
