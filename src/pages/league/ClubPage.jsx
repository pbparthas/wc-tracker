import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AiCard from "../../components/AiCard.jsx";
import SquadList from "../../components/SquadList.jsx";
import PlayerSheet from "../../components/PlayerSheet.jsx";
import { MatchTabsBar } from "../../components/MatchDetailShared.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueClubs, fetchLeagueTable, fetchClubSquad, fetchClubTransfers, fetchClubInjuries } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { clubPrompt } from "../../lib/prompts.js";

const DAY = 24 * 60 * 60 * 1000;

/* Same coloured bands as the league table (zones are `{ upTo }` / `{ from }`
   entries, top-down), so the badge always agrees with the table page. */
function bandOf(pos, bands) {
  for (const b of bands || []) {
    if (b.upTo != null && pos <= b.upTo) return b;
    if (b.from != null && pos >= b.from) return b;
  }
  return null;
}

function PositionBadge({ pos, zones, seasonLabel }) {
  const band = bandOf(pos, zones);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "var(--bg)", border: "1px solid var(--line)",
      borderRadius: 10, padding: "6px 12px",
    }}>
      <span className="disp" style={{ fontSize: 22, fontWeight: 800, color: band?.color || "var(--muted)" }}>{pos}</span>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        <div style={{ fontWeight: 600 }}>{band?.label || "Mid-table"}</div>
        <div>{seasonLabel}</div>
      </div>
    </div>
  );
}

function InjuryList({ injuries, loading, clubName }) {
  if (loading && !injuries) {
    return <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, padding: "10px 0" }}>Checking the treatment room…</p>;
  }
  if (!injuries?.length) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13, padding: "10px 0" }}>
        No reported injuries or suspensions for {clubName} right now.
      </p>
    );
  }
  const when = (d) => {
    const t = new Date(d);
    return isNaN(t) ? "" : t.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {injuries.map((i, idx) => (
        <li key={i.player + idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
          {i.photo ? (
            <img src={i.photo} alt="" width={30} height={30} loading="lazy" style={{ borderRadius: "50%", objectFit: "cover", background: "var(--bg)" }} />
          ) : (
            <span style={{ width: 30, textAlign: "center" }}>🩹</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{i.player}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {[i.type, i.reason].filter(Boolean).join(" · ") || "Unavailable"}
              {i.date ? ` · ${when(i.date)}` : ""}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ClubPage() {
  const { comp, id } = useParams();
  const C = COMPETITIONS[comp] || COMPETITIONS.epl;
  const [tab, setTab] = useState("overview");
  const { data: clubs } = useCached(`clubs:${C.id}:af`, 7 * DAY, () => fetchLeagueClubs(C.slug));
  const club = (clubs || []).find((c) => String(c.id) === String(id));
  // ESPN and API-Football ids collide numerically: an ESPN-sourced id must never
  // hit API-Football endpoints or we'd show a different club's squad/transfers.
  // Legacy caches lack src — those lists came from the APIF path, so treat
  // missing src as apif.
  const apifId = club ? club.src !== "espn" : false;
  // apifId is part of the cache key: useCached captures its fetcher per key, so
  // gating inside the fetcher alone would cache [] from before the clubs list
  // loaded and never retry. A key flip re-runs the fetch with a fresh closure.
  const { data: moves } = useCached(`clubtransfers:${C.id}:${id}:${apifId ? "a" : "n"}`, 30 * 60 * 1000, () =>
    apifId ? fetchClubTransfers(C.slug, id, { sinceIso: C.window.opensIso }) : Promise.resolve([])
  );
  const { data: table } = useCached(`table:${C.id}`, DAY, () => fetchLeagueTable(C.slug));
  const squad = useCached(`squad:${C.id}:${id}:${apifId ? "a" : "n"}`, DAY, () =>
    apifId ? fetchClubSquad(C.slug, id) : Promise.resolve([])
  );
  const injuries = useCached(`clubinjuries:${C.id}:${id}:${apifId ? "a" : "n"}`, 6 * 60 * 60 * 1000, () =>
    apifId ? fetchClubInjuries(C.slug, id) : Promise.resolve([])
  );
  const { favs, toggle } = useFavorites(C.id);
  const [picked, setPicked] = useState(null);

  const ins = (moves || []).filter((m) => m.toId === id || (club && m.to === club.name));
  const outs = (moves || []).filter((m) => m.fromId === id || (club && m.from === club.name));
  const clubMoves = [...ins, ...outs];

  const tableRow = table?.rows?.find((r) => r.team.espnId === id || r.team.name === club?.name);
  const tablePos = tableRow ? table.rows.indexOf(tableRow) + 1 : null;

  const profile = useAiContent(`club:${C.id}:` + id, () => clubPrompt(club, clubMoves), {
    ttlMs: DAY,
    grounding: true,
  });

  if (!club) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        <p className="pulse" style={{ color: "var(--muted)" }}>
          Loading club… <Link to={`/league/${C.id}/clubs`}>All clubs</Link>
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

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "squad", label: "Squad" },
    { id: "injuries", label: "Injuries" },
  ];

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to={`/league/${C.id}/clubs`} style={{ fontSize: 13, textDecoration: "none" }}>← All clubs</Link>

      <div className="card" style={{ padding: 16, margin: "10px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {club.logo && <img src={club.logo} alt="" width={44} height={44} style={{ objectFit: "contain" }} />}
            <div>
              <div className="disp" style={{ fontSize: 22, fontWeight: 800 }}>{club.name.toUpperCase()}</div>
              <div className="eyebrow">{C.name} · {C.season.label}</div>
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
            {tablePos && <PositionBadge pos={tablePos} zones={C.zones} seasonLabel={C.season.label} />}
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

      <MatchTabsBar tabs={tabs} active={tab} onTab={setTab} />

      {tab === "overview" && (
        <>
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
              No confirmed moves in the structured feed yet — it can lag official announcements
              by a few days. The <Link to={`/league/${C.id}`}>transfers page</Link> AI round-up
              usually has the very latest deals and rumors.
            </div>
          )}

          <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 20px" }}>
            {C.season.label} fixtures and results will appear once the schedule is released.
          </p>
        </>
      )}

      {tab === "squad" && (
        <div className="card" style={{ padding: "6px 14px 12px", marginBottom: 20 }}>
          <SquadList players={squad.data} loading={squad.loading} error={squad.error} onPick={setPicked} emptyNote="Squad list isn't available from the feed right now." />
        </div>
      )}

      {tab === "injuries" && (
        <div className="card" style={{ padding: "6px 14px 12px", marginBottom: 20 }}>
          <InjuryList injuries={injuries.data} loading={injuries.loading} clubName={club.name} />
        </div>
      )}

      {picked && (
        <PlayerSheet player={picked} team={{ code: `${C.id}:` + id, flag: "", name: club.name }} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}
