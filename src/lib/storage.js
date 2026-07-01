/* Namespaced localStorage cache with TTL and an LRU cap on AI entries. */
const PREFIX = "wc26:";
const AI_PREFIX = PREFIX + "ai:";
const AI_MAX_ENTRIES = 200;

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const env = JSON.parse(raw);
    if (env.e && Date.now() > env.e) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return env.v;
  } catch {
    return null;
  }
}

export function cacheSet(key, value, ttlMs = Infinity) {
  const env = { v: value, t: Date.now(), e: Number.isFinite(ttlMs) ? Date.now() + ttlMs : null };
  const write = () => localStorage.setItem(PREFIX + key, JSON.stringify(env));
  try {
    write();
  } catch {
    pruneAi(Math.floor(AI_MAX_ENTRIES / 2));
    try { write(); } catch { /* storage full and unprunable — run without cache */ }
  }
  if (key.startsWith("ai:")) pruneAi(AI_MAX_ENTRIES);
}

export function cacheRemove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
}

/* User settings and UX flags survive a cache clear; only data does not.
   "favs" covers per-competition lists too (wc26:favs:epl, ...). */
const KEEP = new Set(
  ["geminiKey", "geminiModel", "welcomed", "installDismissed", "mode"].map((k) => PREFIX + k)
);

export function clearPrefix(sub = "") {
  const full = PREFIX + sub;
  const doomed = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(full) && !KEEP.has(k) && !k.startsWith(PREFIX + "favs")) {
      doomed.push(k);
    }
  }
  doomed.forEach((k) => localStorage.removeItem(k));
  return doomed.length;
}

function pruneAi(keepAtMost) {
  try {
    const entries = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(AI_PREFIX)) {
        try { entries.push({ k, t: JSON.parse(localStorage.getItem(k)).t || 0 }); }
        catch { entries.push({ k, t: 0 }); }
      }
    }
    if (entries.length <= keepAtMost) return;
    entries.sort((a, b) => a.t - b.t);
    entries.slice(0, entries.length - keepAtMost).forEach((e) => localStorage.removeItem(e.k));
  } catch { /* ignore */ }
}
