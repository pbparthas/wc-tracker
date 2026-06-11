export const IST = "Asia/Kolkata";

/* en-CA gives YYYY-MM-DD — sortable and safe as a map key */
export function istDateKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function istParts(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const fmt = (opts) => new Intl.DateTimeFormat("en-IN", { timeZone: IST, ...opts }).format(d);
  return {
    time: fmt({ hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase(),
    day: fmt({ weekday: "short", day: "numeric", month: "short" }),
    dateKey: istDateKey(d),
  };
}

export function istDayLabel(iso) {
  const p = istParts(iso);
  if (!p) return "";
  if (p.dateKey === istDateKey()) return "TONIGHT · " + p.day;
  if (p.dateKey === istDateKey(new Date(Date.now() + 86400000))) return "TOMORROW · " + p.day;
  return p.day;
}

export function istTimeNow() {
  return new Date().toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit" });
}

/* ESPN's ?dates= parameter wants UTC YYYYMMDD */
export const yyyymmdd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");

export const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

/* All IST date keys of the tournament, for the date pager */
export function dateKeyRange(startKey, endKey) {
  const out = [];
  let d = new Date(startKey + "T00:00:00Z");
  const end = new Date(endKey + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d = addDays(d, 1);
  }
  return out;
}

export function shortDayLabel(dateKey) {
  const d = new Date(dateKey + "T12:00:00Z");
  return {
    dow: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
    dm: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }),
  };
}
