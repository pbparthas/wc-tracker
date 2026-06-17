import { useCallback, useEffect, useState } from "react";
import { getFullSchedule } from "../lib/schedule.js";
import { useResume } from "./useResume.js";

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
    refresh(true);
  }, [refresh]);

  const anyLive = data.matches.some((m) => m.state === "in");

  const kickoffSoon = data.matches.some(
    (m) => m.state === "pre" && new Date(m.kickoff).getTime() - Date.now() < 5 * 60 * 1000
  );

  const recentlyStarted = data.matches.some(
    (m) => m.state === "pre" && new Date(m.kickoff).getTime() < Date.now()
  );

  const needsPoll = anyLive || kickoffSoon || recentlyStarted;

  useEffect(() => {
    if (!needsPoll) return undefined;
    const ms = anyLive ? 60000 : 120000;
    const t = setInterval(() => {
      if (!document.hidden) refresh(true);
    }, ms);
    return () => clearInterval(t);
  }, [needsPoll, anyLive, refresh]);

  useResume(() => refresh(true));

  return { ...data, loading, error, refresh };
}
