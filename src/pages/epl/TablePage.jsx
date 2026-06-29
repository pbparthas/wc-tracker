import React from "react";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueTable } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";

const EPL = COMPETITIONS.epl;

/* Zone colors: CL / EL / Conference / relegation. The fifth CL spot is
   coefficient-dependent — footnoted as approximate. */
function zoneOf(pos) {
  const z = EPL.zones;
  if (pos <= z.ucl) return ["var(--saffron)", "Champions League"];
  if (pos <= z.uel) return ["var(--gold)", "Europa League"];
  if (pos <= z.conf) return ["#7FB5FF", "Conference League"];
  if (pos > z.releg) return ["var(--live)", "Relegation"];
  return [null, null];
}

/* Last-5 form (most recent last), as small W/D/L pips. API-Football ships this
   as a string like "WWDLW"; ESPN's table fallback omits it, so render nothing. */
function FormPips({ form }) {
  const seq = (form || "").slice(-5).split("");
  if (!seq.length) return null;
  const color = (r) => (r === "W" ? "#3a7d2e" : r === "L" ? "var(--live)" : "#b58a1e");
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {seq.map((r, i) => (
        <span key={i} title={r} style={{
          width: 14, height: 14, borderRadius: 3, background: color(r),
          color: "#fff", fontSize: 9, fontWeight: 800, lineHeight: "14px", textAlign: "center",
        }}>{r}</span>
      ))}
    </span>
  );
}

export default function TablePage() {
  const { data, loading, error, refresh } = useCached("table:epl", 30 * 60 * 1000, () =>
    fetchLeagueTable(EPL.slug)
  );

  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="eyebrow">
          {EPL.flag} {EPL.name}{data?.season ? ` · ${data.season}` : ""}
        </span>
        <button className="iconbtn" style={{ fontSize: 14, padding: "6px 12px" }} onClick={refresh} disabled={loading} aria-label="Refresh table">
          {loading ? "…" : "↻"}
        </button>
      </div>

      {loading && !data && <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading table…</p>}
      {error && !data && (
        <div className="card" style={{ padding: 14, fontSize: 13, color: "var(--muted)" }}>
          The league table isn't available right now ({error}). The {EPL.season.label} table fills in once the season kicks off.
        </div>
      )}

      {data && (
        <div className="card" style={{ padding: "12px 10px 8px", marginBottom: 10 }}>
          <table>
            <thead>
              <tr>
                <th>#</th><th className="tname">Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => {
                const [color] = zoneOf(i + 1);
                return (
                  <tr key={r.team.espnId || r.team.name}>
                    <td style={{ color: "var(--muted)" }}>
                      {color && <span className="zdot" style={{ background: color }} />}
                      {i + 1}
                    </td>
                    <td className="tname">
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {r.team.logo && <img src={r.team.logo} alt="" width={16} height={16} loading="lazy" />}
                        {r.team.name}
                      </span>
                      {r.form ? <div style={{ marginTop: 4 }}><FormPips form={r.form} /></div> : null}
                    </td>
                    <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                    <td>{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td>
                    <td style={{ fontWeight: 700, color: "var(--saffron)" }}>{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>
          <span className="zdot" style={{ background: "var(--saffron)" }} /> Champions League ·{" "}
          <span className="zdot" style={{ background: "var(--gold)" }} /> Europa ·{" "}
          <span className="zdot" style={{ background: "#7FB5FF" }} /> Conference ·{" "}
          <span className="zdot" style={{ background: "var(--live)" }} /> Relegation · European spots are approximate
          (the extra CL place depends on UEFA coefficients).
        </p>
      )}
    </div>
  );
}
