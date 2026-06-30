/* Unified data source: API-Football (via proxy) is always primary; ESPN is the
   fallback. Transforms API-Football responses to the shape the app expects.
   API-Football IDs are prefixed with "af-" to avoid collision with ESPN IDs. */
import { resolveTeam } from "../data/teams.js";
import { tableOrder } from "./thirdPlace.js";
import { cacheGet, cacheSet, clearPrefix } from "./storage.js";
import * as espn from "./espn.js";
import * as apif from "./apifootball.js";

const ID_PREFIX = "af-";

/* One-time migration: the app switched from a per-user ESPN/API-Football toggle
   to always-on API-Football. Old localStorage may hold ESPN-shaped fixtures
   (numeric ids) that mix badly with API-Football data (af- ids) and destabilise
   the match count — wipe those caches once so every chunk re-fetches from the
   single source. */
const SOURCE_VERSION = "apif-primary-v1";
try {
  if (localStorage.getItem("golazo:sourceVersion") !== SOURCE_VERSION) {
    clearPrefix("sched:");
    clearPrefix("sum:");
    clearPrefix("standings");
    localStorage.setItem("golazo:sourceVersion", SOURCE_VERSION);
  }
} catch { /* private mode — nothing to migrate */ }

function isApifId(id) {
  return String(id).startsWith(ID_PREFIX);
}

function stripPrefix(id) {
  return String(id).replace(ID_PREFIX, "");
}

/* ── Status map: API-Football short → our state/status ─────────────── */

function mapState(short) {
  if (["TBD", "NS"].includes(short)) return "pre";
  if (["1H", "2H", "ET", "P", "LIVE", "BT", "HT"].includes(short)) return "in";
  return "post";
}

function mapStatus(short, elapsed) {
  if (["TBD", "NS"].includes(short)) return "UP";
  if (short === "HT") return "HT";
  if (["1H", "2H", "ET", "P", "BT", "LIVE"].includes(short)) return "LIVE " + (elapsed || "");
  if (["FT", "AET", "PEN"].includes(short)) return "FT";
  return short;
}

/* ── Fixture → ESPN match format ──────────────────────────────────── */

function resolveApifTeam(t) {
  return resolveTeam({ name: t?.name, displayName: t?.name, logo: t?.logo });
}

function fixtureToMatch(f) {
  const state = mapState(f.status);
  const home = resolveApifTeam(f.home);
  const away = resolveApifTeam(f.away);
  home.logo = home.logo || f.home?.logo || null;
  away.logo = away.logo || f.away?.logo || null;

  let stage = f.league?.round || "";
  if (!stage && home.group && home.group === away.group) stage = "Group " + home.group;

  const pen = f.score?.penalty || {};

  return {
    id: ID_PREFIX + f.id,
    home,
    away,
    hg: state === "pre" ? null : (f.goals?.home ?? null),
    ag: state === "pre" ? null : (f.goals?.away ?? null),
    // Penalty-shootout score (null when there was no shootout) — used to show
    // the winner in knockout rounds where the 90/120-min score is level.
    phg: pen.home ?? null,
    pag: pen.away ?? null,
    state,
    status: mapStatus(f.status, f.elapsed),
    kickoff: f.date,
    city: f.city || "",
    venue: f.venue || "",
    stage,
    apifHomeId: f.home?.id || null,
    apifAwayId: f.away?.id || null,
  };
}

/* ── Scoreboard (schedule) ────────────────────────────────────────── */

let allFixturesCache = null;
let allFixturesFetchedAt = 0;
let allFixturesInflight = null;
const ALL_FIXTURES_TTL = 60 * 1000;
const ALL_FIXTURES_KEY = "apif:wc:fixtures";

async function getAllFixtures(bust) {
  const now = Date.now();
  if (allFixturesCache && !bust && now - allFixturesFetchedAt < ALL_FIXTURES_TTL) {
    return allFixturesCache;
  }
  // schedule.js fans out 6 chunk fetches at once; without this guard each one
  // fires its own full-season request — six identical calls that burn the
  // 100-req/day free tier and, when some 429, leave chunks reading from
  // different sources so the match count flickers between refreshes. Share one
  // in-flight request across all concurrent callers instead.
  if (allFixturesInflight) return allFixturesInflight;
  allFixturesInflight = apif
    .fetchFixtures(apif.LEAGUES.worldcup, { season: 2026 })
    .then((fixtures) => {
      allFixturesCache = fixtures;
      allFixturesFetchedAt = Date.now();
      cacheSet(ALL_FIXTURES_KEY, fixtures, 24 * 60 * 60 * 1000);
      return fixtures;
    })
    .finally(() => { allFixturesInflight = null; });
  return allFixturesInflight;
}

export async function fetchScoreboard(fromYmd, toYmd, opts = {}) {
  const from = fromYmd.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  const to = toYmd.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  const inRange = (f) => {
    const d = (f.date || "").slice(0, 10);
    return d >= from && d <= to;
  };
  try {
    const all = await getAllFixtures(opts.bust);
    return all.filter(inRange).map(fixtureToMatch);
  } catch {
    // API-Football unavailable (commonly a rate-limit / quota). Prefer the last
    // good API-Football snapshot; otherwise fall back to ESPN so the World Cup
    // keeps working. ESPN's wrong knockout-round labels no longer matter — the
    // bracket is built from the static 2026 skeleton and binds fixtures by date
    // and team, so it stays correct whatever ESPN calls the rounds.
    const snapshot = cacheGet(ALL_FIXTURES_KEY);
    if (snapshot) return snapshot.filter(inRange).map(fixtureToMatch);
    return espn.fetchScoreboard(fromYmd, toYmd, opts);
  }
}

/* ── Standings ────────────────────────────────────────────────────── */

export async function fetchStandings() {
  try {
    const raw = await apif.fetchStandings(apif.LEAGUES.worldcup, 2026);
    const out = {};
    for (const group of raw) {
      const m = (group[0]?.group || "").match(/Group\s+([A-L])/i);
      if (!m) continue;
      out[m[1].toUpperCase()] = group.map((e) => ({
        team: resolveTeam({ name: e.team?.name, displayName: e.team?.name, logo: e.team?.logo }),
        p: e.all?.played ?? 0,
        w: e.all?.win ?? 0,
        d: e.all?.draw ?? 0,
        l: e.all?.lose ?? 0,
        gf: e.all?.goals?.for ?? 0,
        ga: e.all?.goals?.against ?? 0,
        pts: e.points ?? 0,
      })).sort(tableOrder);
    }
    if (Object.keys(out).length === 0) throw new Error("no group tables");
    return out;
  } catch (e) {
    if (e.message === "no group tables") throw e;
    return espn.fetchStandings();
  }
}

/* ── Match summary ────────────────────────────────────────────────── */

function mapEventKind(type, detail) {
  const t = (type || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  if (t === "goal") {
    if (d.includes("missed")) return "miss"; // missed penalty (shootout or in-play)
    if (d.includes("own goal")) return "og";
    if (d.includes("penalty")) return "pen";
    return "goal";
  }
  if (t === "card") {
    if (d.includes("red") || d.includes("second yellow")) return "red";
    return "yellow";
  }
  if (t === "subst") return "sub";
  return "event";
}

export async function fetchSummary(eventId, league) {
  if (isApifId(eventId)) {
    return fetchApifSummary(stripPrefix(eventId));
  }
  return espn.fetchSummary(eventId, league);
}

async function findEspnId(fixture) {
  try {
    const date = fixture.date.slice(0, 10).replace(/-/g, "");
    const matches = await espn.fetchScoreboard(date, date);
    const homeName = (fixture.home?.name || "").toLowerCase();
    const awayName = (fixture.away?.name || "").toLowerCase();
    const found = matches.find((m) => {
      const mh = (m.home?.name || "").toLowerCase();
      const ma = (m.away?.name || "").toLowerCase();
      return (mh.includes(homeName) || homeName.includes(mh))
          && (ma.includes(awayName) || awayName.includes(ma));
    });
    return found?.id || null;
  } catch {
    return null;
  }
}

async function fetchApifSummary(fixtureId) {
  try {
    // Fetch the fixture first so we know its state. For a match that hasn't
    // kicked off, the timeline / stats / player-stats / commentary endpoints
    // return nothing — firing them anyway just saturates the request burst and
    // can starve the parallel predictions/injuries calls, so we skip them.
    const fixture = await apif.fetchFixtureDetail(fixtureId);
    const state = mapState(fixture.status);
    const isPre = state === "pre";

    const [lineups, events, stats, playerStats] = await Promise.all([
      apif.fetchLineups(fixtureId).catch(() => []),
      isPre ? [] : apif.fetchFixtureEvents(fixtureId).catch(() => []),
      isPre ? [] : apif.fetchFixtureStats(fixtureId).catch(() => []),
      isPre ? [] : apif.fetchPlayerStats(fixtureId).catch(() => []),
    ]);

    // Pull the matching ESPN summary in the background. API-Football can lag on
    // live timeline/stats (a 0-0 mid-match often has neither yet), so we use
    // ESPN's events/stats to fill in when ours are empty — plus its commentary,
    // which API-Football doesn't provide at all. None of this exists pre-match.
    const espnSummaryPromise = isPre
      ? Promise.resolve(null)
      : findEspnId(fixture).then((espnId) =>
          espnId ? espn.fetchSummary(espnId).catch(() => null) : null
        );

    const homeTeam = resolveApifTeam(fixture.home);
    const awayTeam = resolveApifTeam(fixture.away);
    homeTeam.logo = homeTeam.logo || fixture.home?.logo || null;
    awayTeam.logo = awayTeam.logo || fixture.away?.logo || null;

    const out = {
      match: {
        id: ID_PREFIX + fixture.id,
        home: homeTeam,
        away: awayTeam,
        hg: state === "pre" ? null : (fixture.goals?.home ?? null),
        ag: state === "pre" ? null : (fixture.goals?.away ?? null),
        phg: fixture.score?.penalty?.home ?? null,
        pag: fixture.score?.penalty?.away ?? null,
        state,
        status: mapStatus(fixture.status, fixture.elapsed),
        kickoff: fixture.date,
        city: fixture.city || "",
        venue: fixture.venue || "",
        stage: fixture.league?.round || "",
        apifHomeId: fixture.home?.id || null,
        apifAwayId: fixture.away?.id || null,
      },
      events: null,
      lineups: null,
      stats: null,
      commentary: null,
      info: null,
      playerStats: null,
    };

    // Events
    if (events.length) {
      out.events = events.map((e) => {
        const kind = mapEventKind(e.type, e.detail);
        const team = e.team ? resolveTeam({ name: e.team, displayName: e.team }) : null;
        const shootout = /shootout/i.test(e.comments || "");
        return {
          kind,
          label: e.detail || e.type || "",
          minute: String(e.minute) + (e.extra ? "+" + e.extra : "") + "'",
          team,
          player: e.player || "",
          playerOut: kind === "sub" ? (e.assist || "") : "",
          shootout,
          text: `${e.minute}' ${e.player}${e.assist ? " (" + e.assist + ")" : ""} — ${e.detail || e.type}`,
        };
      });

    }

    // Lineups
    if (lineups.length >= 2) {
      const mapSide = (lu, team) => ({
        team,
        formation: lu.formation || "",
        coach: lu.coach || "",
        coachPhoto: lu.coachPhoto || null,
        starters: lu.starters.map((p) => ({
          name: p.name,
          pos: p.pos || "",
          jersey: String(p.number || ""),
          headshot: p.photo || null,
          apifId: p.id || null,
        })),
        subs: lu.subs.map((p) => ({
          name: p.name,
          pos: p.pos || "",
          jersey: String(p.number || ""),
          headshot: p.photo || null,
          subMinute: "",
          apifId: p.id || null,
        })),
      });
      const homeLu = lineups.find((l) => l.teamName === fixture.home?.name) || lineups[0];
      const awayLu = lineups.find((l) => l.teamName === fixture.away?.name) || lineups[1];
      out.lineups = {
        home: mapSide(homeLu, homeTeam),
        away: mapSide(awayLu, awayTeam),
      };
    }

    // Stats
    if (stats.length >= 2) {
      const homeStats = stats.find((s) => s.teamName === fixture.home?.name) || stats[0];
      const awayStats = stats.find((s) => s.teamName === fixture.away?.name) || stats[1];
      const STAT_MAP = [
        ["Possession %", "Ball Possession"],
        ["Shots", "Total Shots"],
        ["On target", "Shots on Goal"],
        ["Expected goals", "expected_goals"],
        ["Corners", "Corner Kicks"],
        ["Fouls", "Fouls"],
        ["Saves", "Goalkeeper Saves"],
        ["Offsides", "Offsides"],
        ["Passes", "Total passes"],
        ["Pass accuracy", "Passes %"],
      ];
      out.stats = STAT_MAP
        .map(([label, apiKey]) => ({
          label,
          home: homeStats.stats[apiKey] != null ? String(homeStats.stats[apiKey]) : null,
          away: awayStats.stats[apiKey] != null ? String(awayStats.stats[apiKey]) : null,
        }))
        .filter((r) => r.home !== null && r.away !== null);
    }

    // Player stats
    if (playerStats.length) {
      const ps = {};
      for (const team of playerStats) {
        for (const p of team.players) {
          ps[p.name] = {
            minutesPlayed: String(p.minutes || 0),
            goals: String(p.goals || 0),
            assists: String(p.assists || 0),
            totalShots: String(p.shots || 0),
            shotsOnTarget: String(p.shotsOn || 0),
            totalPasses: String(p.passes || 0),
            passAccuracy: p.passAccuracy ? String(p.passAccuracy) + "%" : "0%",
            tackles: String(p.tackles || 0),
            foulsCommitted: String(p.fouls || 0),
            yellowCards: String(p.cards?.yellow || 0),
            redCards: String(p.cards?.red || 0),
            rating: p.rating || null,
          };
        }
      }
      if (Object.keys(ps).length) out.playerStats = ps;
    }

    // Info
    out.info = {
      attendance: null,
      venue: fixture.venue || "",
      city: fixture.city || "",
      referee: fixture.referee || "",
    };

    // ESPN supplement (best-effort): fill the timeline and stats when
    // API-Football hasn't populated them yet, and add commentary.
    const espnSummary = await espnSummaryPromise;
    if (espnSummary) {
      if (!out.events?.length && espnSummary.events?.length) out.events = espnSummary.events;
      if (!out.stats?.length && espnSummary.stats?.length) out.stats = espnSummary.stats;
      out.commentary = espnSummary.commentary || null;
    }

    return out;
  } catch {
    return espn.fetchSummary(fixtureId);
  }
}

/* ── Predictions (API-Football only) ─────────────────────────────── */

export async function fetchPredictions(matchId) {
  if (!isApifId(matchId)) return null;
  try {
    return await apif.fetchPredictions(stripPrefix(matchId));
  } catch {
    return null;
  }
}

/* ── Injuries (API-Football only) ────────────────────────────────── */

export async function fetchInjuries(matchId) {
  if (!isApifId(matchId)) return null;
  try {
    return await apif.fetchInjuries(stripPrefix(matchId));
  } catch {
    return null;
  }
}

/* ── Top scorers (API-Football preferred, ESPN fallback) ─────────── */

export async function fetchTopScorers() {
  try {
    const rows = await apif.fetchTopScorers(apif.LEAGUES.worldcup, 2026);
    if (rows.length) return { source: "apif", goals: rows };
  } catch { /* fallback to ESPN */ }
  const s = await espn.fetchScorers();
  return {
    source: "espn",
    goals: s.goals.map((g, i) => ({
      rank: i + 1,
      player: g.player,
      photo: null,
      team: g.team?.name || "",
      teamLogo: g.team?.logo || null,
      goals: g.value,
      assists: 0,
    })),
  };
}

/* ── League-mode helpers (EPL etc.) ──────────────────────────────── */

const APIF_LEAGUE_MAP = {
  "soccer/eng.1": { id: 39, season: 2026 },  // Premier League
  "soccer/esp.1": { id: 140, season: 2026 }, // La Liga
  "soccer/ger.1": { id: 78, season: 2026 },  // Bundesliga
  "soccer/ita.1": { id: 135, season: 2026 }, // Serie A
  "soccer/fra.1": { id: 61, season: 2026 },  // Ligue 1
};

function apifLeagueFor(espnSlug) {
  return APIF_LEAGUE_MAP[espnSlug] || null;
}

let leagueFixturesCache = {};
let leagueFixturesFetchedAt = {};
const LEAGUE_FIXTURES_TTL = 5 * 60 * 1000;

export async function fetchLeagueMatches(espnSlug, opts = {}) {
  const al = apifLeagueFor(espnSlug);
  if (!al) return espn.fetchLeagueMatches(espnSlug, opts);
  try {
    const now = Date.now();
    const cacheKey = `${al.id}:${al.season}`;
    if (
      leagueFixturesCache[cacheKey] &&
      !opts.bust &&
      now - (leagueFixturesFetchedAt[cacheKey] || 0) < LEAGUE_FIXTURES_TTL
    ) {
      return leagueFixturesCache[cacheKey];
    }
    const fixtures = await apif.fetchFixtures(al.id, { season: al.season });
    const matches = fixtures.map(fixtureToMatch);
    leagueFixturesCache[cacheKey] = matches;
    leagueFixturesFetchedAt[cacheKey] = now;
    return matches;
  } catch {
    return espn.fetchLeagueMatches(espnSlug, opts);
  }
}

export async function fetchLeagueSummary(eventId, espnSlug) {
  if (isApifId(eventId)) {
    return fetchApifSummary(stripPrefix(eventId));
  }
  return espn.fetchSummary(eventId, espnSlug);
}

export async function fetchLeagueTable(espnSlug) {
  const al = apifLeagueFor(espnSlug);
  if (!al) return espn.fetchLeagueTable(espnSlug);
  try {
    const rows = await apif.fetchLeagueTable(al.id, al.season);
    if (!rows.length) throw new Error("empty table");
    return {
      rows: rows.map((r) => ({
        team: { code: null, espnId: null, name: r.team.name, flag: "", logo: r.team.logo },
        p: r.p, w: r.w, d: r.d, l: r.l,
        gf: r.gf, ga: r.ga, pts: r.pts,
        form: r.form || "",
      })),
      season: String(al.season),
    };
  } catch {
    return espn.fetchLeagueTable(espnSlug);
  }
}

/* League scoring/assist leaders (API-Football only — no ESPN equivalent here). */
export async function fetchLeagueScorers(espnSlug) {
  const al = apifLeagueFor(espnSlug);
  if (!al) return [];
  try {
    return await apif.fetchTopScorers(al.id, al.season);
  } catch {
    return [];
  }
}

export async function fetchLeagueAssists(espnSlug) {
  const al = apifLeagueFor(espnSlug);
  if (!al) return [];
  try {
    return await apif.fetchTopAssists(al.id, al.season);
  } catch {
    return [];
  }
}

/* Clubs in a league. API-Football is preferred (its team ids unlock squads,
   transfers and player stats); ESPN is the fallback. */
export async function fetchLeagueClubs(espnSlug) {
  const al = apifLeagueFor(espnSlug);
  if (al) {
    try {
      const clubs = await apif.fetchTeams(al.id, al.season);
      if (clubs.length) return clubs;
    } catch { /* fall back to ESPN */ }
  }
  return espn.fetchTeams(espnSlug);
}

/* Current squad for a club, by API-Football team id. */
export async function fetchClubSquad(espnSlug, teamId) {
  if (!apifLeagueFor(espnSlug) || !teamId) return [];
  return apif.fetchSquad(teamId);
}

/* True when a transfer's date is on/after the window open — keeps last season's
   deals out of the current window's feed. Undated moves are excluded. */
export function isCurrentWindowMove(dateStr, sinceIso) {
  if (!sinceIso) return true;
  const d = new Date(dateStr).getTime();
  const since = new Date(sinceIso).getTime();
  return !isNaN(d) && !isNaN(since) && d >= since;
}

/* League-wide transfer feed. API-Football's /transfers is per-team only, so a
   whole-league feed would need one call PER CLUB (~20 per league) — which blows
   through the request quota almost immediately. So the structured league feed
   uses ESPN's single league-transactions endpoint instead. The AI "Confirmed
   moves" card (Gemini search) carries the live breadth; per-club pages can still
   pull richer API-Football detail on demand. */
export async function fetchLeagueTransfers(espnSlug) {
  return espn.fetchTransactions(espnSlug);
}

/* A club's transfers for the current window, mapped to the move shape the club
   page already renders (in = arriving, out = leaving). API-Football's per-team
   transfer feed is the whole history, so we keep only the current window. */
export async function fetchClubTransfers(espnSlug, teamId, { sinceIso } = {}) {
  if (!apifLeagueFor(espnSlug) || !teamId) return [];
  const raw = await apif.fetchTransfers(teamId);
  return raw
    .filter((t) => (t.inId === teamId || t.outId === teamId))
    .filter((t) => isCurrentWindowMove(t.date, sinceIso))
    .map((t) => ({
      player: t.player,
      date: t.date,
      from: t.outName,
      to: t.inName,
      fromId: t.outId,
      toId: t.inId,
      fromLogo: t.outLogo,
      toLogo: t.inLogo,
      fee: t.type && t.type !== "N/A" ? t.type : "",
      type: t.type,
    }));
}
