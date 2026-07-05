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

  // A pre-match within 5 min of kickoff: poll so the flip to LIVE is caught.
  const kickoffSoon = data.matches.some((m) => {
    if (m.state !== "pre") return false;
    const delta = new Date(m.kickoff).getTime() - Date.now();
    return delta >= 0 && delta < 5 * 60 * 1000;
  });

  // A "pre" match whose kickoff has PASSED is stale data walking: either the
  // feed hasn't flipped it or our last fetch quietly fell back to a snapshot
  // (a match card once sat frozen on "1:30 AM" at 3:12 am, mid-match). Keep
  // polling through the whole plausible match window so the card recovers on
  // its own — the old 15-minute bound stopped exactly when recovery mattered.
  // Still bounded: a postponed fixture stops polling 150 min after kickoff.
  const probablyLive = data.matches.some((m) => {
    if (m.state !== "pre") return false;
    const delta = new Date(m.kickoff).getTime() - Date.now();
    return delta < 0 && delta > -150 * 60 * 1000;
  });

  const needsPoll = anyLive || kickoffSoon || probablyLive;

  useEffect(() => {
    if (!needsPoll) return undefined;
    const ms = anyLive || probablyLive ? 60000 : 120000;
    const t = setInterval(() => {
      if (!document.hidden) refresh(true);
    }, ms);
    return () => clearInterval(t);
  }, [needsPoll, anyLive, probablyLive, refresh]);

  useResume(() => refresh(true));

  return { ...data, loading, error, refresh };
}
