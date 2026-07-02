import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AiCard from "../../components/AiCard.jsx";
import SquadList from "../../components/SquadList.jsx";
import PlayerSheet from "../../components/PlayerSheet.jsx";
import { MatchTabsBar } from "../../components/MatchDetailShared.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueClubs, fetchLeagueTable, fetchClubSquad, fetchClubTransfers, fetchClubInjuries, fetchClubInfo, fetchClubSeasonHistory } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { clubSeasonPrompt } from "../../lib/prompts.js";

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

const ordinal = (n) => {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][Math.min(n % 10, 4)] || "th"}`;
};

/* "2021" → "2021-22" — API-Football seasons are the starting year. */
const seasonLabel = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;

/* Founded / ground / capacity, straight from the data feed — no AI needed. */
function FactsCard({ info, club }) {
  const facts = [
    info?.founded && ["Founded", String(info.founded)],
    (info?.venue || club.venue) && [
      "Ground",
      `${info?.venue || club.venue}${info?.capacity ? ` · ${info.capacity.toLocaleString("en-IN")} seats` : ""}`,
    ],
    (info?.city || club.city) && ["City", [info?.city || club.city, info?.country].filter(Boolean).join(", ")],
  ].filter(Boolean);
  if (!facts.length) return null;
  return (
    <div className="card" style={{ padding: "10px 14px", marginBottom: 10 }}>
      {facts.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 13 }}>
          <span style={{ color: "var(--muted)" }}>{k}</span>
          <span style={{ fontWeight: 600, textAlign: "right" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* Finishing position in each of the last five completed seasons. A dash means
   the club wasn't in this division (or competition) that year. */
function SeasonStrip({ history }) {
  if (!history?.length || !history.some((h) => h.pos)) return null;
  return (
    <>
      <h2 className="disp section-h">LAST FIVE SEASONS</h2>
      <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {history.map((h) => (
            <div key={h.season} style={{ flex: 1, textAlign: "center", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 2px" }}>
              <div className="disp" style={{ fontSize: 17, fontWeight: 800, color: h.pos ? "var(--chalk)" : "var(--muted)" }}>
                {h.pos ? ordinal(h.pos) : "—"}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.04em" }}>{seasonLabel(h.season)}</div>
            </div>
          ))}
        </div>
        {history.some((h) => !h.pos) && (
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>— not in this competition that season</p>
        )}
      </div>
    </>
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
  // Three-state readiness suffix: no club yet / apif id / espn id — the key
  // must flip when the club loads either way, or the pre-club [] would stick.
  const idKind = club ? (apifId ? "a" : "e") : "n";
  // 6h, not a day: during the transfer window the squads endpoint churns, and
  // new signings should show up the same day they're announced.
  const squad = useCached(`squad:${C.id}:${id}:${idKind}`, 6 * 60 * 60 * 1000, () =>
    club ? fetchClubSquad(C.slug, id, club.src) : Promise.resolve([])
  );
  const injuries = useCached(`clubinjuries:${C.id}:${id}:${apifId ? "a" : "n"}`, 6 * 60 * 60 * 1000, () =>
    apifId ? fetchClubInjuries(C.slug, id) : Promise.resolve([])
  );
  const { data: info } = useCached(`clubinfo:${C.id}:${id}:${apifId ? "a" : "n"}`, 30 * DAY, () =>
    apifId ? fetchClubInfo(C.slug, id) : Promise.resolve(null)
  );
  // 30 minutes, not days: each past season's table is cached for months under
  // its own key, so rebuilding the strip is free — but a season that failed to
  // load (and was dropped) gets retried instead of staying missing for weeks.
  // ("clubseasons2" evicts v1 entries that cached wrong dashes for 30 days.)
  const { data: history } = useCached(`clubseasons2:${C.id}:${id}:${apifId ? "a" : "n"}`, 30 * 60 * 1000, () =>
    apifId ? fetchClubSeasonHistory(C.slug, id) : Promise.resolve([])
  );
  const { favs, toggle } = useFavorites(C.id);
  const [picked, setPicked] = useState(null);

  const ins = (moves || []).filter((m) => m.toId === id || (club && m.to === club.name));
  const outs = (moves || []).filter((m) => m.fromId === id || (club && m.from === club.name));
  const clubMoves = [...ins, ...outs];

  // API-Football's squads endpoint lags the transfer window by days — its own
  // transfers feed is fresher. Anyone confirmed as leaving this window is
  // dropped from the squad list rather than shown as a current player.
  // Name matching must survive the feed's two name styles ("A. Robertson" in
  // squads vs "Andrew Robertson" in transfers): equal full names, or same
  // surname plus matching first initial.
  const nameParts = (n) =>
    (n || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\./g, "").split(/\s+/).filter(Boolean);
  const samePlayer = (a, b) => {
    const pa = nameParts(a);
    const pb = nameParts(b);
    if (!pa.length || !pb.length) return false;
    if (pa.join(" ") === pb.join(" ")) return true;
    return pa[pa.length - 1] === pb[pb.length - 1] && pa[0][0] === pb[0][0];
  };
  const squadPlayers = outs.length
    ? (squad.data || []).filter((p) => !outs.some((m) => samePlayer(p.name, m.player)))
    : squad.data;

  const tableRow = table?.rows?.find(
    (r) => (r.team.apifId && String(r.team.apifId) === String(id)) || r.team.espnId === id || r.team.name === club?.name
  );
  const tablePos = tableRow ? table.rows.indexOf(tableRow) + 1 : null;

  // AI earns its place only once the season is underway: the static facts
  // render by default, the story of the season can't be looked up in a feed.
  const seasonOn = !!tableRow && tableRow.p > 0;
  const story = useAiContent(
    // played-count in the key so the story refreshes as the season moves on
    seasonOn ? `clubseason:${C.id}:${id}:p${tableRow.p}` : null,
    () =>
      seasonOn &&
      clubSeasonPrompt(club, C.name, C.season.label, tableRow, tablePos, table.rows.length, C.zones, clubMoves),
    { ttlMs: DAY, grounding: true }
  );

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
          <FactsCard info={info} club={club} />
          <SeasonStrip history={history} />

          {seasonOn && <AiCard title={`${club.name}'s season`} ai={story} cta="✨ Season so far" />}

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
        </>
      )}

      {tab === "squad" && (
        <>
          <div className="card" style={{ padding: "6px 14px 12px" }}>
            <SquadList players={squadPlayers} loading={squad.loading} onPick={setPicked} emptyNote="Squad list isn't available from the feed right now." />
          </div>
          {(squadPlayers?.length ?? 0) > 0 && (
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 20px" }}>
              Squad from the structured feed — confirmed departures this window are filtered out,
              but brand-new deals can take a few days to register. A player's ✨ profile has the
              latest word on any move.
            </p>
          )}
        </>
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
