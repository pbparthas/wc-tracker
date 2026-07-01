/* ESPN public JSON API — keyless, CORS-open, but UNOFFICIAL: every parser here
   is defensive, and a failed section degrades to "not available", never a crash. */
import { resolveTeam } from "../data/teams.js";
import { tableOrder } from "./thirdPlace.js";

const ESPN = "https://site.api.espn.com/apis";
const LEAGUE = "soccer/fifa.world"; // default: the World Cup; pass `league` for clubs

async function getJson(url) {
  // no-store: we poll the same URLs for live data, and the browser HTTP cache
  // happily replays a cached body for the polling interval if ESPN sends a
  // max-age — the app then "refreshes" into the same stale score.
  // The timeout matters: ESPN occasionally hangs, and an unbounded fetch can
  // block anything awaiting it (the match summary used to stall on this).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let res;
  try {
    res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
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
  const hasPens = homeC.shootoutScore != null && awayC.shootoutScore != null;
  return {
    id: String(ev.id ?? ""),
    home,
    away,
    hg: state === "pre" ? null : Number(homeC.score ?? 0),
    ag: state === "pre" ? null : Number(awayC.score ?? 0),
    phg: hasPens ? Number(homeC.shootoutScore) : null,
    pag: hasPens ? Number(awayC.shootoutScore) : null,
    state,
    status,
    kickoff: ev.date,
    city: comp.venue?.address?.city || "",
    venue: comp.venue?.fullName || "",
    stage,
  };
}

export async function fetchScoreboard(fromYmd, toYmd, { bust = false, league = LEAGUE } = {}) {
  const extra = bust ? `&_=${Math.floor(Date.now() / 60000)}` : "";
  const data = await getJson(`${ESPN}/site/v2/sports/${league}/scoreboard?dates=${fromYmd}-${toYmd}${extra}`);
  return (data.events || []).map(normalizeEvent);
}

export async function fetchLeagueMatches(league, { bust = false } = {}) {
  const extra = bust ? `&_=${Math.floor(Date.now() / 60000)}` : "";
  const data = await getJson(`${ESPN}/site/v2/sports/${league}/scoreboard?limit=100${extra}`);
  return (data.events || []).map(normalizeEvent);
}

/* ESPN's numeric team id: carried on live data when present, else recoverable
   from the logo URL (https://a.espncdn.com/i/teamlogos/soccer/500/{id}.png). */
export function espnTeamId(team) {
  if (team?.espnId) return team.espnId;
  const m = (team?.logo || "").match(/\/(\d+)\.png/);
  return m ? m[1] : null;
}

/* National-squad roster. ESPN ships athletes either flat or grouped by position. */
export async function fetchRoster(teamId, league = LEAGUE) {
  const data = await getJson(`${ESPN}/site/v2/sports/${league}/teams/${encodeURIComponent(teamId)}/roster`);
  const raw = (data.athletes || []).flatMap((a) => (Array.isArray(a.items) ? a.items : [a]));
  const players = raw
    .map((p) => ({
      id: String(p.id ?? ""),
      name: p.fullName || p.displayName || "",
      jersey: p.jersey || "",
      pos: p.position?.abbreviation || p.position?.name || "",
      posName: p.position?.displayName || p.position?.name || "",
      age: p.age || null,
      height: p.displayHeight || "",
      weight: p.displayWeight || "",
      headshot: p.headshot?.href || null,
    }))
    .filter((p) => p.name);
  if (!players.length) throw new Error("squad unavailable");
  return players;
}

const stat = (entry, name) => entry.stats?.find((s) => s.name === name)?.value ?? 0;

export async function fetchStandings() {
  const data = await getJson(`${ESPN}/v2/sports/${LEAGUE}/standings`);
  const out = {};
  for (const child of data.children || []) {
    const m = (child.name || child.abbreviation || "").match(/Group\s+([A-L])/i);
    if (!m) continue;
    // ESPN returns entries in draw order (A1, A2, …), NOT ranked — sort here
    // so tables, the third-place ranking and AI prompts all see real standings.
    out[m[1].toUpperCase()] = (child.standings?.entries || [])
      .map((e) => ({
        team: resolveTeam(e.team),
        p: stat(e, "gamesPlayed"), w: stat(e, "wins"), d: stat(e, "ties"), l: stat(e, "losses"),
        gf: stat(e, "pointsFor"), ga: stat(e, "pointsAgainst"), pts: stat(e, "points"),
      }))
      .sort(tableOrder);
  }
  if (Object.keys(out).length === 0) throw new Error("no group tables yet");
  return out;
}

function playerHeadshot(p) {
  if (p.athlete?.headshot?.href) return p.athlete.headshot.href;
  const id = p.athlete?.id;
  if (!id) return null;
  return `https://a.espncdn.com/i/headshots/soccer/players/full/${id}.png`;
}

/* Match summary: timeline, lineups, game info. Each section parsed independently. */
/* Stat rows worth showing, with the ESPN names they ship under. */
const STAT_ROWS = [
  ["Possession %", ["possessionPct"]],
  ["Shots", ["totalShots", "shots"]],
  ["On target", ["shotsOnTarget", "ontargetShots"]],
  ["Corners", ["wonCorners", "cornerKicks"]],
  ["Fouls", ["foulsCommitted", "fouls"]],
  ["Saves", ["saves"]],
  ["Offsides", ["offsides"]],
];

export async function fetchSummary(eventId, league = LEAGUE) {
  const data = await getJson(`${ESPN}/site/v2/sports/${league}/summary?event=${encodeURIComponent(eventId)}`);
  const out = { events: null, lineups: null, info: null, stats: null, commentary: null, match: null };

  try {
    const hComp = data.header?.competitions?.[0] || {};
    const hcs = hComp.competitors || [];
    const hHome = hcs.find((c) => c.homeAway === "home") || hcs[0] || {};
    const hAway = hcs.find((c) => c.homeAway === "away") || hcs[1] || {};
    const mt = (c) => ({
      code: c.team?.abbreviation || null,
      name: c.team?.displayName || c.team?.name || "TBD",
      flag: "", logo: c.team?.logos?.[0]?.href || c.team?.logo || null,
      espnId: c.team?.id ? String(c.team.id) : null,
    });
    const hst = hComp.status || {};
    const hState = hst.type?.state || "pre";
    let hStatus = "UP";
    if (hState === "in") hStatus = hst.type?.name === "STATUS_HALFTIME" ? "HT" : "LIVE " + (hst.displayClock || "");
    if (hState === "post") hStatus = "FT";
    const hasPens = hHome.shootoutScore != null && hAway.shootoutScore != null;
    out.match = {
      id: String(data.header?.id ?? eventId), home: mt(hHome), away: mt(hAway),
      hg: hState === "pre" ? null : Number(hHome.score ?? 0),
      ag: hState === "pre" ? null : Number(hAway.score ?? 0),
      phg: hasPens ? Number(hHome.shootoutScore) : null,
      pag: hasPens ? Number(hAway.shootoutScore) : null,
      state: hState, status: hStatus,
      kickoff: data.header?.gameDate || hComp.date || "",
      city: hComp.venue?.address?.city || "", venue: hComp.venue?.fullName || "",
      stage: hComp.notes?.[0]?.headline || "",
    };
  } catch { /* header unavailable */ }

  try {
    const list = data.keyEvents || [];
    out.events = list
      .map((ke) => {
        const typeText = ke.type?.text || "";
        const lower = typeText.toLowerCase();
        const isPen = lower.includes("penalty");
        const missed = lower.includes("missed") || lower.includes("saved");
        let kind = "event";
        if (lower.includes("own goal")) kind = "og";
        else if (isPen) kind = missed ? "miss" : "pen";
        else if (lower.includes("goal")) kind = "goal";
        else if (lower.includes("yellow")) kind = "yellow";
        else if (lower.includes("red card") || lower === "red") kind = "red";
        else if (lower.includes("sub")) kind = "sub";
        // Shootout kicks arrive as "Penalty - Scored/Missed" in the shootout
        // period — a regulation penalty comes through as a Goal. Use ESPN's
        // period/flags/text, or (when the match went to pens) any non-goal
        // penalty event as the fallback signal.
        const shootout = isPen && (
          ke.shootout === true
          || (ke.period?.number ?? 0) >= 5
          || /shoot/i.test(typeText + " " + (ke.text || ""))
          || (!lower.includes("goal") && out.match?.phg != null)
        );
        return {
          kind,
          label: typeText,
          minute: ke.clock?.displayValue || "",
          team: ke.team ? resolveTeam(ke.team) : null,
          player: ke.participants?.[0]?.athlete?.displayName || "",
          playerOut: kind === "sub" ? (ke.participants?.[1]?.athlete?.displayName || "") : "",
          shootout,
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
          .map((p) => ({ name: p.athlete?.displayName || "?", pos: p.position?.abbreviation || "", jersey: p.jersey || "", headshot: playerHeadshot(p) })),
        subs: roster
          .filter((p) => !p.starter)
          .map((p) => ({ name: p.athlete?.displayName || "?", pos: p.position?.abbreviation || "", jersey: p.jersey || "", headshot: playerHeadshot(p), subMinute: p.subbedIn?.displayValue || "" })),
      };
    }
    if (sides.home || sides.away) out.lineups = sides;
  } catch { /* lineups unavailable */ }

  try {
    // boxscore.teams usually carries homeAway; the header competitors map is
    // the fallback for payloads where it doesn't.
    const sideById = {};
    for (const c of data.header?.competitions?.[0]?.competitors || []) {
      if (c.team?.id) sideById[String(c.team.id)] = c.homeAway;
    }
    const sides = {};
    for (const t of data.boxscore?.teams || []) {
      const side = t.homeAway || sideById[String(t.team?.id)];
      if (side !== "home" && side !== "away") continue;
      const byName = {};
      for (const s of t.statistics || []) byName[s.name] = s.displayValue ?? s.value;
      sides[side] = byName;
    }
    if (sides.home && sides.away) {
      const pick = (m, names) => names.map((n) => m[n]).find((v) => v !== undefined) ?? null;
      const rows = STAT_ROWS
        .map(([label, names]) => ({ label, home: pick(sides.home, names), away: pick(sides.away, names) }))
        .filter((r) => r.home !== null && r.away !== null);
      if (rows.length) out.stats = rows;
    }
  } catch { /* stats unavailable */ }

  try {
    const list = (data.commentary || [])
      .map((c) => ({
        minute: c.time?.displayValue || c.play?.clock?.displayValue || "",
        text: c.text || c.play?.text || "",
        seq: Number(c.sequence ?? c.play?.sequence ?? 0),
      }))
      .filter((c) => c.text);
    if (list.length) {
      list.sort((a, b) => b.seq - a.seq); // latest first
      out.commentary = list.slice(0, 150); // cap localStorage weight per match
    }
  } catch { /* commentary unavailable */ }

  try {
    const gi = data.gameInfo || {};
    out.info = {
      attendance: gi.attendance || null,
      venue: gi.venue?.fullName || "",
      city: gi.venue?.address?.city || "",
      referee: gi.officials?.[0]?.displayName || gi.officials?.[0]?.fullName || "",
    };
  } catch { /* info unavailable */ }

  try {
    const ps = {};
    const sources = [
      ...(data.boxscore?.players || []),
      ...(data.players || []),
    ];
    for (const team of sources) {
      for (const cat of team.statistics || []) {
        const keys = cat.keys || cat.labels || [];
        for (const a of cat.athletes || []) {
          const name = a.athlete?.displayName;
          if (!name) continue;
          const s = {};
          const vals = a.stats || a.values || [];
          keys.forEach((k, i) => { s[k] = vals[i] ?? "0"; });
          if (a.athlete?.stats) {
            for (const [k, v] of Object.entries(a.athlete.stats)) s[k] = v;
          }
          ps[name] = { ...ps[name], ...s };
        }
      }
      if (team.athletes) {
        for (const a of team.athletes) {
          const name = a.athlete?.displayName || a.displayName;
          if (!name) continue;
          const s = {};
          for (const cat of a.categories || a.statistics || []) {
            const keys = cat.keys || cat.labels || [];
            const vals = cat.values || cat.stats || [];
            keys.forEach((k, i) => { s[k] = vals[i] ?? "0"; });
          }
          if (Object.keys(s).length) ps[name] = { ...ps[name], ...s };
        }
      }
    }
    if (Object.keys(ps).length) out.playerStats = ps;
  } catch { /* player stats unavailable */ }

  return out;
}

/* Club league extras ------------------------------------------------------ */

/* All clubs in a league (for the Clubs grid). Tries the teams endpoint under
   both hosts/shapes; as a last resort derives the list from the standings,
   which is known-good (it powers the table). */
export async function fetchTeams(league) {
  const candidates = [
    `${ESPN}/site/v2/sports/${league}/teams?limit=50`,
    `https://site.web.api.espn.com/apis/site/v2/sports/${league}/teams?limit=50`,
  ];
  for (const url of candidates) {
    try {
      const data = await getJson(url);
      const list = data.sports?.[0]?.leagues?.[0]?.teams || data.teams || data.items || [];
      const clubs = list
        .map((x) => {
          const t = x.team || x;
          return {
            id: String(t?.id ?? ""),
            name: t?.displayName || t?.name || "",
            abbr: (t?.abbreviation || "").toUpperCase(),
            logo: t?.logos?.[0]?.href || t?.logo || null,
          };
        })
        .filter((c) => c.id && c.name)
        .sort((a, b) => a.name.localeCompare(b.name));
      if (clubs.length) return clubs;
    } catch { /* try next */ }
  }
  const { rows } = await fetchLeagueTable(league);
  const clubs = rows
    .map((r) => ({ id: r.team.espnId, name: r.team.name, abbr: "", logo: r.team.logo }))
    .filter((c) => c.id && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!clubs.length) throw new Error("clubs unavailable");
  return clubs;
}

/* Flat league table (one division, no groups). */
export async function fetchLeagueTable(league) {
  const data = await getJson(`${ESPN}/v2/sports/${league}/standings`);
  const entries = (data.children || []).flatMap((c) => c.standings?.entries || []);
  const rows = entries
    .map((e) => ({
      team: { code: null, espnId: e.team?.id ? String(e.team.id) : null, name: e.team?.displayName || e.team?.name || "?", flag: "", logo: e.team?.logos?.[0]?.href || null },
      p: stat(e, "gamesPlayed"), w: stat(e, "wins"), d: stat(e, "ties"), l: stat(e, "losses"),
      gf: stat(e, "pointsFor"), ga: stat(e, "pointsAgainst"), pts: stat(e, "points"),
    }))
    .sort(tableOrder);
  if (!rows.length) throw new Error("table unavailable");
  return { rows, season: data.season?.displayName || data.season?.year || null };
}

/* Confirmed transfers. ESPN ships transactions under a couple of shapes/hosts;
   parse tolerantly and report only rows with a player and a destination. */
export function parseTransactions(data) {
  const raw = data?.transactions || data?.items || (Array.isArray(data) ? data : []);
  const team = (t) => t?.displayName || t?.name || t?.shortDisplayName || "";
  const moves = raw
    .filter(Boolean)
    .map((x) => {
      const f = x.from || x.fromTeam;
      const t = x.to || x.toTeam;
      return {
        date: x.date || x.displayDate || "",
        player: x.athlete?.displayName || x.athlete?.fullName || x.player?.displayName || "",
        from: team(f),
        to: team(t),
        fromId: f?.id ? String(f.id) : null,
        toId: t?.id ? String(t.id) : null,
        fromLogo: f?.logos?.[0]?.href || null,
        toLogo: t?.logos?.[0]?.href || null,
        fee: x.displayAmount || (x.amount ? String(x.amount) : "") || "",
        type: x.type?.text || x.type || "",
      };
    })
    .filter((m) => m.player && m.to);
  moves.sort((a, b) => new Date(b.date) - new Date(a.date));
  return moves;
}

export async function fetchTransactions(league) {
  const candidates = [
    `${ESPN}/site/v2/sports/${league}/transactions?limit=200`,
    `https://site.web.api.espn.com/apis/site/v2/sports/${league}/transactions?limit=200`,
  ];
  for (const url of candidates) {
    try {
      const moves = parseTransactions(await getJson(url));
      if (moves.length) return moves;
    } catch { /* try next shape */ }
  }
  throw new Error("transfers unavailable from the feed");
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
