/* Full 104-match schedule, fetched in 7-day chunks with tiered caching:
   finished chunks are immutable (never refetched), today's chunk refreshes
   every 60s during live play / 15min otherwise, future chunks every 12h. */
import { fetchScoreboard } from "./datasource.js";
import { cacheGet, cacheSet } from "./storage.js";
import { TOURNAMENT } from "../data/phases.js";
import { TEAMS } from "../data/teams.js";
import { yyyymmdd, addDays } from "./time.js";

const DAY = 86400000;
const CHUNK_DAYS = 7;

function buildChunks() {
  // Pad a day each side so timezone edges can't drop a match.
  const start = addDays(new Date(TOURNAMENT.start + "T00:00:00Z"), -1);
  const end = addDays(new Date(TOURNAMENT.end + "T00:00:00Z"), 1);
  const chunks = [];
  for (let d = start; d < end; d = addDays(d, CHUNK_DAYS)) {
    const to = new Date(Math.min(addDays(d, CHUNK_DAYS - 1).getTime(), end.getTime()));
    chunks.push({ from: d, to, key: `sched:${yyyymmdd(d)}-${yyyymmdd(to)}` });
  }
  return chunks;
}

const CHUNKS = buildChunks();

const dehydrate = (t) => ({ code: t.code, name: t.name, flag: t.flag, logo: t.logo || null, espnId: t.espnId || null });
const hydrate = (t) =>
  t.code && TEAMS[t.code]
    ? { code: t.code, logo: t.logo, espnId: t.espnId || null, ...TEAMS[t.code] }
    : { group: null, ...t };

function slim(m) {
  return { ...m, home: dehydrate(m.home), away: dehydrate(m.away) };
}
function fatten(m) {
  return { ...m, home: hydrate(m.home), away: hydrate(m.away) };
}

function ttlFor(chunk, cached) {
  const now = Date.now();
  // A chunk served by the ESPN fallback (numeric ids — API-Football fixtures
  // all carry the af- prefix) must never freeze, or a blip during a fetch
  // would pin that week on ESPN's data (wrong ids, mislabelled rounds)
  // permanently. Keep retrying the primary source instead.
  const fromFallback = cached.matches.some((m) => m.id != null && !String(m.id).startsWith("af-"));
  if (fromFallback) return 15 * 60 * 1000;
  if (chunk.to.getTime() + DAY < now) {
    // Past chunk: if everything is final it never changes; otherwise ESPN may lag.
    const allFinal = cached.matches.length > 0 && cached.matches.every((m) => m.state === "post");
    return allFinal ? Infinity : 15 * 60 * 1000;
  }
  if (chunk.from.getTime() - DAY > now) return 12 * 60 * 60 * 1000; // future fixtures
  const anyLive = cached.matches.some((m) => m.state === "in");
  return anyLive ? 60 * 1000 : 15 * 60 * 1000;
}

let inflight = null;

export function getFullSchedule({ force = false } = {}) {
  if (inflight) return inflight;
  inflight = load(force).finally(() => { inflight = null; });
  return inflight;
}

async function load(force) {
  const results = await Promise.all(
    CHUNKS.map(async (chunk) => {
      const cached = cacheGet(chunk.key);
      const isCurrent = chunk.from.getTime() - DAY <= Date.now() && chunk.to.getTime() + DAY >= Date.now();
      const fresh = cached && Date.now() - cached.fetchedAt < ttlFor(chunk, cached);
      const immutable = cached && !Number.isFinite(ttlFor(chunk, cached));
      if (cached && (immutable || (fresh && !(force && isCurrent)))) {
        return { ...cached, current: isCurrent };
      }
      try {
        const wasLive = !!cached && cached.matches.some((m) => m.state === "in");
        const bust = isCurrent && (wasLive || force);
        const matches = (await fetchScoreboard(yyyymmdd(chunk.from), yyyymmdd(chunk.to), { bust })).map(slim);
        const entry = { fetchedAt: Date.now(), matches };
        cacheSet(chunk.key, entry);
        return { ...entry, current: isCurrent };
      } catch (e) {
        if (cached) return { ...cached, current: isCurrent, stale: true };
        throw e;
      }
    })
  );

  const byId = new Map();
  for (const r of results) for (const m of r.matches) if (m.id) byId.set(m.id, m);
  const matches = [...byId.values()].map(fatten).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const today = results.find((r) => r.current);
  return { matches, fetchedAt: today ? new Date(today.fetchedAt) : new Date(), stale: results.some((r) => r.stale) };
}
