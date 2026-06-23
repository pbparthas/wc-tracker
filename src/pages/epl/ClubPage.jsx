import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AiCard from "../../components/AiCard.jsx";
import SquadList from "../../components/SquadList.jsx";
import PlayerSheet from "../../components/PlayerSheet.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchTeams, fetchTransactions } from "../../lib/espn.js";
import { fetchLeagueTable } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useRoster } from "../../hooks/useRoster.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { clubPrompt } from "../../lib/prompts.js";

const EPL = COMPETITIONS.epl;
const DAY = 24 * 60 * 60 * 1000;

function PositionBadge({ pos }) {
  let color = "var(--muted)";
  let label = "";
  if (pos <= EPL.zones.ucl) { color = "#2563eb"; label = "UCL"; }
  else if (pos <= EPL.zones.uel) { color = "#f97316"; label = "UEL"; }
  else if (pos <= EPL.zones.conf) { color = "#22c55e"; label = "UECL"; }
  else if (pos > EPL.zones.releg) { color = "var(--live)"; label = "REL"; }
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--bg)", border: "1px solid var(--line)",
      borderRadius: 10, padding: "6px 12px",
    }}>
      <span className="disp" style={{ fontSize: 22, fontWeight: 800, color }}>{pos}</span>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        <div style={{ fontWeight: 600 }}>{label || `${pos}th`}</div>
        <div>2025-26</div>
      </div>
    </div>
  );
}

export default function ClubPage() {
  const { id } = useParams();
  const { data: clubs } = useCached("clubs:epl", 7 * DAY, () => fetchTeams(EPL.slug));
  const { data: moves } = useCached("transfers:epl", 30 * 60 * 1000, () => fetchTransactions(EPL.slug));
  const { data: table } = useCached("table:epl", DAY, () => fetchLeagueTable(EPL.slug));
  const { favs, toggle } = useFavorites("epl");
  const [picked, setPicked] = useState(null);

  const club = (clubs || []).find((c) => c.id === id);
  const roster = useRoster("epl:" + id, id, EPL.slug);

  const ins = (moves || []).filter((m) => m.toId === id || (club && m.to === club.name));
  const outs = (moves || []).filter((m) => m.fromId === id || (club && m.from === club.name));
  const clubMoves = [...ins, ...outs];

  const tableRow = table?.rows?.find((r) => r.team.espnId === id || r.team.name === club?.name);
  const tablePos = tableRow ? table.rows.indexOf(tableRow) + 1 : null;

  const profile = useAiContent("club:epl:" + id, () => clubPrompt(club, clubMoves), {
    ttlMs: DAY,
    grounding: true,
  });

  if (!club) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        <p className="pulse" style={{ color: "var(--muted)" }}>
          Loading club… <Link to="/epl/clubs">All clubs</Link>
        </p>
      </div>
    );
  }

  const MoveList = ({ title, list, dir }) =>
    list.length > 0 && (
      <>
        <h4 className="eyebrow" style={{ margin: "10px 0 4px" }}>{title}</h4>
        <ul className="squad">
          {list.map((m, i) => (
            <li key={m.player + i} style={{ fontSize: 13, padding: "5px 0", borderTop: "1px solid var(--line)", listStyle: "none" }}>
              <b>{m.player}</b>{" "}
              <span style={{ color: "var(--muted)" }}>
                {dir === "in" ? `from ${m.from || "free agency"}` : `to ${m.to}`}
                {m.fee ? ` · ${m.fee}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </>
    );

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/epl/clubs" style={{ fontSize: 13, textDecoration: "none" }}>← All clubs</Link>

      <div className="card" style={{ padding: 16, margin: "10px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {club.logo && <img src={club.logo} alt="" width={44} height={44} style={{ objectFit: "contain" }} />}
            <div>
              <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{club.name.toUpperCase()}</div>
              <div className="eyebrow">{EPL.name} · {EPL.season.label}</div>
            </div>
          </div>
          <button
            className={"iconbtn" + (favs.includes(id) ? " on" : "")}
            onClick={() => toggle(id)}
            aria-label={favs.includes(id) ? "Remove from your clubs" : "Add to your clubs"}
          >
            {favs.includes(id) ? "★" : "☆"}
          </button>
        </div>

        {(tablePos || tableRow) && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            {tablePos && <PositionBadge pos={tablePos} />}
            {tableRow && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                P{tableRow.p} W{tableRow.w} D{tableRow.d} L{tableRow.l} ·{" "}
                <span style={{ color: "var(--chalk)" }}>{tableRow.pts} pts</span> ·{" "}
                GD {tableRow.gf - tableRow.ga > 0 ? "+" : ""}{tableRow.gf - tableRow.ga}
              </div>
            )}
          </div>
        )}
      </div>

      <AiCard title={`${club.name} right now`} ai={profile} cta="✨ Club profile" />

      {(ins.length > 0 || outs.length > 0) && (
        <>
          <h2 className="disp section-h">THIS WINDOW</h2>
          <div className="card" style={{ padding: "6px 14px 12px" }}>
            <MoveList title={`In (${ins.length})`} list={ins} dir="in" />
            <MoveList title={`Out (${outs.length})`} list={outs} dir="out" />
          </div>
        </>
      )}
      {ins.length === 0 && outs.length === 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
          No confirmed moves this window yet. Check the{" "}
          <Link to="/epl">transfers page</Link> for the latest deals and rumors.
        </div>
      )}

      <h2 className="disp section-h">SQUAD</h2>
      <div className="card" style={{ padding: "6px 14px 12px" }}>
        <SquadList {...roster} onPick={setPicked} emptyNote="Squad list isn't available from the feed right now." />
      </div>

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 20px" }}>
        {EPL.season.label} fixtures and results will appear once the schedule is released.
      </p>

      {picked && (
        <PlayerSheet player={picked} team={{ code: "epl:" + id, flag: "", name: club.name }} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}
