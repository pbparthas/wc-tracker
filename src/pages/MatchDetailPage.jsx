import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import AiCard from "../components/AiCard.jsx";
import { TopPerformers, MatchGlance, PredictionsCard, InjuriesCard } from "../components/MatchParts.jsx";
import { ScoreHeader, MatchTabsBar, TimelineTab, LineupsTab, StatsTab, InfoCard } from "../components/MatchDetailShared.jsx";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { useMatchSummary } from "../hooks/useMatchSummary.js";
import { useAiContent } from "../hooks/useAiContent.js";
import { useSwipeTabs } from "../hooks/useSwipeTabs.js";
import { usePredictions } from "../hooks/usePredictions.js";
import { useInjuries } from "../hooks/useInjuries.js";
import { downloadIcs } from "../lib/ics.js";
import { stadiumFor } from "../data/stadiums.js";
import { useWeather } from "../hooks/useWeather.js";
import { mergeKnockoutSchedule } from "../lib/bracket.js";
import { previewPrompt, recapPrompt, h2hPrompt } from "../lib/prompts.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function MatchDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");
  const { matches, loading } = useSchedule();
  const { standings } = useStandings();
  const schedMatch = matches.find((m) => m.id === id);
  const { summary, loading: sLoad } = useMatchSummary(id, schedMatch?.state);
  const match = schedMatch && summary?.match
    ? { ...schedMatch, state: summary.match.state, status: summary.match.status, hg: summary.match.hg ?? schedMatch.hg, ag: summary.match.ag ?? schedMatch.ag, phg: summary.match.phg ?? schedMatch.phg, pag: summary.match.pag ?? schedMatch.pag }
    : schedMatch || summary?.match || null;

  // The knockout slot this match bound to: carries the FIFA match number and
  // the normalised round label (feeds mislabel rounds; the skeleton doesn't).
  const koMatch = useMemo(
    () => mergeKnockoutSchedule(matches, standings).find((m) => m.id === id) ?? null,
    [matches, standings, id]
  );
  const koMatchNo = koMatch?.matchNo ?? null;
  const stageLabel = koMatch?.stage || match?.stage;

  const preview = useAiContent("preview2:" + id, () => previewPrompt(match, standings));
  const recap = useAiContent("recap:" + id, () => recapPrompt(match, summary));
  const h2h = useAiContent("h2h2:" + id, () => h2hPrompt(match, matches), { ttlMs: WEEK });
  const wx = useWeather(match?.id, match?.city, match?.kickoff, match?.state);

  const upcoming = match?.state === "pre";
  // Keep the pre-match win probability visible once the match is live too — it's
  // useful context during play, not just before kickoff.
  const showPredictions = upcoming || match?.state === "in";
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
        {loading || sLoad ? (
          <p className="pulse" style={{ color: "var(--muted)" }}>Loading match…</p>
        ) : (
          <p style={{ color: "var(--muted)" }}>
            Match not found. <Link to="/matches">Back to matches</Link>
          </p>
        )}
      </div>
    );
  }

  const eyebrow = `${stageLabel}${koMatchNo ? " · Match " + koMatchNo : ""}${match.city ? " · " + match.city : ""}`;

  // minHeight on the wrap keeps the whole screen swipeable even when a tab's
  // content is short (e.g. "Timeline not available yet."), so the tab-swipe
  // gesture still fires in the empty area below.
  return (
    <div className="wrap" style={{ paddingTop: 14, minHeight: "85vh" }} {...swipe}>
      <Link to="/matches" style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>

      <ScoreHeader match={match} eyebrow={eyebrow} events={summary?.events} teamHref={(t) => (t?.code ? `/team/${t.code}` : null)}>
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
      </ScoreHeader>

      <MatchTabsBar tabs={tabs} active={activeTab} onTab={setTab} />

      {activeTab === "overview" && (
        <>
          {upcoming && <AiCard title="Match preview" ai={preview} cta="✨ Write preview" />}
          {showPredictions && <PredictionsCard predictions={predictions} homeTeam={match.home} awayTeam={match.away} match={match} />}
          {showPredictions && <InjuriesCard injuries={injuries} homeTeam={match.home} awayTeam={match.away} homeId={match.apifHomeId} awayId={match.apifAwayId} />}
          {match.state === "post" && <AiCard title="Match recap" ai={recap} cta="✨ Write recap" />}

          {!upcoming && <MatchGlance stats={summary?.stats} />}
          {/* Player ratings start at a ~6.5-7.0 baseline and only diverge as the
              match is played, so a "top performers" ranking is meaningless until
              full-time. Live per-player ratings still show on the pitch view. */}
          {match.state === "post" && <TopPerformers lineups={summary?.lineups} playerStats={summary?.playerStats} />}

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

          <InfoCard info={summary?.info} />
        </>
      )}

      {activeTab === "timeline" && <TimelineTab loading={sLoad} summary={summary} />}
      {activeTab === "lineups" && <LineupsTab loading={sLoad} summary={summary} upcoming={upcoming} match={match} />}
      {activeTab === "stats" && <StatsTab loading={sLoad} summary={summary} />}

      {sLoad && !summary && activeTab === "overview" && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
    </div>
  );
}
