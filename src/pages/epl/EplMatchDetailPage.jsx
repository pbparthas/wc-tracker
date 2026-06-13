import React, { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Flag from "../../components/Flag.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import AiCard from "../../components/AiCard.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchSummary, fetchLeagueMatches } from "../../lib/espn.js";
import { useCached } from "../../hooks/useCached.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { useResume } from "../../hooks/useResume.js";
import { cacheGet, cacheSet } from "../../lib/storage.js";
import { istParts } from "../../lib/time.js";
import { leaguePreviewPrompt, leagueRecapPrompt } from "../../lib/prompts.js";

const EPL = COMPETITIONS.epl;
const ICONS = { goal: "⚽", og: "⚽(og)", pen: "⚽(p)", yellow: "🟨", red: "🟥", sub: "🔁", event: "•" };

function CommentaryCard({ items }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, 3);
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

export default function EplMatchDetailPage() {
  const { id } = useParams();
  const { data: allMatches } = useCached("eplmatches", 10 * 60 * 1000, () => fetchLeagueMatches(EPL.slug));

  const [summary, setSummary] = useState(() => cacheGet("sum:epl:" + id));
  const [loading, setLoading] = useState(false);

  const match = (allMatches || []).find((m) => m.id === id) || summary?.match || null;
  const state = match?.state;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const s = await fetchSummary(id, EPL.slug);
      setSummary(s);
      if (state === "post") cacheSet("sum:epl:" + id, s);
      else cacheSet("sum:epl:" + id, s, 5 * 60 * 1000);
    } catch { /* summary unavailable */ }
    setLoading(false);
  }, [id, state]);

  useEffect(() => {
    if (!(state === "post" && cacheGet("sum:epl:" + id))) load();
    if (state !== "in" && state !== "pre") return undefined;
    const t = setInterval(() => { if (!document.hidden) load(); }, state === "in" ? 60000 : 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [state, load, id]);

  useResume(() => { if (state === "in" || state === "pre") load(); });

  const preview = useAiContent(
    "eplPreview:" + id,
    () => match && leaguePreviewPrompt(match, EPL.name),
    { ttlMs: 7 * 24 * 60 * 60 * 1000, grounding: true }
  );
  const recap = useAiContent(
    "eplRecap:" + id,
    () => match && leagueRecapPrompt(match, summary, EPL.name),
    { grounding: true }
  );

  if (!match) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        {loading ? (
          <p className="pulse" style={{ color: "var(--muted)" }}>Loading match…</p>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Match not found. <Link to="/epl/matches">Back to matches</Link>
          </p>
        )}
      </div>
    );
  }

  const p = istParts(match.kickoff);
  const upcoming = state === "pre";
  const live = state === "in";

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/epl/matches" style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>

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
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          {p ? `${p.day} · ${p.time}` : ""} <span style={{ color: "var(--saffron)", fontWeight: 600 }}>IST</span>
          {match.venue ? ` · ${match.venue}` : ""}
        </div>
      </div>

      {upcoming && <AiCard title="Match preview" ai={preview} cta="✨ Write preview" />}
      {state === "post" && <AiCard title="Match recap" ai={recap} cta="✨ Write recap" />}

      {summary?.stats?.length > 0 && (
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

      {summary?.events?.length > 0 && (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Timeline</div>
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

      {summary?.lineups && (summary.lineups.home || summary.lineups.away) ? (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
          <div className="eyebrow">Starting XI & bench</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Lineup side={summary.lineups.home} />
            <Lineup side={summary.lineups.away} />
          </div>
        </div>
      ) : upcoming && !loading ? (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Starting XI</div>
          Team sheets usually drop about an hour before kickoff — they'll appear here automatically.
        </div>
      ) : null}

      {summary?.info && (summary.info.attendance || summary.info.referee) && (
        <div className="card" style={{ padding: "12px 14px", marginBottom: 20, fontSize: 13, color: "var(--muted)" }}>
          {summary.info.attendance ? <div>Attendance: {Number(summary.info.attendance).toLocaleString("en-IN")}</div> : null}
          {summary.info.referee ? <div>Referee: {summary.info.referee}</div> : null}
        </div>
      )}

      {loading && !summary && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
    </div>
  );
}
