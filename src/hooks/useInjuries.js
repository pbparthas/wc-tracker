import { useEffect, useState } from "react";
import { fetchInjuries } from "../lib/datasource.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

export function useInjuries(matchId) {
  const key = "inj:" + matchId;
  const [injuries, setInjuries] = useState(() => (matchId ? cacheGet(key) : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const cached = cacheGet(key);
    if (cached) { setInjuries(cached); return; }
    setLoading(true);
    fetchInjuries(matchId)
      .then((d) => {
        if (d) { cacheSet(key, d, 30 * 60 * 1000); setInjuries(d); }
      })
      .finally(() => setLoading(false));
  }, [matchId, key]);

  return { injuries, loading };
}
