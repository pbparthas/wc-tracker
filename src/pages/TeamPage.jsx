import React from "react";
import { useParams, Link } from "react-router-dom";
import MatchRow from "../components/MatchRow.jsx";
import GroupTable from "../components/GroupTable.jsx";
import AiCard from "../components/AiCard.jsx";
import FavoriteStar from "../components/FavoriteStar.jsx";
import { TEAMS, GROUPS } from "../data/teams.js";
import { useSchedule } from "../hooks/useSchedule.js";
import { useStandings } from "../hooks/useStandings.js";
import { useAiContent } from "../hooks/useAiContent.js";
import { useFavorites } from "../hooks/useFavorites.js";
import { teamPrompt } from "../lib/prompts.js";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function TeamPage() {
  const { code } = useParams();
  const team = TEAMS[code] ? { code, ...TEAMS[code] } : null;
  const { matches } = useSchedule();
  const { standings } = useStandings();
  const { favs } = useFavorites();

  const fixtures = matches.filter((m) => m.home.code === code || m.away.code === code);
  const deepDive = useAiContent("team:" + code, () => teamPrompt(team, standings, fixtures), { ttlMs: WEEK });

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

      <AiCard title={`${team.name} deep-dive`} ai={deepDive} cta="✨ Write deep-dive" />

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
    </div>
  );
}
