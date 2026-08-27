/* Full league-season fixtures from ESPN, fetched in monthly date-chunks with
   tiered caching — the league equivalent of schedule.js (the World Cup loader).

   ESPN's /scoreboard is scoped to the current matchday unless a `dates=` window
   is passed, which is why a plain call returned a single fixture. We sweep the
   whole season (Jul→Jun) a month at a time and merge, so the Matches tab shows
   every round. Past months are immutable and cached forever; the current month
   refreshes on the live cadence; future months rarely. */
import * as espn from "./espn.js";
import { cacheGet, cacheSet } from "./storage.js";
import { yyyymmdd } from "./time.js";

const DAY = 86400000;

/* The active season's window, derived from the date so it never needs a yearly
   config bump: a domestic season runs Aug→May, so Jul marks the changeover. */
export function seasonWindow(now = new Date()) {
  const y = now.getUTCFullYear();
  const startYear = now.getUTCMonth() >= 6 ? y : y - 1; // Jul (month 6) onward
  return {
    start: new Date(Date.UTC(startYear, 6, 1)),   // 1 Jul
    end: new Date(Date.UTC(startYear + 1, 5, 30)), // 30 Jun next year
  };
}

function monthChunks(win) {
  const chunks = [];
  let d = new Date(Date.UTC(win.start.getUTCFullYear(), win.start.getUTCMonth(), 1));
  while (d <= win.end) {
    const from = new Date(d);
    const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); // last day of month
    chunks.push({ from, to, ym: `${from.getUTCFullYear()}${String(from.getUTCMonth() + 1).padStart(2, "0")}` });
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  }
  return chunks;
}

function ttlFor(chunk, cached) {
  const now = Date.now();
  if (chunk.to.getTime() + DAY < now) {
    // Past month: immutable once every fixture in it is finished.
    const allFinal = cached.matches.length > 0 && cached.matches.every((m) => m.state === "post");
    return allFinal ? Infinity : 30 * 60 * 1000;
  }
  if (chunk.from.getTime() - DAY > now) return 12 * 60 * 60 * 1000; // future month
  const anyLive = cached.matches.some((m) => m.state === "in");
  return anyLive ? 60 * 1000 : 15 * 60 * 1000; // current month
}

/* Full season for one ESPN league slug (e.g. "soccer/eng.1"), merged + sorted.
   opts.bust forces a refetch of the current month (manual refresh / live). */
export async function fetchLeagueSeason(slug, { bust = false } = {}) {
  const chunks = monthChunks(seasonWindow());
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const key = `lsched:${slug}:${chunk.ym}`;
      const cached = cacheGet(key);
      const isCurrent = chunk.from.getTime() - DAY <= Date.now() && chunk.to.getTime() + DAY >= Date.now();
      const fresh = cached && Date.now() - cached.fetchedAt < ttlFor(chunk, cached);
      const immutable = cached && !Number.isFinite(ttlFor(chunk, cached));
      if (cached && (immutable || (fresh && !(bust && isCurrent)))) return cached.matches;
      try {
        const matches = await espn.fetchScoreboard(yyyymmdd(chunk.from), yyyymmdd(chunk.to), {
          league: slug,
          bust: isCurrent && bust,
        });
        // Store with no envelope expiry; refetch is governed by fetchedAt +
        // ttlFor above, and an expired envelope would drop the last-good month.
        cacheSet(key, { fetchedAt: Date.now(), matches });
        return matches;
      } catch {
        return cached?.matches || []; // keep the last good month on a blip
      }
    })
  );

  const byId = new Map();
  for (const list of results) for (const m of list) if (m.id) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
}
