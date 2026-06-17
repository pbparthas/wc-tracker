import React, { useState } from "react";

const ICONS = { goal: "⚽", og: "⚽", pen: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", event: "•" };

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
  if (!events?.length) return null;
  const goals = events.filter((e) => ["goal", "og", "pen"].includes(e.kind));
  const reds = events.filter((e) => e.kind === "red");
  if (!goals.length && !reds.length) return null;

  const homeGoals = goals.filter((e) => (e.kind === "og" ? !isTeam(e, match.home) : isTeam(e, match.home)));
  const awayGoals = goals.filter((e) => (e.kind === "og" ? !isTeam(e, match.away) : isTeam(e, match.away)));
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
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--pitch)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, flexShrink: 0, border: "2px solid var(--line)" }}>
            {player.jersey || "?"}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{shortName(player.name)}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {player.jersey ? `#${player.jersey}` : ""}{player.pos ? ` · ${player.pos}` : ""}
          </div>
        </div>
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
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: "rgba(0,0,0,0.35)",
      borderRadius: isTop ? "12px 12px 0 0" : "0 0 12px 12px",
    }}>
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
  );
}

/* ── Single player dot on the pitch ───────────────────────────────── */

function PlayerDot({ player, events, subMinute, picked, onPick, imgErrors, onImgErr }) {
  const hasPhoto = player.headshot && !imgErrors.has(player.name);
  const pEvs = playerMatchEvents(player, events);
  const goalCount = pEvs.filter((e) => ["goal", "pen"].includes(e.kind)).length;
  const hasYellow = pEvs.some((e) => e.kind === "yellow");
  const hasRed = pEvs.some((e) => e.kind === "red");
  const isSelected = picked?.name === player.name;

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
          <img src={player.headshot} alt="" width={48} height={48} loading="lazy" style={{ objectFit: "cover" }} crossOrigin="anonymous" onError={() => onImgErr(player.name)} />
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
