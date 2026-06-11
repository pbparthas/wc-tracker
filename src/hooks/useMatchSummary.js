import { useCallback, useEffect, useState } from "react";
import { fetchSummary } from "../lib/espn.js";
import { cacheGet, cacheSet } from "../lib/storage.js";
import { useResume } from "./useResume.js";

/* Finished matches cache forever; live matches poll every 60s; upcoming
   matches poll every 5min so the confirmed starting XI (published roughly an
   hour before kickoff) appears without a reload. */
export function useMatchSummary(eventId, state) {
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
      setSummary(s);
      if (state === "post") cacheSet(key, s);
      else cacheSet(key, s, 5 * 60 * 1000);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [eventId, state, key]);

  useEffect(() => {
    if (!eventId) return undefined;
    if (!(state === "post" && cacheGet(key))) load();
    if (state !== "in" && state !== "pre") return undefined;
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, state === "in" ? 60000 : 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [eventId, state, key, load]);

  useResume(() => {
    if (state === "in" || state === "pre") load();
  });

  return { summary, loading, error };
}
