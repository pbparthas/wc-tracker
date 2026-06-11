import { useCallback, useEffect, useState } from "react";
import { getFullSchedule } from "../lib/schedule.js";

export function useSchedule() {
  const [data, setData] = useState({ matches: [], fetchedAt: null, stale: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getFullSchedule({ force }));
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const anyLive = data.matches.some((m) => m.state === "in");

  // While a match is live, re-evaluate every 60s (cache TTL drops to 60s for
  // today's chunk, so this refetches only what changed). Paused when hidden.
  useEffect(() => {
    if (!anyLive) return undefined;
    const t = setInterval(() => {
      if (!document.hidden) refresh();
    }, 60000);
    return () => clearInterval(t);
  }, [anyLive, refresh]);

  return { ...data, loading, error, refresh };
}
