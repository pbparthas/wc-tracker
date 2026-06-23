import { useEffect, useState } from "react";
import { fetchPredictions } from "../lib/datasource.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

export function usePredictions(matchId) {
  const key = "pred:" + matchId;
  const [predictions, setPredictions] = useState(() => (matchId ? cacheGet(key) : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const cached = cacheGet(key);
    if (cached) { setPredictions(cached); return; }
    setLoading(true);
    fetchPredictions(matchId)
      .then((d) => {
        if (d) { cacheSet(key, d, 60 * 60 * 1000); setPredictions(d); }
      })
      .finally(() => setLoading(false));
  }, [matchId, key]);

  return { predictions, loading };
}
