import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Flag from "../components/Flag.jsx";
import StatusPill from "../components/StatusPill.jsx";
import AiCard from "../components/AiCard.jsx";
import { EventSummary, PitchView, BenchList, CommentaryCard, StatsCard, TimelineCard, TopPerformers, MatchGlance, PredictionsCard, InjuriesCard } from "../components/MatchParts.jsx";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { useMatchSummary } from "../hooks/useMatchSummary.js";
import { useAiContent } from "../hooks/useAiContent.js";
import { useSwipeTabs } from "../hooks/useSwipeTabs.js";
import { usePredictions } from "../hooks/usePredictions.js";
import { useInjuries } from "../hooks/useInjuries.js";
import { istParts } from "../lib/time.js";
import { downloadIcs } from "../lib/ics.js";
import { stadiumFor } from "../data/stadiums.js";
import { useWeather } from "../hooks/useWeather.js";
import { mergeKnockoutSchedule } from "../lib/bracket.js";
import { previewPrompt, recapPrompt, h2hPrompt } from "../lib/prompts.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/* Team column in the score header — links to the team page when we know the
   team's code (resolved World Cup sides), otherwise plain. */
function TeamCol({ team }) {
  const inner = (
    <>
      <Flag team={team} size={40} />
      <div style={{ fontWeight: 700, marginTop: 6 }}>{team?.name}</div>
    </>
  );
  return team?.code
    ? <Link to={`/team/${team.code}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{inner}</Link>
    : <div>{inner}</div>;
}

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

  // The FIFA match number, derived by binding this match to its knockout slot —
  // matches the "Match 76" shown on the bracket and Matches-tab cards.
  const koMatchNo = useMemo(
    () => mergeKnockoutSchedule(matches, standings).find((m) => m.id === id)?.matchNo ?? null,
    [matches, standings, id]
  );

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

  const p = istParts(match.kickoff);
  const live = match.state === "in";

  // minHeight on the wrap keeps the whole screen swipeable even when a tab's
  // content is short (e.g. "Timeline not available yet."), so the tab-swipe
  // gesture still fires in the empty area below.
  return (
    <div className="wrap" style={{ paddingTop: 14, minHeight: "85vh" }} {...swipe}>
      <Link to="/matches" style={{ fontSize: 13, textDecoration: "none" }}>← All matches</Link>

      <div className="card" style={{ padding: 16, margin: "10px 0", borderColor: live ? "var(--live)" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span className="eyebrow">{match.stage}{koMatchNo ? " · Match " + koMatchNo : ""}{match.city ? " · " + match.city : ""}</span>
          <StatusPill status={match.status} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, textAlign: "center" }}>
          <TeamCol team={match.home} />
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
            {match.phg != null && match.pag != null && (
              <div className="disp" style={{ fontSize: 13, fontWeight: 700, color: "var(--saffron)", marginTop: 2 }}>
                {match.phg}–{match.pag} on pens
              </div>
            )}
          </div>
          <TeamCol team={match.away} />
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
          {showPredictions && <PredictionsCard predictions={predictions} homeTeam={match.home} awayTeam={match.away} match={match} />}
          {(upcoming || match.state === "in") && <InjuriesCard injuries={injuries} homeTeam={match.home} awayTeam={match.away} homeId={match.apifHomeId} awayId={match.apifAwayId} />}
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

          {summary?.info && (summary.info.attendance || summary.info.referee) && (
            <div className="card" style={{ padding: "12px 14px", marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
              {summary.info.attendance ? <div>Attendance: {Number(summary.info.attendance).toLocaleString("en-IN")}</div> : null}
              {summary.info.referee ? <div>Referee: {summary.info.referee}</div> : null}
            </div>
          )}

        </>
      )}

      {activeTab === "timeline" && (
        sLoad && !summary?.events ? (
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
        sLoad && !summary?.lineups ? (
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
        sLoad && !summary?.stats ? (
          <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading stats…</p>
        ) : summary?.stats?.length ? (
          <StatsCard stats={summary.stats} />
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Match stats not available yet.</p>
        )
      )}

      {sLoad && !summary && activeTab === "overview" && (
        <p className="pulse" style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Loading match details…</p>
      )}
    </div>
  );
}
