import React from "react";
import Flag from "./Flag.jsx";
import { computeThirdPlace } from "../lib/thirdPlace.js";

export default function ThirdPlaceTable({ standings }) {
  const rows = computeThirdPlace(standings);
  if (rows.length === 0) return null;
  return (
    <div className="card" style={{ padding: "12px 12px 6px", marginBottom: 10 }}>
      <div className="disp" style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>
        BEST <span style={{ color: "var(--saffron)" }}>THIRD-PLACED</span> TEAMS
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
        Top 8 advance to the Round of 32 · tiebreaks beyond goals (fair play, drawing of lots) shown approximately
      </p>
      <table>
        <thead>
          <tr>
            <th>#</th><th className="tname">Team</th><th>Grp</th><th>P</th><th>GD</th><th>GF</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.group} className={r.rank === 9 ? "qline" : ""}>
              <td style={{ color: r.qualified ? "var(--saffron)" : "var(--muted)", fontWeight: 700 }}>{r.rank}</td>
              <td className="tname">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Flag team={r.team} size={16} />
                  <span style={{ fontWeight: r.qualified ? 700 : 400 }}>{r.team.name}</span>
                </span>
              </td>
              <td>{r.group}</td>
              <td>{r.p}</td>
              <td>{(r.gf - r.ga > 0 ? "+" : "") + (r.gf - r.ga)}</td>
              <td>{r.gf}</td>
              <td style={{ fontWeight: 700, color: "var(--saffron)" }}>{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
