import { useEffect, useState } from "react";
import { fetchInjuries } from "../lib/datasource.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

export function useInjuries(matchId) {
  const key = "inj:" + matchId;
  const [injuries, setInjuries] = useState(() => (matchId ? cacheGet(key) : null));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!matchId) return undefined;
    const cached = cacheGet(key);
    if (cached) { setInjuries(cached); return undefined; }
    let on = true;
    let timer;
    // Retry with backoff while the page is open, mirroring usePredictions —
    // a transient failure shouldn't hide the card until the next full reload.
    const DELAYS = [2500, 30000, 60000, 5 * 60 * 1000];
    const attempt = (i) => {
      setLoading(true);
      fetchInjuries(matchId)
        .then((d) => {
          if (!on) return;
          if (d) { cacheSet(key, d, 30 * 60 * 1000); setInjuries(d); }
          else timer = setTimeout(() => attempt(Math.min(i + 1, DELAYS.length - 1)), DELAYS[i]);
        })
        .finally(() => { if (on) setLoading(false); });
    };
    attempt(0);
    return () => { on = false; clearTimeout(timer); };
  }, [matchId, key]);

  return { injuries, loading };
}
