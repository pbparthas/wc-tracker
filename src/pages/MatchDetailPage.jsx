import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import StatusPill from "../components/StatusPill.jsx";
import AiCard from "../components/AiCard.jsx";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { useMatchSummary } from "../hooks/useMatchSummary.js";
import { useAiContent } from "../hooks/useAiContent.js";
import { istParts } from "../lib/time.js";
import { downloadIcs } from "../lib/ics.js";
import { stadiumFor } from "../data/stadiums.js";
import { useWeather } from "../hooks/useWeather.js";
import { previewPrompt, recapPrompt, h2hPrompt } from "../lib/prompts.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const ICONS = { goal: "⚽", og: "⚽", pen: "⚽", yellow: "🟨", red: "🟥", sub: "🔁", event: "•" };

function isTeam(ev, team) {
  return ev.team?.name === team.name || ev.team?.code === team.code;
}

function EventSummary({ events, match }) {
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

function CommentaryCard({ items }) {
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

function Lineup({ side }) {
  if (!side) return null;
  return (
    <div className="lineup-col">
      <h4>{side.team.name}{side.formation ? ` · ${side.formation}` : ""}</h4>
      <ul>
        {side.starters.map((p) => (
          <li key={p.name + p.jersey}>
            <span className="pos">{p.jersey || p.pos}</span>
            {p.name}
          </li>
        ))}
      </ul>
      {side.subs.length > 0 && (
        <>
          <h4>Bench</h4>
          <ul style={{ color: "var(--muted)" }}>
            {side.subs.map((p) => (
              <li key={p.name + p.jersey}>
                <span className="pos">{p.jersey || p.pos}</span>
                {p.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");
  const { matches, loading } = useSchedule();
  const { standings } = useStandings();
  const match = matches.find((m) => m.id === id);
  const { summary, loading: sLoad } = useMatchSummary(id, match?.state);

  const preview = useAiContent("preview:" + id, () => previewPrompt(match, standings));
  const recap = useAiContent("recap:" + id, () => recapPrompt(match, summary));
  const h2h = useAiContent("h2h:" + id, () => h2hPrompt(match, matches), { ttlMs: WEEK });
  const wx = useWeather(match?.id, match?.city, match?.kickoff, match?.state);

  if (!match) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        {loading ? (
          <p className="pulse" style={{ color: "var(--muted)" }}>Loading match…</p>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Match not found. <Link to="/matches">Back to matches</Link>
          </p>
        )}
      </div>
    );
  }

  const p = istParts(match.kickoff);
  const upcoming = match.state === "pre";
  const live = match.state === "in";

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(!upcoming && summary?.events?.length ? [{ id: "timeline", label: "Timeline" }] : []),
    ...(summary?.lineups ? [{ id: "lineups", label: "Lineups" }] : []),
    ...(!upcoming && summary?.stats?.length ? [{ id: "stats", label: "Stats" }] : []),
  ];
  const activeTab = tabs.find((t) => t.id === tab) ? tab : "overview";

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/matches" style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>

      <div className="card" style={{ padding: 16, margin: "10px 0", borderColor: live ? "var(--live)" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span className="eyebrow">{match.stage}{match.city ? " · " + match.city : ""}</span>
          <StatusPill status={match.status} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, textAlign: "center" }}>
          <div>
            <Flag team={match.home} size={40} />
            <div style={{ fontWeight: 700, marginTop: 6 }}>{match.home.name}</div>
          </div>
          <div>
            <div className={"disp" + (live ? " pulse" : "")} style={{
              fontSize: live ? 48 : upcoming ? 22 : 38,
              fontWeight: 800,
              color: live ? "var(--live)" : upcoming ? "var(--saffron)" : "var(--chalk)",
              lineHeight: 1.1,
            }}>
              {upcoming ? (p ? p.time : "TBC") : `${match.hg ?? "–"} : ${match.ag ?? "–"}`}
            </div>
            {live && (
              <div className="disp" style={{ fontSize: 16, fontWeight: 700, color: "var(--live)", marginTop: 4, letterSpacing: "0.08em" }}>
                {match.status}
              </div>
            )}
          </div>
          <div>
            <Flag team={match.away} size={40} />
            <div style={{ fontWeight: 700, marginTop: 6 }}>{match.away.name}</div>
          </div>
        </div>

        <EventSummary events={summary?.events} match={match} />

        <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          {p ? `${p.day} · ${p.time}` : ""} <span style={{ color: "var(--saffron)", fontWeight: 600 }}>IST</span>
          {match.venue ? ` · ${match.venue}` : ""}
        </div>
        {wx && (
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
            {wx.emoji} {wx.label} · {wx.tempC}°C
            {wx.rainPct != null ? ` · ${wx.rainPct}% rain` : ""} at kickoff
          </div>
        )}
        {upcoming && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button className="btn" onClick={() => downloadIcs(match)}>🔔 Add reminder to calendar</button>
          </div>
        )}
      </div>

      {tabs.length > 1 && (
        <div className="match-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={"match-tab" + (activeTab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "overview" && (
        <>
          {upcoming && <AiCard title="Match preview" ai={preview} cta="✨ Write preview" />}
          {match.state === "post" && <AiCard title="Match recap" ai={recap} cta="✨ Write recap" />}
          {match.state !== "post" && <AiCard title="Head-to-head & form" ai={h2h} cta="✨ H2H & form" />}

          {(() => {
            const st = stadiumFor(match.city);
            if (!st) return null;
            const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${st.name}, ${st.city}`)}`;
            return (
              <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>🏟 Stadium</div>
                <div className="disp" style={{ fontSize: 18, fontWeight: 800 }}>{st.name.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 8px" }}>
                  {st.city} · {st.country} · {st.capacity} seats · opened {st.opened}
                </div>
                <p style={{ fontSize: 13 }}>{st.facts}</p>
                <a href={maps} target="_blank" rel="noreferrer noopener" style={{ fontSize: 12, display: "inline-block", marginTop: 8 }}>
                  📍 View on map →
                </a>
              </div>
            );
          })()}

          {summary?.info && (summary.info.attendance || summary.info.referee) && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
              {summary.info.attendance ? <div>Attendance: {Number(summary.info.attendance).toLocaleString("en-IN")}</div> : null}
              {summary.info.referee ? <div>Referee: {summary.info.referee}</div> : null}
            </div>
          )}

          {upcoming && !sLoad && !summary?.lineups && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Starting XI</div>
              Team sheets usually drop about an hour before kickoff — they'll appear here automatically.
            </div>
          )}
        </>
      )}

      {activeTab === "timeline" && (
        <>
          {summary?.events?.length > 0 && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Key events</div>
              <ul className="timeline">
                {summary.events.map((e, i) => (
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
          )}
          {summary?.commentary?.length > 0 && <CommentaryCard items={summary.commentary} />}
        </>
      )}

      {activeTab === "lineups" && summary?.lineups && (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Starting XI & bench</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Lineup side={summary.lineups.home} />
            <Lineup side={summary.lineups.away} />
          </div>
        </div>
      )}

      {activeTab === "stats" && summary?.stats?.length > 0 && (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Match stats</div>
          {summary.stats.map((s) => (
            <div key={s.label} className="stat-row">
              <b>{s.home}</b>
              <span>{s.label}</span>
              <b>{s.away}</b>
            </div>
          ))}
        </div>
      )}

      {sLoad && !summary && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
      {!sLoad && !summary?.events?.length && !summary?.lineups && !upcoming && activeTab === "overview" && (
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Detailed match data isn't available for this fixture yet.</p>
      )}
    </div>
  );
}
