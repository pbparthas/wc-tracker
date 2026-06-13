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

/* ── Player info overlay ──────────────────────────────────────────── */

function PlayerInfo({ player, events, subMinute, onClose }) {
  const evs = events.filter((e) => e.kind !== "event");
  return (
    <div className="card" style={{ padding: 14, marginTop: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {player.headshot ? (
            <img src={player.headshot} alt="" width={48} height={48} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--pitch)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
              {player.jersey || "?"}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{player.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {player.jersey ? `#${player.jersey} · ` : ""}{player.pos || ""}
              {subMinute ? <span style={{ color: "var(--live)" }}> · ↓ {subMinute}</span> : ""}
            </div>
          </div>
        </div>
        <button style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", padding: 4 }} onClick={onClose} aria-label="Close">✕</button>
      </div>
      {evs.length > 0 && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          {evs.map((e, i) => (
            <div key={i} style={{ fontSize: 13, padding: "3px 0", display: "flex", gap: 6, alignItems: "center" }}>
              <span>{ICONS[e.kind] || "•"}</span>
              <span>{e.label} · {e.minute}</span>
            </div>
          ))}
        </div>
      )}
      {evs.length === 0 && !subMinute && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>No key events this match.</div>
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
  const isSelected = picked?.name === player.name;

  return (
    <div
      style={{ textAlign: "center", flex: "0 0 auto", minWidth: 0, position: "relative", cursor: "pointer" }}
      onClick={() => onPick(isSelected ? null : player)}
    >
      {subMinute && (
        <div style={{ position: "absolute", top: -2, right: -2, zIndex: 2, background: "#d32f2f", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>↓</div>
      )}
      {hasYellow && (
        <div style={{ position: "absolute", top: -2, left: -2, zIndex: 2, fontSize: 10 }}>🟨</div>
      )}
      {goalCount > 0 && (
        <div style={{ position: "absolute", bottom: 10, right: -4, zIndex: 2, fontSize: 10, display: "flex", alignItems: "center" }}>
          ⚽{goalCount > 1 ? <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>{goalCount}</span> : ""}
        </div>
      )}
      <div style={{
        width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
        margin: "0 auto 2px",
        background: hasPhoto ? "#222" : "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: isSelected ? "2px solid var(--saffron)" : "2px solid rgba(255,255,255,0.5)",
        fontSize: 14, fontWeight: 700, color: "#fff",
      }}>
        {hasPhoto ? (
          <img src={player.headshot} alt="" width={38} height={38} loading="lazy" style={{ objectFit: "cover" }} onError={() => onImgErr(player.name)} />
        ) : (
          player.jersey || "?"
        )}
      </div>
      <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.9)", maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 auto" }}>
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
    for (const s of side.starters) {
      if (nameMatch(e.player, s.name)) subMap.set(s.name, e.minute);
    }
  }
  return subMap;
}

/* ── Full pitch: both teams on one continuous field ────────────────── */

export function PitchView({ home, away, events }) {
  const [imgErrors, setImgErrors] = useState(new Set());
  const [picked, setPicked] = useState(null);

  const hp = parseFormation(home);
  const ap = parseFormation(away);
  if (!hp && !ap) return null;

  const homeSubs = buildSubMap(home, events);
  const awaySubs = buildSubMap(away, events);
  const onErr = (name) => setImgErrors((s) => new Set(s).add(name));

  // Away: GK at top → defense → midfield → forwards (near center)
  const awayRows = ap ? [[ap.gk], ...ap.formationRows] : [];
  // Home: forwards (near center) → midfield → defense → GK at bottom
  const homeRows = hp ? [...hp.formationRows.reverse(), [hp.gk]] : [];

  const renderRow = (row, subMap) => (
    <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "center", position: "relative", zIndex: 1 }}>
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
        background: "linear-gradient(180deg, #1a5c2a 0%, #1f6e31 25%, #237a38 50%, #1f6e31 75%, #1a5c2a 100%)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {/* Pitch markings */}
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: "2px solid rgba(255,255,255,0.22)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 50, height: 50, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.3)" }} />
        {/* Top penalty box (away goal) */}
        <div style={{ position: "absolute", left: "22%", right: "22%", top: 0, height: "7%", borderBottom: "1px solid rgba(255,255,255,0.18)", borderLeft: "1px solid rgba(255,255,255,0.18)", borderRight: "1px solid rgba(255,255,255,0.18)" }} />
        {/* Bottom penalty box (home goal) */}
        <div style={{ position: "absolute", left: "22%", right: "22%", bottom: 0, height: "7%", borderTop: "1px solid rgba(255,255,255,0.18)", borderLeft: "1px solid rgba(255,255,255,0.18)", borderRight: "1px solid rgba(255,255,255,0.18)" }} />

        {/* Away half */}
        {awayRows.length > 0 && (
          <div style={{ padding: "10px 4px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {away?.team?.name || "Away"} · {away?.formation || ""}
            </div>
            {awayRows.map((row, ri) => <React.Fragment key={"a" + ri}>{renderRow(row, awaySubs)}</React.Fragment>)}
          </div>
        )}

        {/* Home half */}
        {homeRows.length > 0 && (
          <div style={{ padding: "6px 4px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            {homeRows.map((row, ri) => <React.Fragment key={"h" + ri}>{renderRow(row, homeSubs)}</React.Fragment>)}
            <div style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {home?.team?.name || "Home"} · {home?.formation || ""}
            </div>
          </div>
        )}
      </div>

      {picked && (
        <PlayerInfo
          player={picked}
          events={playerMatchEvents(picked, events)}
          subMinute={homeSubs.get(picked.name) || awaySubs.get(picked.name)}
          onClose={() => setPicked(null)}
        />
      )}
    </>
  );
}

/* ── Bench list ───────────────────────────────────────────────────── */

export function BenchList({ home, away, events }) {
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
    return (
      <div
        key={p.name + i}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderTop: "1px solid var(--line)", cursor: "pointer", minWidth: 0 }}
        onClick={() => setPicked(picked?.name === p.name ? null : p)}
      >
        <div style={{
          width: 24, height: 24, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          background: hasPhoto ? "#222" : "var(--pitch)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "var(--chalk)",
        }}>
          {hasPhoto ? (
            <img src={p.headshot} alt="" width={24} height={24} loading="lazy" style={{ objectFit: "cover" }} onError={() => onErr(p.name)} />
          ) : (
            p.jersey || "?"
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.name}
        </div>
        <span style={{ fontSize: 9, color: "var(--muted)", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
          {goalCount > 0 && <span>⚽</span>}
          {p.subMinute && <span style={{ color: "#4caf50" }}>↑{p.subMinute}</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: "10px 14px", marginTop: 10, marginBottom: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Bench</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{home?.team?.name || "Home"}</div>
          {homeSubs.map(renderPlayer)}
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600, padding: "4px 0" }}>{away?.team?.name || "Away"}</div>
          {awaySubs.map(renderPlayer)}
        </div>
      </div>
      {picked && (
        <PlayerInfo
          player={picked}
          events={playerMatchEvents(picked, events)}
          subMinute={null}
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
