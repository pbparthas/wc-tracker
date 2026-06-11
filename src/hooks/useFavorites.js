import { useCallback, useEffect, useState } from "react";

const LS = "wc26:favs";
const EVT = "wc26:favs-changed";

function read() {
  try {
    return JSON.parse(localStorage.getItem(LS) || "[]");
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favs, setFavs] = useState(read);

  useEffect(() => {
    const sync = () => setFavs(read());
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);

  const toggle = useCallback((code) => {
    const cur = read();
    const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
    try { localStorage.setItem(LS, JSON.stringify(next)); } catch { /* ignore */ }
    window.dispatchEvent(new Event(EVT));
  }, []);

  const isFav = useCallback((code) => favs.includes(code), [favs]);

  return { favs, toggle, isFav };
}
