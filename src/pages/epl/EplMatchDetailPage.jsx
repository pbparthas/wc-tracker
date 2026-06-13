import React, { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Flag from "../../components/Flag.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import AiCard from "../../components/AiCard.jsx";
import { EventSummary, PitchView, BenchList, CommentaryCard, StatsCard, TimelineCard } from "../../components/MatchParts.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchSummary, fetchLeagueMatches } from "../../lib/espn.js";
import { useCached } from "../../hooks/useCached.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { useResume } from "../../hooks/useResume.js";
import { cacheGet, cacheSet } from "../../lib/storage.js";
import { istParts } from "../../lib/time.js";
import { leaguePreviewPrompt, leagueRecapPrompt } from "../../lib/prompts.js";

const EPL = COMPETITIONS.epl;

export default function EplMatchDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");
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

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(!upcoming && summary?.events?.length ? [{ id: "timeline", label: "Timeline" }] : []),
    ...(summary?.lineups ? [{ id: "lineups", label: "Lineups" }] : []),
    ...(!upcoming && summary?.stats?.length ? [{ id: "stats", label: "Stats" }] : []),
  ];
  const activeTab = tabs.find((t) => t.id === tab) ? tab : "overview";

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

        <EventSummary events={summary?.events} match={match} />

        <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          {p ? `${p.day} · ${p.time}` : ""} <span style={{ color: "var(--saffron)", fontWeight: 600 }}>IST</span>
          {match.venue ? ` · ${match.venue}` : ""}
        </div>
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
          {state === "post" && <AiCard title="Match recap" ai={recap} cta="✨ Write recap" />}

          {summary?.info && (summary.info.attendance || summary.info.referee) && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
              {summary.info.attendance ? <div>Attendance: {Number(summary.info.attendance).toLocaleString("en-IN")}</div> : null}
              {summary.info.referee ? <div>Referee: {summary.info.referee}</div> : null}
            </div>
          )}

          {upcoming && !loading && !summary?.lineups && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Starting XI</div>
              Team sheets usually drop about an hour before kickoff — they'll appear here automatically.
            </div>
          )}
        </>
      )}

      {activeTab === "timeline" && (
        <>
          <TimelineCard events={summary?.events} />
          {summary?.commentary?.length > 0 && <CommentaryCard items={summary.commentary} />}
        </>
      )}

      {activeTab === "lineups" && summary?.lineups && (
        <>
          <PitchView home={summary.lineups.home} away={summary.lineups.away} events={summary?.events} />
          <BenchList home={summary.lineups.home} away={summary.lineups.away} events={summary?.events} />
        </>
      )}

      {activeTab === "stats" && <StatsCard stats={summary?.stats} />}

      {loading && !summary && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
    </div>
  );
}
