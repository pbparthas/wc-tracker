/* Builds bracket columns from the fetched schedule. Knockout fixtures exist in
   ESPN's data (with TBD teams) well before the rounds begin, so the bracket
   renders early and fills in as teams qualify. Rounds are detected from the
   stage note when present, else from the official round date windows. */
import { ROUNDS } from "../data/phases.js";
import { istDateKey } from "./time.js";

export function assembleBracket(matches) {
  const ko = matches.filter((m) => m.stage && !/^group/i.test(m.stage));
  const used = new Set();
  return ROUNDS.map((round) => {
    const inRound = ko.filter((m) => {
      if (used.has(m.id)) return false;
      // "final" matches "semi-final"/"quarter-final" too — require stage to NOT
      // match an earlier round when checking FINAL.
      if (round.id === "FINAL" && /semi|quarter|third|32|16/i.test(m.stage)) return false;
      const d = new Date(m.kickoff);
      const day = isNaN(d) ? null : istDateKey(d);
      const byDate = day !== null && day >= round.from && day <= round.to;
      // The date window is the authoritative signal: feeds mislabel the round
      // note (ESPN tags the 48-team first KO round "Round of 16" when it's the
      // Round of 32), but a June-dated fixture still lands in R32 because that
      // round is assembled first and claims it by date. The stage note is the
      // fallback for fixtures whose kickoff rolls past the IST window edge
      // (e.g. the final at 19:00 UTC reads as the next IST day).
      const byStage = round.match.test(m.stage);
      return m.stage === "Knockout" || m.stage === "Match" ? byDate : byDate || byStage;
    });
    inRound.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    const picked = inRound.slice(0, round.size);
    picked.forEach((m) => used.add(m.id));
    while (picked.length < round.size) picked.push(null);
    return { ...round, matches: picked };
  });
}
