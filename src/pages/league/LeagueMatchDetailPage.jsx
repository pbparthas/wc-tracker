import React, { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AiCard from "../../components/AiCard.jsx";
import { MatchGlance, TopPerformers, PredictionsCard, InjuriesCard } from "../../components/MatchParts.jsx";
import { ScoreHeader, MatchTabsBar, TimelineTab, LineupsTab, StatsTab, InfoCard } from "../../components/MatchDetailShared.jsx";
import { COMPETITIONS } from "../../data/competitions.js";
import { fetchLeagueMatches, fetchLeagueSummary } from "../../lib/datasource.js";
import { useCached } from "../../hooks/useCached.js";
import { useAiContent } from "../../hooks/useAiContent.js";
import { usePredictions } from "../../hooks/usePredictions.js";
import { useInjuries } from "../../hooks/useInjuries.js";
import { useSwipeTabs } from "../../hooks/useSwipeTabs.js";
import { useResume } from "../../hooks/useResume.js";
import { cacheGet, cacheSet } from "../../lib/storage.js";
import { leaguePreviewPrompt, leagueRecapPrompt } from "../../lib/prompts.js";

export default function LeagueMatchDetailPage() {
  const { comp, id } = useParams();
  const C = COMPETITIONS[comp] || COMPETITIONS.epl;
  const sumKey = `sum:${C.id}:` + id;
  const [tab, setTab] = useState("overview");
  const { data: allMatches } = useCached(`matches:${C.id}`, 10 * 60 * 1000, () => fetchLeagueMatches(C.slug));

  const [summary, setSummary] = useState(() => cacheGet(sumKey));
  const [loading, setLoading] = useState(false);

  const schedMatch = (allMatches || []).find((m) => m.id === id);
  const match = schedMatch && summary?.match
    ? { ...schedMatch, state: summary.match.state, status: summary.match.status, hg: summary.match.hg ?? schedMatch.hg, ag: summary.match.ag ?? schedMatch.ag, phg: summary.match.phg ?? schedMatch.phg, pag: summary.match.pag ?? schedMatch.pag }
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

  const eyebrow = `${match.stage}${match.city ? " · " + match.city : ""}`;

  return (
    <div className="wrap" style={{ paddingTop: 14, minHeight: "85vh" }} {...swipe}>
      <Link to={`/league/${C.id}/matches`} style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>

      <ScoreHeader match={match} eyebrow={eyebrow} events={summary?.events} />

      <MatchTabsBar tabs={tabs} active={activeTab} onTab={setTab} />

      {activeTab === "overview" && (
        <>
          {upcoming && <AiCard title="Match preview" ai={preview} cta="✨ Write preview" />}
          {showPredictions && <PredictionsCard predictions={predictions} homeTeam={match.home} awayTeam={match.away} match={match} />}
          {showPredictions && <InjuriesCard injuries={injuries} homeTeam={match.home} awayTeam={match.away} homeId={match.apifHomeId} awayId={match.apifAwayId} />}
          {state === "post" && <AiCard title="Match recap" ai={recap} cta="✨ Write recap" />}

          {!upcoming && <MatchGlance stats={summary?.stats} />}
          {state === "post" && <TopPerformers lineups={summary?.lineups} playerStats={summary?.playerStats} />}

          <InfoCard info={summary?.info} />
        </>
      )}

      {activeTab === "timeline" && <TimelineTab loading={loading} summary={summary} />}
      {activeTab === "lineups" && <LineupsTab loading={loading} summary={summary} upcoming={upcoming} match={match} />}
      {activeTab === "stats" && <StatsTab loading={loading} summary={summary} />}

      {loading && !summary && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
    </div>
  );
}
