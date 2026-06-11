import { useEffect, useState } from "react";
import { fetchKickoffWeather } from "../lib/weather.js";
import { cacheGet, cacheSet } from "../lib/storage.js";

const TTL = 3 * 60 * 60 * 1000;

/* Forecast for kickoff; silently absent when offline, out of forecast range,
   or the city isn't recognised. Never blocks or errors the page. */
export function useWeather(id, city, kickoff, state) {
  const [wx, setWx] = useState(() => (id ? cacheGet("wx:" + id) : null));

  useEffect(() => {
    if (!id || state === "post") return undefined;
    const cached = cacheGet("wx:" + id);
    if (cached) {
      setWx(cached);
      return undefined;
    }
    let on = true;
    fetchKickoffWeather(city, kickoff)
      .then((w) => {
        if (w && on) {
          cacheSet("wx:" + id, w, TTL);
          setWx(w);
        }
      })
      .catch(() => { /* weather is decoration — never surface an error */ });
    return () => {
      on = false;
    };
  }, [id, city, kickoff, state]);

  return wx;
}
