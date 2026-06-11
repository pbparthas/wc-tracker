import { useCallback, useEffect, useState } from "react";
import { fetchStandings } from "../lib/espn.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

const KEY = "standings";
const TTL = 5 * 60 * 1000;

export function useStandings() {
  const [standings, setStandings] = useState(() => cacheGet(KEY)?.v || {});
  const [fetchedAt, setFetchedAt] = useState(() => {
    const c = cacheGet(KEY);
    return c ? new Date(c.t) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (force = false) => {
    const cached = cacheGet(KEY);
    if (!force && cached && Date.now() - cached.t < TTL) {
      setStandings(cached.v);
      setFetchedAt(new Date(cached.t));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const v = await fetchStandings();
      cacheSet(KEY, { v, t: Date.now() });
      setStandings(v);
      setFetchedAt(new Date());
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { standings, fetchedAt, loading, error, refresh };
}
