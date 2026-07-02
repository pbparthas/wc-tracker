import React, { useState } from "react";
import { useParams } from "react-router-dom";
import LeadersList from "../../components/LeadersList.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueTable, fetchLeagueScorers, fetchLeagueAssists } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";

const HALF_HOUR = 30 * 60 * 1000;

/* Coloured table bands come from the competition config, so a domestic league
   (Europe/relegation), the Championship (promotion/play-offs) and a UEFA
   league phase (last 16 / play-off / out) each read correctly. */
function zoneOf(pos, bands) {
  for (const b of bands || []) {
    if (b.upTo != null && pos <= b.upTo) return b;
    if (b.from != null && pos >= b.from) return b;
  }
  return null;
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

const VIEWS = [
  { id: "table", label: "Table" },
  { id: "scorers", label: "Scorers" },
  { id: "assists", label: "Assists" },
];

export default function TablePage() {
  const { comp } = useParams();
  const C = COMPETITIONS[comp] || COMPETITIONS.epl;
  const [view, setView] = useState("table");
  const { data, loading, error, refresh } = useCached(`table:${C.id}`, HALF_HOUR, () =>
    fetchLeagueTable(C.slug)
  );
  const scorers = useCached(`scorers:${C.id}`, HALF_HOUR, () => fetchLeagueScorers(C.slug));
  const assists = useCached(`assists:${C.id}`, HALF_HOUR, () => fetchLeagueAssists(C.slug));

  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="eyebrow">
          {C.flag} {C.name}{data?.season ? ` · ${data.season}` : ""}
        </span>
        <button className="iconbtn" style={{ fontSize: 14, padding: "6px 12px" }} onClick={refresh} disabled={loading} aria-label="Refresh table">
          {loading ? "…" : "↻"}
        </button>
      </div>

      <div className="match-tabs">
        {VIEWS.map((v) => (
          <button key={v.id} className={"match-tab" + (view === v.id ? " on" : "")} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "scorers" && (
        <LeadersList rows={scorers.data} metric="goals" loading={scorers.loading} error={scorers.error}
          emptyNote={`Top scorers fill in once the ${C.season.label} season kicks off.`} />
      )}
      {view === "assists" && (
        <LeadersList rows={assists.data} metric="assists" loading={assists.loading} error={assists.error}
          emptyNote={`Assist leaders fill in once the ${C.season.label} season kicks off.`} />
      )}

      {view === "table" && (<>

      {loading && !data && <p className="pulse" style={{ color: "var(--muted)", fontSize: 13 }}>Loading table…</p>}
      {error && !data && (
        <div className="card" style={{ padding: 14, fontSize: 13, color: "var(--muted)" }}>
          The league table isn't available right now ({error}). The {C.season.label} table fills in once the season kicks off.
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
                const color = zoneOf(i + 1, C.zones)?.color;
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
          {(C.zones || []).map((b, i) => (
            <span key={b.label}>
              {i > 0 ? " · " : ""}
              <span className="zdot" style={{ background: b.color }} /> {b.label}
            </span>
          ))}
          {(C.zones || []).some((b) => /Champions|Europa|Conference/.test(b.label)) && " · European spots are approximate (they shift with UEFA coefficients and cup winners)."}
        </p>
      )}
      </>)}
    </div>
  );
}
