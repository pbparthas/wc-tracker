import { clearPrefix } from "./storage.js";

/* Caches that must not survive an app re-open: anything a user would call
   "the scores being stale". NOT purged: settings and favourites (user-owned,
   protected by storage's KEEP list), ai: stories (regenerating costs the
   user's Gemini quota), apif:* snapshots (the safety net that keeps the app
   alive through API-Football outages — purging those would resurrect the
   ESPN single-fixture bug), and slow-moving club data (clubs, squads, facts,
   season history — freshness there is handled by their own short TTLs). */
const VOLATILE = [
  "sched:",
  "sum:",
  "standings",
  "matches:",
  "table:",
  "scorers:",
  "assists:",
  "clubtransfers:",
  "clubinjuries:",
  "transfers:",
];

export function purgeVolatile() {
  for (const p of VOLATILE) clearPrefix(p);
}
