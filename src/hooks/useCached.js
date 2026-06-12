import { useCallback, useEffect, useState } from "react";
import { cacheGet, cacheSet } from "../lib/storage.js";

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
        cacheSet(key, d, ttlMs);
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
