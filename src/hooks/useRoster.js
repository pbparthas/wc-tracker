import { useEffect, useState } from "react";
import { fetchRoster } from "../lib/espn.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

const DAY = 24 * 60 * 60 * 1000;

/* Squad list for a team. teamId is ESPN's numeric id (espnTeamId); until the
   schedule has loaded it may be null, in which case the hook stays idle. */
export function useRoster(code, teamId) {
  const key = "roster:" + code;
  const [players, setPlayers] = useState(() => cacheGet(key));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cached = cacheGet(key);
    setPlayers(cached);
    setError(null);
    if (cached || !teamId) return undefined;
    let on = true;
    setLoading(true);
    fetchRoster(teamId)
      .then((p) => {
        cacheSet(key, p, DAY);
        if (on) setPlayers(p);
      })
      .catch((e) => {
        if (on) setError(e.message || String(e));
      })
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, [key, teamId]);

  return { players, loading, error };
}
