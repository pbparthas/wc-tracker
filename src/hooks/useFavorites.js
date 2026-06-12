import { useCallback, useEffect, useState } from "react";

/* Starred-team lists, per competition: useFavorites() is the World Cup list
   (key "favs", unchanged); useFavorites("epl") stars Premier League clubs
   under its own key. Lists never mix. */
function read(ls) {
  try {
    return JSON.parse(localStorage.getItem(ls) || "[]");
  } catch {
    return [];
  }
}

export function useFavorites(comp) {
  const ls = comp ? `wc26:favs:${comp}` : "wc26:favs";
  const evt = ls + "-changed";
  const [favs, setFavs] = useState(() => read(ls));

  useEffect(() => {
    setFavs(read(ls));
    const sync = () => setFavs(read(ls));
    window.addEventListener(evt, sync);
    return () => window.removeEventListener(evt, sync);
  }, [ls, evt]);

  const toggle = useCallback(
    (code) => {
      const cur = read(ls);
      const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
      try { localStorage.setItem(ls, JSON.stringify(next)); } catch { /* ignore */ }
      window.dispatchEvent(new Event(evt));
    },
    [ls, evt]
  );

  const isFav = useCallback((code) => favs.includes(code), [favs]);

  return { favs, toggle, isFav };
}
