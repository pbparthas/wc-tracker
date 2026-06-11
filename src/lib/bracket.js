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
      const byStage = round.match.test(m.stage);
      // "final" matches "semi-final"/"quarter-final" too — require stage to NOT
      // match an earlier round when checking FINAL.
      if (round.id === "FINAL" && /semi|quarter|third|32|16/i.test(m.stage)) return false;
      const d = new Date(m.kickoff);
      const day = isNaN(d) ? null : istDateKey(d);
      const byDate = day !== null && day >= round.from && day <= round.to;
      return m.stage === "Knockout" || m.stage === "Match" ? byDate : byStage || byDate;
    });
    inRound.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    const picked = inRound.slice(0, round.size);
    picked.forEach((m) => used.add(m.id));
    while (picked.length < round.size) picked.push(null);
    return { ...round, matches: picked };
  });
}
