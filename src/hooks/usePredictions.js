import { useEffect, useState } from "react";
import { fetchPredictions } from "../lib/datasource.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

export function usePredictions(matchId) {
  const key = "pred:" + matchId;
  const [predictions, setPredictions] = useState(() => (matchId ? cacheGet(key) : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId) return undefined;
    const cached = cacheGet(key);
    if (cached) { setPredictions(cached); return undefined; }
    let on = true;
    let timer;
    // One delayed retry: a single transient failure (throttle contention, a
    // proxy blip) used to leave the win-probability meter absent for the whole
    // visit — it only came back on a full reload.
    const attempt = (retriesLeft) => {
      setLoading(true);
      fetchPredictions(matchId)
        .then((d) => {
          if (!on) return;
          if (d) { cacheSet(key, d, 60 * 60 * 1000); setPredictions(d); }
          else if (retriesLeft > 0) timer = setTimeout(() => attempt(retriesLeft - 1), 2500);
        })
        .finally(() => { if (on) setLoading(false); });
    };
    attempt(1);
    return () => { on = false; clearTimeout(timer); };
  }, [matchId, key]);

  return { predictions, loading };
}
