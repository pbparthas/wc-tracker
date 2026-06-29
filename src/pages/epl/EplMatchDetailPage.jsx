import React, { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Flag from "../../components/Flag.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import AiCard from "../../components/AiCard.jsx";
import { EventSummary, PitchView, BenchList, CommentaryCard, StatsCard, TimelineCard, PredictionsCard, InjuriesCard } from "../../components/MatchParts.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueMatches, fetchLeagueSummary } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { usePredictions } from "../../hooks/usePredictions.js";
import { useInjuries } from "../../hooks/useInjuries.js";
import { useSwipeTabs } from "../../hooks/useSwipeTabs.js";
import { useResume } from "../../hooks/useResume.js";
import { cacheGet, cacheSet } from "../../lib/storage.js";
import { istParts } from "../../lib/time.js";
import { leaguePreviewPrompt, leagueRecapPrompt } from "../../lib/prompts.js";

export default function EplMatchDetailPage() {
  const { comp, id } = useParams();
  const C = COMPETITIONS[comp] || COMPETITIONS.epl;
  const sumKey = `sum:${C.id}:` + id;
  const [tab, setTab] = useState("overview");
  const { data: allMatches } = useCached(`matches:${C.id}`, 10 * 60 * 1000, () => fetchLeagueMatches(C.slug));

  const [summary, setSummary] = useState(() => cacheGet(sumKey));
  const [loading, setLoading] = useState(false);

  const schedMatch = (allMatches || []).find((m) => m.id === id);
  const match = schedMatch && summary?.match
    ? { ...schedMatch, state: summary.match.state, status: summary.match.status, hg: summary.match.hg ?? schedMatch.hg, ag: summary.match.ag ?? schedMatch.ag }
    : schedMatch || summary?.match || null;
  const state = match?.state;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const s = await fetchLeagueSummary(id, C.slug);
      setSummary(s);
      if (state === "post") cacheSet(sumKey, s);
      else cacheSet(sumKey, s, 5 * 60 * 1000);
    } catch { /* summary unavailable */ }
    setLoading(false);
  }, [id, state, sumKey, C.slug]);

  useEffect(() => {
    if (!(state === "post" && cacheGet(sumKey))) load();
    if (state !== "in" && state !== "pre") return undefined;
    const t = setInterval(() => { if (!document.hidden) load(); }, state === "in" ? 60000 : 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [state, load, sumKey]);

  useResume(() => { if (state === "in" || state === "pre") load(); });

  const preview = useAiContent(
    `${C.id}Preview:` + id,
    () => match && leaguePreviewPrompt(match, C.name),
    { ttlMs: 7 * 24 * 60 * 60 * 1000, grounding: true }
  );
  const recap = useAiContent(
    `${C.id}Recap:` + id,
    () => match && leagueRecapPrompt(match, summary, C.name),
    { grounding: true }
  );

  const upcoming = state === "pre";
  // Win probability + injuries: useful before kickoff and during live play
  // (same as the World Cup match page). Both work off the API-Football fixture id.
  const showPredictions = upcoming || state === "in";
  const { predictions } = usePredictions(showPredictions ? match?.id : null);
  const { injuries } = useInjuries(showPredictions ? match?.id : null);

  const tabs = match ? [
    { id: "overview", label: "Overview" },
    ...(!upcoming ? [{ id: "timeline", label: "Timeline" }] : []),
    { id: "lineups", label: "Lineups" },
    ...(!upcoming ? [{ id: "stats", label: "Stats" }] : []),
  ] : [{ id: "overview", label: "Overview" }];
  const activeTab = tabs.find((t) => t.id === tab) ? tab : "overview";
  const swipe = useSwipeTabs(tabs, activeTab, setTab);

  if (!match) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        {loading ? (
          <p className="pulse" style={{ color: "var(--muted)" }}>Loading match…</p>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Match not found. <Link to={`/league/${C.id}/matches`}>Back to matches</Link>
          </p>
        )}
      </div>
    );
  }

  const p = istParts(match.kickoff);
  const live = state === "in";

  return (
    <div className="wrap" style={{ paddingTop: 14 }} {...swipe}>
      <Link to={`/league/${C.id}/matches`} style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>

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
          {showPredictions && <PredictionsCard predictions={predictions} homeTeam={match.home} awayTeam={match.away} />}
          {showPredictions && <InjuriesCard injuries={injuries} homeTeam={match.home} awayTeam={match.away} homeId={match.apifHomeId} awayId={match.apifAwayId} />}
          {state === "post" && <AiCard title="Match recap" ai={recap} cta="✨ Write recap" />}

          {summary?.info && (summary.info.attendance || summary.info.referee) && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
              {summary.info.attendance ? <div>Attendance: {Number(summary.info.attendance).toLocaleString("en-IN")}</div> : null}
              {summary.info.referee ? <div>Referee: {summary.info.referee}</div> : null}
            </div>
          )}

        </>
      )}

      {activeTab === "timeline" && (
        loading && !summary?.events ? (
          <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading timeline…</p>
        ) : summary?.events?.length ? (
          <>
            <TimelineCard events={summary.events} />
            {summary?.commentary?.length > 0 && <CommentaryCard items={summary.commentary} />}
          </>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Timeline not available yet.</p>
        )
      )}

      {activeTab === "lineups" && (
        loading && !summary?.lineups ? (
          <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading lineups…</p>
        ) : summary?.lineups ? (
          <>
            <PitchView home={summary.lineups.home} away={summary.lineups.away} events={summary?.events} playerStats={summary?.playerStats} match={match} />
            <BenchList home={summary.lineups.home} away={summary.lineups.away} events={summary?.events} playerStats={summary?.playerStats} />
          </>
        ) : upcoming ? (
          <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Starting XI</div>
            Team sheets usually drop about an hour before kickoff — they'll appear here automatically.
          </div>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Lineups not available for this match.</p>
        )
      )}

      {activeTab === "stats" && (
        loading && !summary?.stats ? (
          <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading stats…</p>
        ) : summary?.stats?.length ? (
          <StatsCard stats={summary.stats} />
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Match stats not available yet.</p>
        )
      )}

      {loading && !summary && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
    </div>
  );
}
