import { useCallback, useEffect, useState } from "react";
import { fetchSummary } from "../lib/datasource.js";
import { cacheGet, cacheSet } from "../lib/storage.js";
import { useResume } from "./useResume.js";

/* Finished matches cache forever; live matches poll every 60s; upcoming
   matches poll every 5min so the confirmed starting XI (published roughly an
   hour before kickoff) appears without a reload. A match still marked "pre"
   after its kickoff time is stale data (a card once needed two manual
   refreshes to admit the match had started) — poll it at the live cadence. */
export function useMatchSummary(eventId, state, kickoff) {
  const kickedOff = kickoff && new Date(kickoff).getTime() < Date.now();
  const key = "sum:" + eventId;
  const [summary, setSummary] = useState(() => (eventId ? cacheGet(key) : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const s = await fetchSummary(eventId);
      // Merge over the previous summary: live data never goes backwards, so a
      // poll where one sub-call flaked (events/lineups/stats null) must not
      // blank sections that were already on screen.
      setSummary((prev) => {
        const merged = !prev ? s : {
          ...s,
          events: s.events ?? prev.events,
          lineups: s.lineups ?? prev.lineups,
          stats: s.stats ?? prev.stats,
          playerStats: s.playerStats ?? prev.playerStats,
          commentary: s.commentary ?? prev.commentary,
        };
        if (state === "post") cacheSet(key, merged);
        else cacheSet(key, merged, 5 * 60 * 1000);
        return merged;
      });
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [eventId, state, key]);

  useEffect(() => {
    if (!eventId) return undefined;
    const cached = cacheGet(key);
    const cachedIsLive = cached?.match?.state === "in";
    if (state === "post" && cached && !cachedIsLive) {
      setSummary(cached);
    } else {
      load();
    }
    if (state !== "in" && state !== "pre") return undefined;
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, state === "in" || kickedOff ? 60000 : 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [eventId, state, key, load, kickedOff]);

  useResume(() => {
    if (state === "in" || state === "pre") load();
  });

  return { summary, loading, error };
}
