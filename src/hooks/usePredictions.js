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
    // Retry with backoff for as long as the page is open: a "one retry then
    // give up" policy left the win-probability meter missing for a whole live
    // match after two early failures. Settles at a 5-minute cadence so a page
    // parked days before kickoff stays cheap.
    const DELAYS = [2500, 30000, 60000, 5 * 60 * 1000];
    const attempt = (i) => {
      setLoading(true);
      fetchPredictions(matchId)
        .then((d) => {
          if (!on) return;
          if (d) { cacheSet(key, d, 60 * 60 * 1000); setPredictions(d); }
          else timer = setTimeout(() => attempt(Math.min(i + 1, DELAYS.length - 1)), DELAYS[i]);
        })
        .finally(() => { if (on) setLoading(false); });
    };
    attempt(0);
    return () => { on = false; clearTimeout(timer); };
  }, [matchId, key]);

  return { predictions, loading };
}
