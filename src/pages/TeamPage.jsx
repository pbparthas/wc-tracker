import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import MatchRow from "../components/MatchRow.jsx";
import GroupTable from "../components/GroupTable.jsx";
import AiCard from "../components/AiCard.jsx";
import FavoriteStar from "../components/FavoriteStar.jsx";
import PlayerSheet from "../components/PlayerSheet.jsx";
import SquadList from "../components/SquadList.jsx";
import { TEAMS, GROUPS } from "../data/teams.js";
import { espnTeamId } from "../lib/espn.js";
import { computeThirdPlace } from "../lib/thirdPlace.js";
import { assembleBracket } from "../lib/bracket.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { useRoster } from "../hooks/useRoster.js";
import { useAiContent } from "../hooks/useAiContent.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { teamPrompt, roadPrompt } from "../lib/prompts.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function TeamPage() {
  const { code } = useParams();
  const team = TEAMS[code] ? { code, ...TEAMS[code] } : null;
  const { matches } = useSchedule();
  const { standings } = useStandings();
  const { favs } = useFavorites();
  const [picked, setPicked] = useState(null);

  const fixtures = matches.filter((m) => m.home.code === code || m.away.code === code);
  const inFixture = fixtures.length ? (fixtures[0].home.code === code ? fixtures[0].home : fixtures[0].away) : null;
  const roster = useRoster(code, espnTeamId(inFixture));
  const deepDive = useAiContent("team:" + code, () => teamPrompt(team, standings, fixtures), { ttlMs: WEEK });

  // Keyed by results played so far — every new final score invalidates the
  // cached scenario text, which is exactly when the maths changes.
  const played = fixtures.filter((m) => m.state === "post").length;
  const road = useAiContent(
    `road:${code}:${played}`,
    () => roadPrompt(team, standings, computeThirdPlace(standings), fixtures, assembleBracket(matches)),
    { ttlMs: 6 * 60 * 60 * 1000 }
  );

  if (!team) {
    return (
      <div className="wrap" style={{ paddingTop: 20 }}>
        <p style={{ color: "var(--muted)" }}>
          Unknown team. <Link to="/teams">All teams</Link>
        </p>
      </div>
    );
  }

  const group = GROUPS.find((g) => g.id === team.group);

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <Link to="/teams" style={{ fontSize: 13, textDecoration: "none" }}>← All teams</Link>

      <div className="card" style={{ padding: 16, margin: "10px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 40, lineHeight: 1 }}>{team.flag}</div>
            <div className="disp" style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 2px" }}>
              {team.name.toUpperCase()}
            </div>
            <div className="eyebrow">Group {team.group}</div>
          </div>
          <FavoriteStar code={code} />
        </div>
        <p style={{ fontSize: 14, marginTop: 10 }}>{team.trivia}</p>
        {favs.includes(code) && (
          <p style={{ fontSize: 11, color: "var(--saffron)", marginTop: 8 }}>
            ★ Favourite — their matches are pinned on the Matches tab
          </p>
        )}
      </div>

      <AiCard
        title="Road ahead — what do they need?"
        ai={road}
        cta="✨ Work it out"
        note="Qualification maths during the groups, the knockout path after — computed from the live tables."
      />

      <AiCard title={`${team.name} deep-dive`} ai={deepDive} cta="✨ Write deep-dive" />

      <h2 className="disp section-h">TOURNAMENT SQUAD</h2>
      <div className="card" style={{ padding: "6px 14px 12px" }}>
        <SquadList {...roster} onPick={setPicked} emptyNote="Squad not available from the data feed yet — check back closer to kickoff." />
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 2px" }}>
          The full squad registered for the tournament. The matchday starting XI is published on each
          match page about an hour before kickoff.
        </p>
      </div>

      {group && <GroupTable group={group} rows={standings[team.group]} />}

      {fixtures.length > 0 && (
        <>
          <h2 className="disp section-h">FIXTURES & RESULTS</h2>
          {fixtures.map((m) => (
            <MatchRow key={m.id} m={m} fav={favs.includes(code)} />
          ))}
        </>
      )}
      <div style={{ height: 20 }} />

      {picked && <PlayerSheet player={picked} team={team} onClose={() => setPicked(null)} />}
    </div>
  );
}
