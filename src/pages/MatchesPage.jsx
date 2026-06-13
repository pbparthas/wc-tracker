import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import MatchRow from "../components/MatchRow.jsx";
import DatePager from "../components/DatePager.jsx";
import AiCard from "../components/AiCard.jsx";
import InstallCard from "../components/InstallCard.jsx";
import WelcomeCard from "../components/WelcomeCard.jsx";
import { useSchedule } from "../hooks/useSchedule.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { useAiContent } from "../hooks/useAiContent.js";
import { istDateKey, istParts, dateKeyRange, IST } from "../lib/time.js";
import { TOURNAMENT } from "../data/phases.js";
import { digestPrompt, espnDownPrompt } from "../lib/prompts.js";

const DATES = dateKeyRange(TOURNAMENT.start, TOURNAMENT.end);
const clampToday = () => {
  const t = istDateKey();
  return t < TOURNAMENT.start ? TOURNAMENT.start : t > TOURNAMENT.end ? TOURNAMENT.end : t;
};

export default function MatchesPage() {
  const navigate = useNavigate();
  const { matches, loading, error, refresh, fetchedAt, stale } = useSchedule();
  const { favs } = useFavorites();
  const [day, setDay] = useState(clampToday);
  const today = istDateKey();

  const dayMatches = useMemo(
    () => matches.filter((m) => istParts(m.kickoff)?.dateKey === day),
    [matches, day]
  );

  const favAll = useMemo(
    () => matches.filter((m) => favs.includes(m.home.code) || favs.includes(m.away.code)),
    [matches, favs]
  );
  const live = dayMatches.filter((m) => m.state === "in");
  const up = dayMatches.filter((m) => m.state === "pre");
  const done = dayMatches.filter((m) => m.state === "post").reverse();

  const todayMatches = useMemo(
    () => matches.filter((m) => istParts(m.kickoff)?.dateKey === today),
    [matches, today]
  );

  const digest = useAiContent("digest:" + today, () =>
    digestPrompt(
      "today, " + new Date().toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "long" }),
      todayMatches.filter((m) => m.state === "post"),
      todayMatches.filter((m) => m.state === "pre")
    )
  );

  /* Hybrid fallback: ESPN unreachable AND nothing cached → offer a
     search-grounded Gemini answer, clearly labelled as approximate. */
  const fallback = useAiContent("fallback:" + today, espnDownPrompt, {
    ttlMs: 10 * 60 * 1000,
    grounding: true,
  });
  const espnDown = !!error && matches.length === 0;
  const anyFavLive = favAll.some((m) => m.state === "in");

  return (
    <>
      <Hero matches={matches} />
      <div className="wrap" style={{ paddingTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
          <span className="eyebrow">All times in IST 🇮🇳</span>
          <div style={{ display: "flex", gap: 6 }}>
            {favs.length > 0 && favAll.length > 0 && (
              <button className="iconbtn on" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => navigate("/yourteams")}>
                Your ★ teams
                {anyFavLive && <span className="pulse" style={{ color: "var(--live)", marginLeft: 6 }}>●</span>}
              </button>
            )}
            <button
              className="iconbtn"
              style={{ fontSize: 14, padding: "6px 12px" }}
              onClick={() => refresh(true)}
              disabled={loading}
              aria-label="Refresh scores"
            >
              {loading ? "…" : "↻"}
            </button>
          </div>
        </div>

        {error && (
          <div className="card error" style={{ padding: 12, marginBottom: 10, fontSize: 13 }}>
            Couldn't reach the scores feed ({error}).{" "}
            {matches.length > 0 ? "Showing the last saved data." : "Check your connection and refresh."}
          </div>
        )}
        {espnDown && (
          <AiCard
            title="Emergency scores via Gemini"
            ai={fallback}
            cta="✨ Ask Gemini for scores"
            note="The live feed is down. Gemini can search the web for the latest results — approximate, but better than nothing."
          />
        )}

        <WelcomeCard />

        <InstallCard compact />

        {day === today && <AiCard title="Daily digest" ai={digest} cta="✨ Write today's digest" />}

        <DatePager dates={DATES} selected={day} onSelect={setDay} />

        {loading && matches.length === 0 && (
          <div className="card" style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>
            <span className="pulse">Loading the schedule…</span>
          </div>
        )}

        {live.length > 0 && (
          <>
            <h2 className="disp section-h" style={{ color: "var(--live)" }}>LIVE NOW</h2>
            {live.map((m) => <MatchRow key={m.id} m={m} />)}
          </>
        )}
        {up.length > 0 && (
          <>
            <h2 className="disp section-h">UPCOMING</h2>
            {up.map((m) => <MatchRow key={m.id} m={m} />)}
          </>
        )}
        {done.length > 0 && (
          <>
            <h2 className="disp section-h" style={{ color: "var(--muted)" }}>RESULTS</h2>
            {done.map((m) => <MatchRow key={m.id} m={m} />)}
          </>
        )}
        {!loading && dayMatches.length === 0 && matches.length > 0 && (
          <div className="card" style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>
            No matches on this day — rest day for the tournament.
          </div>
        )}

        {fetchedAt && (
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 20px" }}>
            Updated {fetchedAt.toLocaleTimeString("en-IN", { timeZone: IST })} IST
            {stale ? " · some data is stale" : ""} · ESPN public feed · auto-refreshes during live play
          </p>
        )}
      </div>
    </>
  );
}
