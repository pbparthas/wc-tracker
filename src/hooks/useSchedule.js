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

  // A match might have started but cache still says "pre" — detect this by
  // checking if any kickoff is in the past but state hasn't flipped yet.
  const kickoffSoon = data.matches.some(
    (m) => m.state === "pre" && new Date(m.kickoff).getTime() - Date.now() < 5 * 60 * 1000
  );

  useEffect(() => {
    if (!anyLive && !kickoffSoon) return undefined;
    const ms = anyLive ? 60000 : 120000;
    const t = setInterval(() => {
      if (!document.hidden) refresh(true);
    }, ms);
    return () => clearInterval(t);
  }, [anyLive, kickoffSoon, refresh]);

  useResume(() => refresh(true));

  return { ...data, loading, error, refresh };
}
