/* ESPN public JSON API — keyless, CORS-open, but UNOFFICIAL: every parser here
   is defensive, and a failed section degrades to "not available", never a crash. */
import { resolveTeam } from "../data/teams.js";

const ESPN = "https://site.api.espn.com/apis";
const LEAGUE = "soccer/fifa.world";

async function getJson(url) {
  // no-store: we poll the same URLs for live data, and the browser HTTP cache
  // happily replays a cached body for the polling interval if ESPN sends a
  // max-age — the app then "refreshes" into the same stale score.
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

export function normalizeEvent(ev) {
  const comp = ev.competitions?.[0] || {};
  const cs = comp.competitors || [];
  const homeC = cs.find((c) => c.homeAway === "home") || cs[0] || {};
  const awayC = cs.find((c) => c.homeAway === "away") || cs[1] || {};
  const home = resolveTeam(homeC.team);
  const away = resolveTeam(awayC.team);
  const st = ev.status || {};
  const state = st.type?.state || "pre"; // pre | in | post
  let status = "UP";
  if (state === "in") status = st.type?.name === "STATUS_HALFTIME" ? "HT" : "LIVE " + (st.displayClock || "");
  if (state === "post") status = "FT";
  let stage = comp.notes?.[0]?.headline || "";
  if (!stage) stage = home.group && home.group === away.group ? "Group " + home.group : home.group ? "Knockout" : "Match";
  return {
    id: String(ev.id ?? ""),
    home,
    away,
    hg: state === "pre" ? null : Number(homeC.score ?? 0),
    ag: state === "pre" ? null : Number(awayC.score ?? 0),
    state,
    status,
    kickoff: ev.date,
    city: comp.venue?.address?.city || "",
    venue: comp.venue?.fullName || "",
    stage,
  };
}

export async function fetchScoreboard(fromYmd, toYmd, { bust = false } = {}) {
  // bust: minute-stamped param so ESPN's CDN edge can't replay a stale body
  // while we're polling a live match. Off for past/future fixtures so those
  // stay cacheable offline.
  const extra = bust ? `&_=${Math.floor(Date.now() / 60000)}` : "";
  const data = await getJson(`${ESPN}/site/v2/sports/${LEAGUE}/scoreboard?dates=${fromYmd}-${toYmd}${extra}`);
  return (data.events || []).map(normalizeEvent);
}

const stat = (entry, name) => entry.stats?.find((s) => s.name === name)?.value ?? 0;

export async function fetchStandings() {
  const data = await getJson(`${ESPN}/v2/sports/${LEAGUE}/standings`);
  const out = {};
  for (const child of data.children || []) {
    const m = (child.name || child.abbreviation || "").match(/Group\s+([A-L])/i);
    if (!m) continue;
    out[m[1].toUpperCase()] = (child.standings?.entries || []).map((e) => ({
      team: resolveTeam(e.team),
      p: stat(e, "gamesPlayed"), w: stat(e, "wins"), d: stat(e, "ties"), l: stat(e, "losses"),
      gf: stat(e, "pointsFor"), ga: stat(e, "pointsAgainst"), pts: stat(e, "points"),
    }));
  }
  if (Object.keys(out).length === 0) throw new Error("no group tables yet");
  return out;
}

/* Match summary: timeline, lineups, game info. Each section parsed independently. */
export async function fetchSummary(eventId) {
  const data = await getJson(`${ESPN}/site/v2/sports/${LEAGUE}/summary?event=${encodeURIComponent(eventId)}`);
  const out = { events: null, lineups: null, info: null };

  try {
    const list = data.keyEvents || [];
    out.events = list
      .map((ke) => {
        const typeText = ke.type?.text || "";
        const lower = typeText.toLowerCase();
        let kind = "event";
        if (lower.includes("own goal")) kind = "og";
        else if (lower.includes("penalty") && lower.includes("goal")) kind = "pen";
        else if (lower.includes("goal")) kind = "goal";
        else if (lower.includes("yellow")) kind = "yellow";
        else if (lower.includes("red")) kind = "red";
        else if (lower.includes("sub")) kind = "sub";
        return {
          kind,
          label: typeText,
          minute: ke.clock?.displayValue || "",
          team: ke.team ? resolveTeam(ke.team) : null,
          player: ke.participants?.[0]?.athlete?.displayName || "",
          text: ke.text || "",
        };
      })
      .filter((e) => e.kind !== "event" || e.text);
  } catch { /* timeline unavailable */ }

  try {
    const sides = {};
    for (const r of data.rosters || []) {
      const side = r.homeAway === "home" || r.homeAway === "away" ? r.homeAway : null;
      if (!side) continue;
      const roster = r.roster || [];
      sides[side] = {
        team: resolveTeam(r.team),
        formation: r.formation || "",
        starters: roster
          .filter((p) => p.starter)
          .map((p) => ({ name: p.athlete?.displayName || "?", pos: p.position?.abbreviation || "", jersey: p.jersey || "" })),
        subs: roster
          .filter((p) => !p.starter)
          .map((p) => ({ name: p.athlete?.displayName || "?", pos: p.position?.abbreviation || "", jersey: p.jersey || "" })),
      };
    }
    if (sides.home || sides.away) out.lineups = sides;
  } catch { /* lineups unavailable */ }

  try {
    const gi = data.gameInfo || {};
    out.info = {
      attendance: gi.attendance || null,
      venue: gi.venue?.fullName || "",
      city: gi.venue?.address?.city || "",
      referee: gi.officials?.[0]?.displayName || gi.officials?.[0]?.fullName || "",
    };
  } catch { /* info unavailable */ }

  return out;
}

/* Golden Boot. ESPN exposes leaders under a couple of shapes/hosts; try each and
   parse tolerantly. Throws only if nothing usable is found. */
export async function fetchScorers() {
  const candidates = [
    `${ESPN}/site/v2/sports/${LEAGUE}/leaders`,
    `https://site.web.api.espn.com/apis/site/v2/sports/${LEAGUE}/leaders`,
  ];
  for (const url of candidates) {
    try {
      const data = await getJson(url);
      const categories = data.leaders?.categories || data.categories || data.leaders || [];
      const findCat = (want) =>
        (Array.isArray(categories) ? categories : []).find((c) => {
          const n = `${c.name || ""} ${c.displayName || ""}`.toLowerCase();
          return n.includes(want) && !(want === "goal" && n.includes("against"));
        });
      const mapLeaders = (cat) =>
        (cat?.leaders || [])
          .map((l) => ({
            player: l.athlete?.displayName || l.athlete?.fullName || "?",
            team: resolveTeam(l.team || l.athlete?.team),
            value: Number(l.value ?? l.displayValue ?? 0),
          }))
          .filter((l) => l.value > 0)
          .slice(0, 10);
      const goals = mapLeaders(findCat("goal"));
      const assists = mapLeaders(findCat("assist"));
      if (goals.length || assists.length) return { goals, assists };
    } catch { /* try next shape */ }
  }
  throw new Error("scorers unavailable");
}
