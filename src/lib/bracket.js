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
      // "final" matches "semi-/quarter-/third-place final" too — require the
      // stage to NOT match an earlier round when checking FINAL.
      if (round.id === "FINAL" && /semi|quarter|third|3rd|32|16/i.test(m.stage)) return false;
      const d = new Date(m.kickoff);
      const day = isNaN(d) ? null : istDateKey(d);
      const byDate = day !== null && day >= round.from && day <= round.to;
      // The feed's round label is the reliable separator. Dates can't tell
      // adjacent rounds apart in IST — a R32 match kicking off July 3 night US
      // time reads as July 4 IST and collides with the R16 window — so we lean
      // on the API-Football round note ("Round of 32", "Round of 16", …) and
      // assemble R32 first so it claims its fixtures by label. The date window
      // is the fallback for fixtures whose note is generic ("Knockout"/"Match")
      // or whose kickoff rolls past the IST window edge (the final at 19:00 UTC
      // reads as the next IST day).
      const byStage = round.match.test(m.stage);
      return m.stage === "Knockout" || m.stage === "Match" ? byDate : byStage || byDate;
    });
    inRound.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
    const picked = inRound.slice(0, round.size);
    picked.forEach((m) => used.add(m.id));
    while (picked.length < round.size) picked.push(null);
    return { ...round, matches: picked };
  });
}
