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

  // Mount is TTL-governed (60s during live play), NOT forced: six pages share
  // this hook, so tab-hopping would otherwise fire a redundant season fetch per
  // navigation. Force stays on the manual ↻ button and on app resume.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const anyLive = data.matches.some((m) => m.state === "in");

  // Bounded windows: a pre-match within 5 min of kickoff, or one that should
  // have started in the last 15 min (ESPN can lag flipping pre → in). Without
  // the lower bounds a match ESPN leaves stuck on "pre" would poll forever.
  const kickoffSoon = data.matches.some((m) => {
    if (m.state !== "pre") return false;
    const delta = new Date(m.kickoff).getTime() - Date.now();
    return delta >= 0 && delta < 5 * 60 * 1000;
  });

  const recentlyStarted = data.matches.some((m) => {
    if (m.state !== "pre") return false;
    const delta = new Date(m.kickoff).getTime() - Date.now();
    return delta < 0 && delta > -15 * 60 * 1000;
  });

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
