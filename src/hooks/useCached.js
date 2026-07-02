import { useCallback, useEffect, useState } from "react";
import { cacheGet, cacheSet } from "../lib/storage.js";
import { isFallbackData } from "../lib/datasource.js";

/* ESPN fallback payloads and empty results are stopgaps, not facts: a clubs
   list cached for a week during a one-minute API-Football outage froze squads
   and transfers on the wrong id space for that whole week. Cap how long either
   may live so the next visit retries the primary source. */
const FALLBACK_TTL = 2 * 60 * 1000;
const EMPTY_TTL = 5 * 60 * 1000;

function effectiveTtl(data, ttlMs) {
  if (isFallbackData(data)) return Math.min(ttlMs, FALLBACK_TTL);
  if (Array.isArray(data) && data.length === 0) return Math.min(ttlMs, EMPTY_TTL);
  return ttlMs;
}

/* Cache-first fetch shared by the league surfaces (clubs, table, transfers):
   serve localStorage immediately, fetch when missing, force-refetch on demand. */
export function useCached(key, ttlMs, fetcher) {
  const [data, setData] = useState(() => cacheGet(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = cacheGet(key);
        if (cached) {
          setData(cached);
          return;
        }
      }
      setLoading(true);
      setError(null);
      try {
        const d = await fetcher();
        cacheSet(key, d, effectiveTtl(d, ttlMs));
        setData(d);
      } catch (e) {
        setError(e.message || String(e));
      }
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetcher is given inline; key identifies it
    [key, ttlMs]
  );

  useEffect(() => {
    setData(cacheGet(key));
    load();
  }, [key, load]);

  return { data, loading, error, refresh: () => load(true) };
}
