import React, { useState } from "react";
import { liveWinProbability, parseMatchMinute } from "../lib/winprob.js";

const ICONS = { goal: "⚽", og: "⚽", pen: "⚽", miss: "❌", yellow: "🟨", red: "🟥", sub: "🔁", event: "•" };

function isTeam(ev, team) {
  if (!ev.team) return false;
  return ev.team.name === team.name
    || (ev.team.code && ev.team.code === team.code)
    || (ev.team.espnId && ev.team.espnId === team.espnId);
}

function nameMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.split(" ").pop().toLowerCase() === b.split(" ").pop().toLowerCase();
}

function playerMatchEvents(player, events) {
  return (events || []).filter((e) => e.player && nameMatch(e.player, player.name) && e.kind !== "event");
}

function shortName(name) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0];
  return parts[0][0] + ". " + parts.slice(1).join(" ");
}

/* ── Goal scorers + red cards under the score ─────────────────────── */

export function EventSummary({ events, match }) {
  const wentToPens = match?.phg != null && match?.pag != null;
  if (!events?.length && !wentToPens) return null;
  const evs = events || [];
  // A shootout kick: explicitly flagged, or (when the match went to pens) a
  // penalty/miss timestamped in the shootout (120+). Kept OUT of the regulation
  // goal list — otherwise a 1-1 that went to penalties looks like a 6-6.
  const isShoot = (e) =>
    e.shootout === true ||
    (wentToPens && ["pen", "miss"].includes(e.kind) && /^120/.test(String(e.minute || "")));
  const goals = evs.filter((e) => ["goal", "og", "pen"].includes(e.kind) && !isShoot(e));
  const reds = evs.filter((e) => e.kind === "red" && !isShoot(e));
  const shoot = evs.filter((e) => ["pen", "miss"].includes(e.kind) && isShoot(e));
  if (!goals.length && !reds.length && !shoot.length && !wentToPens) return null;

  // Own-goal side: API-Football tags an og with the team CREDITED with the
  // goal (an Egyptian og arrives tagged Australia), so the feed's team IS the
  // side to show it on — flipping it painted the goal on the wrong side of
  // the scoreboard. Some sources tag the scorer's team instead, so as a
  // safety net: if the split disagrees with the score and flipping own goals
  // reconciles it, flip.
  const splitGoals = (flipOg) => ({
    home: goals.filter((e) => (e.kind === "og" && flipOg ? !isTeam(e, match.home) : isTeam(e, match.home))),
    away: goals.filter((e) => (e.kind === "og" && flipOg ? !isTeam(e, match.away) : isTeam(e, match.away))),
  });
  let { home: homeGoals, away: awayGoals } = splitGoals(false);
  if (match.hg != null && goals.some((e) => e.kind === "og")) {
    const agrees = (s) => s.home.length === match.hg && s.away.length === match.ag;
    if (!agrees({ home: homeGoals, away: awayGoals })) {
      const flipped = splitGoals(true);
      if (agrees(flipped)) ({ home: homeGoals, away: awayGoals } = flipped);
    }
  }
  const homeReds = reds.filter((e) => isTeam(e, match.home));
  const awayReds = reds.filter((e) => isTeam(e, match.away));

  const Row = ({ icon, player, minute, suffix, align }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      {align === "left" && <span>{icon}</span>}
      <span>{player} {minute}{suffix}</span>
      {align === "right" && <span>{icon}</span>}
    </div>
  );

  return (
    <>
      {(homeGoals.length > 0 || awayGoals.length > 0 || homeReds.length > 0 || awayReds.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          <div>
            {homeGoals.map((e, i) => <Row key={"hg" + i} icon="⚽" player={e.player} minute={e.minute} suffix={e.kind === "og" ? " (og)" : e.kind === "pen" ? " (p)" : ""} align="left" />)}
            {homeReds.map((e, i) => <Row key={"hr" + i} icon="🟥" player={e.player} minute={e.minute} suffix="" align="left" />)}
          </div>
          <div>
            {awayGoals.map((e, i) => <Row key={"ag" + i} icon="⚽" player={e.player} minute={e.minute} suffix={e.kind === "og" ? " (og)" : e.kind === "pen" ? " (p)" : ""} align="right" />)}
            {awayReds.map((e, i) => <Row key={"ar" + i} icon="🟥" player={e.player} minute={e.minute} suffix="" align="right" />)}
          </div>
        </div>
      )}
      {(wentToPens || shoot.length > 0) && <ShootoutBlock shoot={shoot} match={match} />}
    </>
  );
}

/* Penalty shootout: each kick scored (✓) or missed (✗), with the result. */
function ShootoutBlock({ shoot, match }) {
  const homeKicks = shoot.filter((e) => isTeam(e, match.home));
  const awayKicks = shoot.filter((e) => isTeam(e, match.away));
  const scored = (list) => list.filter((e) => e.kind === "pen").length;
  const ph = match?.phg ?? scored(homeKicks);
  const pa = match?.pag ?? scored(awayKicks);
  const winner = ph > pa ? match.home?.name : pa > ph ? match.away?.name : null;
  const Kick = ({ e, align }) => (
    <div style={{ display: "flex", gap: 5, justifyContent: align === "right" ? "flex-end" : "flex-start", color: e.kind === "pen" ? "var(--chalk)" : "var(--muted)" }}>
      {align === "left" && <span>{e.kind === "pen" ? "✅" : "❌"}</span>}
      <span>{shortName(e.player)}</span>
      {align === "right" && <span>{e.kind === "pen" ? "✅" : "❌"}</span>}
    </div>
  );
  return (
    <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--saffron)", textAlign: "center", marginBottom: 6, fontWeight: 700 }}>
        PENALTY SHOOTOUT · {ph}–{pa}{winner ? ` · ${winner} ADVANCE` : ""}
      </div>
      {homeKicks.length || awayKicks.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", fontSize: 12 }}>
          <div>{homeKicks.map((e, i) => <Kick key={"hk" + i} e={e} align="left" />)}</div>
          <div>{awayKicks.map((e, i) => <Kick key={"ak" + i} e={e} align="right" />)}</div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>Kick-by-kick detail not available for this match.</div>
      )}
    </div>
  );
}

/* ── Player info overlay (Google-style bottom sheet) ─────────────── */

function findStat(stats, ...keys) {
  for (const k of keys) {
    if (stats[k] !== undefined && stats[k] !== null) return stats[k];
  }
  return undefined;
}

function PlayerInfo({ player, events, subMinute, playerStats, match, onClose }) {
  const evs = events.filter((e) => e.kind !== "event");
  const stats = playerStats?.[player.name] || {};
  const rating = stats.rating != null ? parseFloat(stats.rating) : null;
  const statRows = [
    subMinute ? ["Substitution time", null, subMinute] : null,
    ["Minutes played", findStat(stats, "minutesPlayed", "MIN", "minutes")],
    ["Accurate passes", findStat(stats, "totalPasses", "passCompletions", "accuratePasses", "PC")],
    ["Goals", findStat(stats, "goals", "G", "totalGoals")],
    ["Assists", findStat(stats, "assists", "A")],
    ["Shots", findStat(stats, "totalShots", "shots", "SH", "SHT")],
    ["Shots on target", findStat(stats, "shotsOnTarget", "SOT", "ST")],
    ["Tackles won", findStat(stats, "tackles", "TK", "tacklesWon")],
    ["Fouls", findStat(stats, "foulsCommitted", "fouls", "FC", "FL")],
    ["Yellow cards", findStat(stats, "yellowCards", "YC")],
    ["Red cards", findStat(stats, "redCards", "RC")],
    ["Saves", findStat(stats, "saves", "SV")],
  ].filter(Boolean).filter(([, v, v2]) => (v2 !== undefined) || (v !== undefined && v !== null));

  return (
    <div className="card" style={{ padding: 0, marginTop: 10, marginBottom: 10, overflow: "hidden" }}>
      {/* Header with player photo + name */}
      <div style={{ background: "rgba(255,255,255,0.04)", padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 14 }}>
        {player.headshot ? (
          <img src={player.headshot} alt="" width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, background: "#222", border: "2px solid var(--line)" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--pitch)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, flexShrink: 0, border: "2px solid var(--line)" }}>
            {player.jersey || "?"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{shortName(player.name)}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {player.jersey ? `#${player.jersey}` : ""}{player.pos ? ` · ${player.pos}` : ""}
          </div>
        </div>
        {rating != null && !Number.isNaN(rating) && (
          <div style={{ textAlign: "center", flexShrink: 0, marginRight: 4 }}>
            <div style={{
              background: ratingColor(rating), borderRadius: 8,
              minWidth: 42, padding: "6px 8px", fontSize: 18, fontWeight: 800, color: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            }}>
              {rating.toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3, letterSpacing: "0.04em" }}>RATING</div>
          </div>
        )}
        <button style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", padding: 6, lineHeight: 1 }} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Match context line */}
      {match && (
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)", fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
          {match.home?.logo && <img src={match.home.logo} alt="" width={16} height={16} style={{ borderRadius: 2, objectFit: "contain" }} />}
          <span>{match.home?.name || "Home"}</span>
          <span style={{ fontWeight: 700, color: "var(--chalk)" }}>{match.hg ?? "?"} – {match.ag ?? "?"}</span>
          <span>{match.away?.name || "Away"}</span>
          {match.away?.logo && <img src={match.away.logo} alt="" width={16} height={16} style={{ borderRadius: 2, objectFit: "contain" }} />}
          <span style={{ marginLeft: "auto", fontSize: 12 }}>{match.status || ""}</span>
        </div>
      )}

      {/* Match events for this player */}
      {evs.length > 0 && (
        <div style={{ padding: "0 16px", borderTop: "1px solid var(--line)" }}>
          {evs.map((e, i) => (
            <div key={i} style={{ fontSize: 13, padding: "10px 0", display: "flex", gap: 8, alignItems: "center", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: 14 }}>{ICONS[e.kind] || "•"}</span>
              <span style={{ flex: 1 }}>{e.label}</span>
              <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{e.minute}</span>
            </div>
          ))}
        </div>
      )}

      {/* Match stats */}
      <div style={{ padding: "0 16px", borderTop: "1px solid var(--line)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, padding: "12px 0 6px" }}>Match stats</div>
        {statRows.length > 0 ? statRows.map(([label, val, alt]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <span>{label}</span>
            <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              {label === "Substitution time" && <span style={{ color: "var(--live)", fontSize: 13 }}>↓</span>}
              {alt || val}
            </span>
          </div>
        )) : (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "10px 0" }}>No detailed stats available.</div>
        )}
      </div>

      <div style={{ height: 8 }} />
    </div>
  );
}

/* ── Team header bar (Google style) ──────────────────────────────── */

function TeamHeader({ side, position }) {
  if (!side) return null;
  const isTop = position === "top";
  return (
    <div style={{
      background: "rgba(0,0,0,0.35)",
      borderRadius: isTop ? "12px 12px 0 0" : "0 0 12px 12px",
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {side.team?.logo && (
          <img src={side.team.logo} alt="" width={22} height={22} style={{ borderRadius: 2, objectFit: "contain", flexShrink: 0 }} />
        )}
        <span style={{ fontWeight: 700, fontSize: 14, color: "#fff", flex: 1 }}>
          {side.team?.name || "Team"}
        </span>
        {side.formation && (
          <span style={{
            background: "#2e7d32", color: "#fff", fontSize: 12, fontWeight: 700,
            padding: "3px 10px", borderRadius: 12, letterSpacing: "0.03em",
          }}>
            {side.formation}
          </span>
        )}
      </div>
      {side.coach && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, paddingLeft: 32 }}>
          {side.coachPhoto && (
            <img src={side.coachPhoto} alt="" width={20} height={20} loading="lazy"
              style={{ borderRadius: "50%", objectFit: "cover", background: "#333", flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Coach: {side.coach}</span>
        </div>
      )}
    </div>
  );
}

/* ── Single player dot on the pitch ───────────────────────────────── */

function ratingColor(r) {
  const n = parseFloat(r);
  if (Number.isNaN(n)) return "#555";
  if (n >= 8) return "#1f8f3a";   // green
  if (n >= 7) return "#3a7d2e";   // olive-green
  if (n >= 6) return "#b58a1e";   // amber
  return "#b5421e";               // red-ish
}

function PlayerDot({ player, events, subMinute, rating, picked, onPick, imgErrors, onImgErr }) {
  const hasPhoto = player.headshot && !imgErrors.has(player.name);
  const pEvs = playerMatchEvents(player, events);
  const goalCount = pEvs.filter((e) => ["goal", "pen"].includes(e.kind)).length;
  const hasYellow = pEvs.some((e) => e.kind === "yellow");
  const hasRed = pEvs.some((e) => e.kind === "red");
  const isSelected = picked?.name === player.name;
  const ratingNum = rating != null ? parseFloat(rating) : null;

  return (
    <div
      style={{ textAlign: "center", flex: "0 0 auto", minWidth: 0, position: "relative", cursor: "pointer", padding: "0 2px" }}
      onClick={() => onPick(isSelected ? null : player)}
    >
      {/* Sub arrow badge */}
      {subMinute && (
        <div style={{
          position: "absolute", top: -3, right: 2, zIndex: 2,
          background: "#d32f2f", borderRadius: "50%",
          width: 18, height: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "#fff", fontWeight: 700,
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}>{"↓"}</div>
      )}
      {/* Yellow card badge */}
      {hasYellow && !hasRed && (
        <div style={{
          position: "absolute", top: -3, left: 2, zIndex: 2,
          width: 14, height: 18, borderRadius: 2,
          background: "#fdd835", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }} />
      )}
      {/* Red card badge */}
      {hasRed && (
        <div style={{
          position: "absolute", top: -3, left: 2, zIndex: 2,
          width: 14, height: 18, borderRadius: 2,
          background: "#d32f2f", boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }} />
      )}
      {/* Goal badge */}
      {goalCount > 0 && (
        <div style={{
          position: "absolute", bottom: 18, right: 0, zIndex: 2,
          background: "rgba(0,0,0,0.6)", borderRadius: 8,
          padding: "1px 4px", fontSize: 10,
          display: "flex", alignItems: "center", gap: 2,
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}>
          {"⚽"}{goalCount > 1 && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{goalCount}</span>}
        </div>
      )}
      {/* Rating badge (API-Football match rating) */}
      {ratingNum != null && !Number.isNaN(ratingNum) && (
        <div style={{
          position: "absolute", bottom: 16, left: -2, zIndex: 3,
          background: ratingColor(ratingNum), borderRadius: 5,
          minWidth: 22, padding: "1px 3px", fontSize: 10, fontWeight: 800,
          color: "#fff", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}>
          {ratingNum.toFixed(1)}
        </div>
      )}

      {/* Player circle */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
        margin: "0 auto 4px",
        background: hasPhoto ? "#1a3a25" : "rgba(255,255,255,0.13)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: isSelected ? "2.5px solid var(--saffron)" : "2.5px solid rgba(255,255,255,0.55)",
        fontSize: 18, fontWeight: 700, color: "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
      }}>
        {hasPhoto ? (
          <img src={player.headshot} alt="" width={48} height={48} loading="lazy" style={{ objectFit: "cover" }} onError={() => onImgErr(player.name)} />
        ) : (
          player.jersey || "?"
        )}
      </div>
      {/* Player name */}
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: "rgba(255,255,255,0.92)",
        maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        margin: "0 auto", lineHeight: 1.3,
      }}>
        {player.jersey ? player.jersey + " " : ""}{player.name.split(" ").pop()}
      </div>
    </div>
  );
}

/* ── Parse formation into display rows ────────────────────────────── */

function parseFormation(side) {
  if (!side?.starters?.length || !side.formation) return null;
  const rows = side.formation.split("-").map(Number).filter((n) => n > 0);
  if (!rows.length) return null;
  const gk = side.starters[0];
  const outfield = side.starters.slice(1);
  let idx = 0;
  const fRows = rows.map((count) => {
    const players = outfield.slice(idx, idx + count);
    idx += count;
    return players;
  });
  return { gk, formationRows: fRows };
}

function buildSubMap(side, events) {
  const subMap = new Map();
  if (!side || !events) return subMap;
  const teamSubs = events.filter((e) => e.kind === "sub" && isTeam(e, side.team));
  for (const e of teamSubs) {
    if (e.playerOut) {
      const found = side.starters.find((s) => !subMap.has(s.name) && nameMatch(e.playerOut, s.name));
      if (found) { subMap.set(found.name, e.minute); continue; }
    }
    for (const s of side.starters) {
      if (subMap.has(s.name)) continue;
      if (nameMatch(e.player, s.name)) { subMap.set(s.name, e.minute); continue; }
      const txt = (e.text || "").toLowerCase();
      if (!txt) continue;
      const parts = s.name.split(" ");
      const lastName = parts[parts.length - 1].toLowerCase();
      if (lastName.length >= 3 && txt.includes(lastName)) subMap.set(s.name, e.minute);
    }
  }
  return subMap;
}

/* ── Full pitch: both teams on one continuous field ────────────────── */

export function PitchView({ home, away, events, playerStats, match }) {
  const [imgErrors, setImgErrors] = useState(new Set());
  const [picked, setPicked] = useState(null);

  const hp = parseFormation(home);
  const ap = parseFormation(away);
  if (!hp && !ap) return null;

  const homeSubs = buildSubMap(home, events);
  const awaySubs = buildSubMap(away, events);
  const onErr = (name) => setImgErrors((s) => new Set(s).add(name));

  const awayRows = ap ? [[ap.gk], ...ap.formationRows] : [];
  const homeRows = hp ? [...hp.formationRows.reverse(), [hp.gk]] : [];

  const renderRow = (row, subMap) => (
    <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "center", position: "relative", zIndex: 1, padding: "0 4px" }}>
      {row.map((p, pi) => (
        <PlayerDot
          key={p.name + pi}
          player={p}
          events={events}
          subMinute={subMap.get(p.name)}
          rating={playerStats?.[p.name]?.rating}
          picked={picked}
          onPick={setPicked}
          imgErrors={imgErrors}
          onImgErr={onErr}
        />
      ))}
    </div>
  );

  return (
    <>
      <div style={{
        position: "relative",
        background: "linear-gradient(180deg, #1a5c2a 0%, #1f6e31 20%, #237a38 50%, #1f6e31 80%, #1a5c2a 100%)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {/* Pitch markings */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: "2px solid rgba(255,255,255,0.18)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 60, height: 60, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.15)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
        {/* Top penalty area */}
        <div style={{ position: "absolute", left: "20%", right: "20%", top: 0, height: "8%", borderBottom: "1.5px solid rgba(255,255,255,0.15)", borderLeft: "1.5px solid rgba(255,255,255,0.15)", borderRight: "1.5px solid rgba(255,255,255,0.15)" }} />
        <div style={{ position: "absolute", left: "32%", right: "32%", top: 0, height: "4%", borderBottom: "1.5px solid rgba(255,255,255,0.12)", borderLeft: "1.5px solid rgba(255,255,255,0.12)", borderRight: "1.5px solid rgba(255,255,255,0.12)" }} />
        {/* Bottom penalty area */}
        <div style={{ position: "absolute", left: "20%", right: "20%", bottom: 0, height: "8%", borderTop: "1.5px solid rgba(255,255,255,0.15)", borderLeft: "1.5px solid rgba(255,255,255,0.15)", borderRight: "1.5px solid rgba(255,255,255,0.15)" }} />
        <div style={{ position: "absolute", left: "32%", right: "32%", bottom: 0, height: "4%", borderTop: "1.5px solid rgba(255,255,255,0.12)", borderLeft: "1.5px solid rgba(255,255,255,0.12)", borderRight: "1.5px solid rgba(255,255,255,0.12)" }} />

        {/* Away team header */}
        <TeamHeader side={away} position="top" />

        {/* Away half */}
        {awayRows.length > 0 && (
          <div style={{ padding: "20px 6px 14px", display: "flex", flexDirection: "column", gap: 32 }}>
            {awayRows.map((row, ri) => <React.Fragment key={"a" + ri}>{renderRow(row, awaySubs)}</React.Fragment>)}
          </div>
        )}

        {/* Home half */}
        {homeRows.length > 0 && (
          <div style={{ padding: "14px 6px 20px", display: "flex", flexDirection: "column", gap: 32 }}>
            {homeRows.map((row, ri) => <React.Fragment key={"h" + ri}>{renderRow(row, homeSubs)}</React.Fragment>)}
          </div>
        )}

        {/* Home team header */}
        <TeamHeader side={home} position="bottom" />
      </div>

      {picked && (
        <PlayerInfo
          player={picked}
          events={playerMatchEvents(picked, events)}
          subMinute={homeSubs.get(picked.name) || awaySubs.get(picked.name)}
          playerStats={playerStats}
          match={match}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

/* ── Bench list ───────────────────────────────────────────────────── */

export function BenchList({ home, away, events, playerStats }) {
  const [imgErrors, setImgErrors] = useState(new Set());
  const [picked, setPicked] = useState(null);
  const homeSubs = home?.subs || [];
  const awaySubs = away?.subs || [];
  if (!homeSubs.length && !awaySubs.length) return null;
  const onErr = (name) => setImgErrors((s) => new Set(s).add(name));

  const renderPlayer = (p, i) => {
    const hasPhoto = p.headshot && !imgErrors.has(p.name);
    const pEvs = playerMatchEvents(p, events);
    const goalCount = pEvs.filter((e) => ["goal", "pen"].includes(e.kind)).length;
    const isSelected = picked?.name === p.name;
    return (
      <div
        key={p.name + i}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 0", borderTop: "1px solid var(--line)",
          cursor: "pointer", minWidth: 0,
          background: isSelected ? "rgba(255,255,255,0.04)" : "none",
        }}
        onClick={() => setPicked(isSelected ? null : p)}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          background: hasPhoto ? "#222" : "var(--pitch)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "var(--chalk)",
          border: "1.5px solid var(--line)",
        }}>
          {hasPhoto ? (
            <img src={p.headshot} alt="" width={28} height={28} loading="lazy" style={{ objectFit: "cover" }} onError={() => onErr(p.name)} />
          ) : (
            p.jersey || "?"
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.name}
        </div>
        <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          {goalCount > 0 && <span>{"⚽"}</span>}
          {p.subMinute && <span style={{ color: "#4caf50", fontWeight: 600 }}>{"↑"}{p.subMinute}</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: "12px 14px", marginTop: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div className="eyebrow">Bench</div>
        {home?.team?.logo && <img src={home.team.logo} alt="" width={16} height={16} style={{ borderRadius: 2, objectFit: "contain", marginLeft: "auto" }} />}
        {away?.team?.logo && <img src={away.team.logo} alt="" width={16} height={16} style={{ borderRadius: 2, objectFit: "contain" }} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{home?.team?.name || "Home"}</div>
          {homeSubs.map(renderPlayer)}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{away?.team?.name || "Away"}</div>
          {awaySubs.map(renderPlayer)}
        </div>
      </div>
      {picked && (
        <PlayerInfo
          player={picked}
          events={playerMatchEvents(picked, events)}
          subMinute={null}
          playerStats={playerStats}
          onClose={() => setPicked(null)}
        />
      )}
    </div>
  );
}

/* ── Commentary (collapsible) ─────────────────────────────────────── */

export function CommentaryCard({ items }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, 5);
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <button className="ai-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="eyebrow">Commentary · {items.length} updates</span>
        <span className="ai-chev" aria-hidden="true">{open ? "▾ latest only" : "▸ show all"}</span>
      </button>
      <ul className="timeline">
        {shown.map((c, i) => (
          <li key={c.seq || i}>
            <span className="min">{c.minute}</span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Stats with bar charts ────────────────────────────────────────── */

export function StatsCard({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Match stats</div>
      {stats.map((s) => {
        const hv = parseFloat(s.home) || 0;
        const av = parseFloat(s.away) || 0;
        const total = hv + av || 1;
        const hp = (hv / total) * 100;
        const ap = (av / total) * 100;
        return (
          <div key={s.label} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "baseline", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
              <b style={{ textAlign: "left", fontWeight: hv >= av ? 700 : 400, color: hv > av ? "var(--chalk)" : "var(--muted)" }}>{s.home}</b>
              <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>{s.label}</span>
              <b style={{ textAlign: "right", fontWeight: av >= hv ? 700 : 400, color: av > hv ? "var(--chalk)" : "var(--muted)" }}>{s.away}</b>
            </div>
            <div style={{ display: "flex", height: 4, gap: 2, borderRadius: 2 }}>
              <div style={{ width: `${hp}%`, background: hv >= av ? "var(--saffron)" : "var(--line)", borderRadius: 2 }} />
              <div style={{ width: `${ap}%`, background: av > hv ? "var(--saffron)" : "var(--line)", borderRadius: 2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Top performers (man of the match) — needs API-Football ratings ── */

export function TopPerformers({ lineups, playerStats }) {
  if (!lineups || !playerStats) return null;

  const sides = [
    { side: lineups.home, team: lineups.home?.team },
    { side: lineups.away, team: lineups.away?.team },
  ];
  const all = [];
  for (const { side, team } of sides) {
    if (!side) continue;
    for (const p of [...(side.starters || []), ...(side.subs || [])]) {
      const st = playerStats[p.name];
      const r = st?.rating != null ? parseFloat(st.rating) : null;
      if (r == null || Number.isNaN(r)) continue;
      all.push({
        name: p.name, headshot: p.headshot, jersey: p.jersey,
        rating: r, teamName: team?.name || "", teamLogo: team?.logo || null,
        goals: parseInt(st.goals, 10) || 0, assists: parseInt(st.assists, 10) || 0,
      });
    }
  }
  if (!all.length) return null;
  all.sort((a, b) => b.rating - a.rating);
  const top = all.slice(0, 3);

  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>⭐ Top performers</div>
      {top.map((p, i) => (
        <div key={p.name + i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 0", borderTop: i > 0 ? "1px solid var(--line)" : "none",
        }}>
          {p.headshot ? (
            <img src={p.headshot} alt="" width={36} height={36} loading="lazy"
              style={{ borderRadius: "50%", objectFit: "cover", background: "#222", flexShrink: 0, border: "1.5px solid var(--line)" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--pitch)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p.jersey || "?"}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {i === 0 ? "🏅 " : ""}{shortName(p.name)}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              {p.teamLogo && <img src={p.teamLogo} alt="" width={13} height={13} style={{ objectFit: "contain" }} />}
              <span>{p.teamName}</span>
              {p.goals > 0 && <span>· ⚽ {p.goals}</span>}
              {p.assists > 0 && <span>· 🅰 {p.assists}</span>}
            </div>
          </div>
          <div style={{
            background: ratingColor(p.rating), borderRadius: 7,
            minWidth: 40, padding: "5px 7px", fontSize: 15, fontWeight: 800, color: "#fff", textAlign: "center", flexShrink: 0,
          }}>
            {p.rating.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Key stats at a glance (compact, for the overview tab) ─────────── */

const GLANCE_LABELS = ["Possession %", "Shots", "On target", "Expected goals"];

export function MatchGlance({ stats }) {
  if (!stats?.length) return null;
  const rows = stats.filter((s) => GLANCE_LABELS.includes(s.label));
  if (!rows.length) return null;
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>At a glance</div>
      {rows.map((s) => {
        const hv = parseFloat(s.home) || 0;
        const av = parseFloat(s.away) || 0;
        const total = hv + av || 1;
        return (
          <div key={s.label} style={{ padding: "7px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "baseline", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
              <b style={{ textAlign: "left", color: hv > av ? "var(--chalk)" : "var(--muted)" }}>{s.home}</b>
              <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</span>
              <b style={{ textAlign: "right", color: av > hv ? "var(--chalk)" : "var(--muted)" }}>{s.away}</b>
            </div>
            <div style={{ display: "flex", height: 4, gap: 2 }}>
              <div style={{ width: `${(hv / total) * 100}%`, background: hv >= av ? "var(--saffron)" : "var(--line)", borderRadius: 2 }} />
              <div style={{ width: `${(av / total) * 100}%`, background: av > hv ? "var(--saffron)" : "var(--line)", borderRadius: 2 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Win probability + form (API-Football predictions) ───────────── */

export function PredictionsCard({ predictions, homeTeam, awayTeam, match }) {
  // Live matches: shift the pre-match prediction by the current score + minute,
  // so the meter reflects the game in progress instead of a stale kickoff number.
  const minute = match?.state === "in" ? parseMatchMinute(match.status) : null;
  const isLive = match?.state === "in" && minute != null;
  // No pre-match data (the predictions call can fail and load late): during
  // live play the meter still works from score + time with a neutral prior —
  // it must not vanish mid-match. Pre-kickoff there's nothing to show.
  if (!predictions && !isLive) return null;
  const { percent: fetched, advice, homeForm, awayForm } = predictions || {};
  const percent = fetched || { home: "33", draw: "34", away: "33" };
  const live = isLive ? liveWinProbability(percent, match.hg, match.ag, minute) : null;
  const homeW = live ? live.home : parseInt(percent?.home) || 0;
  const draw = live ? live.draw : parseInt(percent?.draw) || 0;
  const awayW = live ? live.away : parseInt(percent?.away) || 0;
  const total = homeW + draw + awayW || 100;
  const lbl = (n) => `${n}%`;
  // A knockout tie can't END drawn — the "draw" probability is the chance of
  // being level after 90, i.e. extra time (and possibly penalties).
  const knockout = /round of|quarter|semi|final|third|knockout|play-off/i.test(match?.stage || "");
  const drawLabel = knockout ? "extra time" : "draw";

  const FormDots = ({ form }) => {
    if (!form) return null;
    return (
      <span style={{ letterSpacing: 2, fontSize: 13, fontWeight: 700 }}>
        {form.slice(-5).split("").map((c, i) => (
          <span key={i} style={{ color: c === "W" ? "#4caf50" : c === "L" ? "#d32f2f" : "#b58a1e" }}>{c}</span>
        ))}
      </span>
    );
  };

  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>🎯 Win probability</span>
        {isLive
          ? <span style={{ color: "var(--live)", fontWeight: 700 }}><span className="pulse">●</span> LIVE · {minute}'</span>
          : <span style={{ color: "var(--muted)", fontWeight: 600 }}>pre-match</span>}
      </div>

      <div style={{ marginBottom: 8 }}>
        {/* Numbers live WITH the names, not on a positional row under the bar —
            a centred "Draw 7%" used to claim the middle of the card even when
            its sliver sat far off to one side, and segment-aligned labels
            collide when two slivers are tiny. The bar alone shows proportion. */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", fontSize: 13, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
          <b style={{ textAlign: "left", color: homeW >= awayW ? "var(--chalk)" : "var(--muted)" }}>
            {homeTeam?.name || "Home"} <span style={{ fontWeight: 800 }}>{lbl(homeW)}</span>
          </b>
          <span style={{ color: "var(--muted)", fontSize: 11, padding: "0 8px", alignSelf: "center" }}>{drawLabel} {lbl(draw)}</span>
          <b style={{ textAlign: "right", color: awayW > homeW ? "var(--chalk)" : "var(--muted)" }}>
            <span style={{ fontWeight: 800 }}>{lbl(awayW)}</span> {awayTeam?.name || "Away"}
          </b>
        </div>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
          <div style={{ width: `${(homeW / total) * 100}%`, background: "#2e7d32" }} />
          <div style={{ width: `${(draw / total) * 100}%`, background: "var(--muted)" }} />
          <div style={{ width: `${(awayW / total) * 100}%`, background: "#1565c0" }} />
        </div>
      </div>

      {isLive && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
          Live estimate from the score &amp; time left — shifts as the game goes.
          {minute >= 85 && match.hg === match.ag && knockout &&
            " Still level at the end: extra time, then penalties if needed."}
        </div>
      )}

      {(homeForm || awayForm) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", borderTop: "1px solid var(--line)", padding: "8px 0", gap: "0 8px" }}>
          <div><FormDots form={homeForm} /></div>
          <span style={{ fontSize: 11, color: "var(--muted)", alignSelf: "center", textAlign: "center" }}>Last 5</span>
          <div style={{ textAlign: "right" }}><FormDots form={awayForm} /></div>
        </div>
      )}

      {advice && !isLive && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13 }}>
          <span style={{ color: "var(--muted)" }}>Tip: </span>{advice}
        </div>
      )}
    </div>
  );
}

/* ── Injuries & suspensions ──────────────────────────────────────── */

export function InjuriesCard({ injuries, homeTeam, awayTeam, homeId, awayId }) {
  if (!injuries?.length) return null;

  const homeName = homeTeam?.name || "";
  const awayName = awayTeam?.name || "";
  // Prefer API-Football team IDs — injury team names ("Korea Republic") don't
  // always match our display names ("South Korea"). Fall back to name match.
  const sideOf = (i) => {
    if (homeId != null && i.teamId === homeId) return "home";
    if (awayId != null && i.teamId === awayId) return "away";
    if (i.team === homeName) return "home";
    if (i.team === awayName) return "away";
    return null;
  };
  const homeInj = injuries.filter((i) => sideOf(i) === "home");
  const awayInj = injuries.filter((i) => sideOf(i) === "away");
  if (!homeInj.length && !awayInj.length) return null;

  const InjPlayer = ({ inj }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
      {inj.photo ? (
        <img src={inj.photo} alt="" width={26} height={26} loading="lazy"
          style={{ borderRadius: "50%", objectFit: "cover", background: "#222", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--pitch)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inj.player}</div>
        {inj.reason && <div style={{ fontSize: 11, color: "var(--muted)" }}>{inj.reason}</div>}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, color: inj.type === "Questionable" ? "#b58a1e" : "#d32f2f" }}>
        {inj.type === "Questionable" ? "?" : "OUT"}
      </span>
    </div>
  );

  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>🏥 Injuries & suspensions</div>
      <div style={{ display: "grid", gridTemplateColumns: homeInj.length && awayInj.length ? "1fr 1fr" : "1fr", gap: "0 16px" }}>
        {homeInj.length > 0 && (
          <div>
            {homeName && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{homeName}</div>}
            {homeInj.map((inj, i) => <InjPlayer key={i} inj={inj} />)}
          </div>
        )}
        {awayInj.length > 0 && (
          <div>
            {awayName && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{awayName}</div>}
            {awayInj.map((inj, i) => <InjPlayer key={i} inj={inj} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Timeline ─────────────────────────────────────────────────────── */

export function TimelineCard({ events }) {
  if (!events?.length) return null;
  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Key events</div>
      <ul className="timeline">
        {events.map((e, i) => (
          <li key={i}>
            <span className="min">{e.minute}</span>
            <span>
              {ICONS[e.kind] || "•"} {e.player || e.text}
              {e.team ? <span style={{ color: "var(--muted)" }}> · {e.team.name}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── The road here / form guide: prose from the schedule ──────────── */

/* Round names for prose. Quarter/semi checks must run before /final/ —
   "Quarter-finals" contains "final". */
function stageProse(stage) {
  const s = stage || "";
  if (/32/.test(s)) return "round of 32";
  if (/16/.test(s)) return "round of 16";
  if (/quarter/i.test(s)) return "quarter-final";
  if (/semi/i.test(s)) return "semi-final";
  if (/third/i.test(s)) return "third-place match";
  if (/final/i.test(s)) return "final";
  return s.toLowerCase();
}

/* One result as a phrase, from the team's own perspective. */
function resultPhrase(r) {
  const opp = r.opp?.name || "their opponents";
  if (r.pens) {
    return r.res === "W"
      ? `edged ${opp} ${r.pensScore} on penalties after a ${r.score} draw`
      : `fell to ${opp} ${r.pensScore} on penalties after a ${r.score} draw`;
  }
  if (r.res === "W") return `beat ${opp} ${r.score}`;
  if (r.res === "L") return `lost ${r.score} to ${opp}`;
  return `drew ${r.score} with ${opp}`;
}

/* A team's finished matches before this one, oldest first. Sides are matched
   by country code (World Cup) or API-Football team id (clubs). */
function priorResults(match, allMatches, side) {
  const team = match[side];
  const teamApifId = side === "home" ? match.apifHomeId : match.apifAwayId;
  const before = new Date(match.kickoff).getTime();
  const isOurs = (m) => {
    if (team?.code) return m.home.code === team.code ? "home" : m.away.code === team.code ? "away" : null;
    if (teamApifId != null) return m.apifHomeId === teamApifId ? "home" : m.apifAwayId === teamApifId ? "away" : null;
    return null;
  };
  return (allMatches || [])
    .filter((m) => m.state === "post" && m.id !== match.id && new Date(m.kickoff).getTime() < before)
    .map((m) => ({ m, us: isOurs(m) }))
    .filter((x) => x.us)
    .sort((a, b) => new Date(a.m.kickoff) - new Date(b.m.kickoff))
    .map(({ m, us }) => {
      const gf = us === "home" ? m.hg : m.ag;
      const ga = us === "home" ? m.ag : m.hg;
      const pf = us === "home" ? m.phg : m.pag;
      const pa = us === "home" ? m.pag : m.phg;
      const pens = pf != null && pa != null;
      const res = gf > ga ? "W" : gf < ga ? "L" : pens ? (pf > pa ? "W" : "L") : "D";
      return {
        res,
        pens,
        score: `${gf}\u2013${ga}`,
        pensScore: pens ? `${pf}\u2013${pa}` : null,
        gf,
        ga,
        opp: us === "home" ? m.away : m.home,
        stage: m.stage || "",
        isGroup: /^group/i.test(m.stage || ""),
      };
    });
}

const record = (rows) => {
  const n = (x) => rows.filter((r) => r.res === x).length;
  return `W${n("W")} D${n("D")} L${n("L")}`;
};

/* A few lines of prose per team: how they got to this match. No AI needed —
   the whole story is in the schedule. */
export function RoadSoFar({ match, allMatches, standings }) {
  const journey = (side) => {
    const team = match[side];
    if (!team?.code) return null; // unresolved knockout feeder
    const rows = priorResults(match, allMatches, side);
    if (!rows.length) return `${team.name} are opening their tournament here.`;

    const groupRows = rows.filter((r) => r.isGroup);
    const koRows = rows.filter((r) => !r.isGroup);
    const parts = [];

    // "won Group E (W2 D1 L0)" once the group is settled, else the results.
    const g = team.group && standings?.[team.group];
    const settled = g && g.length >= 2 && g.every((r) => (r.p ?? 0) >= 3);
    const pos = settled ? g.findIndex((r) => r.team.code === team.code) + 1 : 0;
    if (groupRows.length && pos > 0) {
      const nth = ["", "winners", "runners-up", "3rd", "4th"][pos] || `${pos}th`;
      parts.push(pos === 1 ? `won Group ${team.group} (${record(groupRows)})` : `came through Group ${team.group} as ${nth} (${record(groupRows)})`);
    } else if (groupRows.length) {
      parts.push(groupRows.map(resultPhrase).join(", then "));
    }
    for (const r of koRows) parts.push(`${resultPhrase(r)} in the ${stageProse(r.stage)}`);
    return `${team.name} ${parts.join(", then ")}.`;
  };

  const home = journey("home");
  const away = journey("away");
  if (!home && !away) return null;

  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{"\ud83d\udee4"} The road here</div>
      {[home, away].filter(Boolean).map((text, i) => (
        <p key={i} style={{ fontSize: 13, margin: i ? "8px 0 0" : 0 }}>{text}</p>
      ))}
    </div>
  );
}

/* League flavour: how each club's last five games have gone. */
export function FormBrief({ match, allMatches }) {
  const brief = (side) => {
    const team = match[side];
    if (!team?.name) return null;
    const rows = priorResults(match, allMatches, side).slice(-5);
    if (!rows.length) return null;
    const gf = rows.reduce((s, r) => s + (r.gf || 0), 0);
    const ga = rows.reduce((s, r) => s + (r.ga || 0), 0);
    const span = rows.length === 5 ? "their last five" : `their opening ${rows.length === 1 ? "game" : rows.length + " games"}`;
    const last = rows[rows.length - 1];
    return `${team.name} come in ${record(rows)} from ${span}, scoring ${gf} and conceding ${ga}. Last time out they ${resultPhrase(last)}.`;
  };

  const home = brief("home");
  const away = brief("away");
  if (!home && !away) return null;

  return (
    <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{"\ud83d\udcc8"} Form guide</div>
      {[home, away].filter(Boolean).map((text, i) => (
        <p key={i} style={{ fontSize: 13, margin: i ? "8px 0 0" : 0 }}>{text}</p>
      ))}
    </div>
  );
}
