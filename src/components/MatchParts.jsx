import React, { useState } from "react";

const ICONS = { goal: "⚽", og: "⚽", pen: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", event: "•" };

function isTeam(ev, team) {
  if (!ev.team) return false;
  return ev.team.name === team.name
    || (ev.team.code && ev.team.code === team.code)
    || (ev.team.espnId && ev.team.espnId === team.espnId);
}

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

export function PitchView({ side }) {
  const [imgErrors, setImgErrors] = useState(new Set());

  if (!side?.starters?.length || !side.formation) return null;
  const rows = side.formation.split("-").map(Number).filter((n) => n > 0);
  if (!rows.length) return null;

  const gk = side.starters[0];
  const outfield = side.starters.slice(1);
  let idx = 0;
  const formationRows = rows.map((count) => {
    const players = outfield.slice(idx, idx + count);
    idx += count;
    return players;
  });
  const displayRows = [...formationRows.reverse(), [gk]];
  const onErr = (name) => setImgErrors((s) => new Set(s).add(name));

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(180deg, #1a5c2a 0%, #237a38 50%, #1a5c2a 100%)",
      borderRadius: 12, padding: "16px 4px", aspectRatio: "3 / 4",
      display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: "1px solid rgba(255,255,255,0.18)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 50, height: 50, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
      <div style={{ position: "absolute", left: "22%", right: "22%", top: 0, height: "14%", borderBottom: "1px solid rgba(255,255,255,0.18)", borderLeft: "1px solid rgba(255,255,255,0.18)", borderRight: "1px solid rgba(255,255,255,0.18)" }} />
      <div style={{ position: "absolute", left: "22%", right: "22%", bottom: 0, height: "14%", borderTop: "1px solid rgba(255,255,255,0.18)", borderLeft: "1px solid rgba(255,255,255,0.18)", borderRight: "1px solid rgba(255,255,255,0.18)" }} />

      {displayRows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", justifyContent: "space-evenly", alignItems: "center", position: "relative", zIndex: 1 }}>
          {row.map((p, pi) => {
            const hasPhoto = p.headshot && !imgErrors.has(p.name);
            return (
              <div key={p.name + pi} style={{ textAlign: "center", flex: "0 0 auto", minWidth: 0 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", overflow: "hidden",
                  margin: "0 auto 2px",
                  background: hasPhoto ? "#222" : "rgba(255,255,255,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid rgba(255,255,255,0.5)",
                  fontSize: 14, fontWeight: 700, color: "#fff",
                }}>
                  {hasPhoto ? (
                    <img src={p.headshot} alt="" width={38} height={38} loading="lazy" style={{ objectFit: "cover" }} onError={() => onErr(p.name)} />
                  ) : (
                    p.jersey || "?"
                  )}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.9)", maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 auto" }}>
                  {p.jersey ? p.jersey + " " : ""}{p.name.split(" ").pop()}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BenchList({ players }) {
  const [imgErrors, setImgErrors] = useState(new Set());
  if (!players?.length) return null;
  const onErr = (name) => setImgErrors((s) => new Set(s).add(name));

  return (
    <div style={{ marginTop: 10 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>Bench</div>
      {players.map((p, i) => {
        const hasPhoto = p.headshot && !imgErrors.has(p.name);
        return (
          <div key={p.name + i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
              background: hasPhoto ? "#222" : "var(--pitch)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "var(--chalk)",
            }}>
              {hasPhoto ? (
                <img src={p.headshot} alt="" width={28} height={28} loading="lazy" style={{ objectFit: "cover" }} onError={() => onErr(p.name)} />
              ) : (
                p.jersey || "?"
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            </div>
            <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
              {p.pos}{p.subMinute ? ` · ↑${p.subMinute}` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
