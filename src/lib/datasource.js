/* Unified data source: API-Football (via proxy) when enabled, ESPN as fallback.
   Transforms API-Football responses to match the ESPN format the app expects. */
import { resolveTeam } from "../data/teams.js";
import { tableOrder } from "./thirdPlace.js";
import * as espn from "./espn.js";
import * as apif from "./apifootball.js";

const FLAG_KEY = "golazo:useApiFootball";

export function isApiFootballEnabled() {
  return localStorage.getItem(FLAG_KEY) === "1";
}

export function setApiFootballEnabled(on) {
  if (on) localStorage.setItem(FLAG_KEY, "1");
  else localStorage.removeItem(FLAG_KEY);
}

/* ── Status map: API-Football short → our state/status ─────────────── */

function mapState(short) {
  if (["TBD", "NS"].includes(short)) return "pre";
  if (["1H", "2H", "ET", "P", "LIVE", "BT"].includes(short)) return "in";
  if (["HT"].includes(short)) return "in";
  return "post"; // FT, AET, PEN, WO, AWD, CANC, ABD, PST, SUSP, INT
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

  return {
    id: f.id,
    home,
    away,
    hg: state === "pre" ? null : (f.goals?.home ?? null),
    ag: state === "pre" ? null : (f.goals?.away ?? null),
    state,
    status: mapStatus(f.status, f.elapsed),
    kickoff: f.date,
    city: f.city || "",
    venue: f.venue || "",
    stage,
  };
}

/* ── Scoreboard (schedule) ────────────────────────────────────────── */

let allFixturesCache = null;
let allFixturesFetchedAt = 0;
const ALL_FIXTURES_TTL = 60 * 1000;

async function getAllFixtures(bust) {
  const now = Date.now();
  if (allFixturesCache && !bust && now - allFixturesFetchedAt < ALL_FIXTURES_TTL) {
    return allFixturesCache;
  }
  const fixtures = await apif.fetchFixtures(apif.LEAGUES.worldcup, { season: 2026 });
  allFixturesCache = fixtures;
  allFixturesFetchedAt = now;
  return fixtures;
}

export async function fetchScoreboard(fromYmd, toYmd, opts = {}) {
  if (!isApiFootballEnabled()) return espn.fetchScoreboard(fromYmd, toYmd, opts);
  try {
    const all = await getAllFixtures(opts.bust);
    const from = fromYmd.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
    const to = toYmd.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
    const filtered = all.filter((f) => {
      const d = f.date.slice(0, 10);
      return d >= from && d <= to;
    });
    return filtered.map(fixtureToMatch);
  } catch {
    return espn.fetchScoreboard(fromYmd, toYmd, opts);
  }
}

/* ── Standings ────────────────────────────────────────────────────── */

export async function fetchStandings() {
  if (!isApiFootballEnabled()) return espn.fetchStandings();
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
  if (!isApiFootballEnabled()) return espn.fetchSummary(eventId, league);
  try {
    const [fixture, lineups, events, stats, playerStats] = await Promise.all([
      apif.fetchFixtureDetail(eventId),
      apif.fetchLineups(eventId).catch(() => []),
      apif.fetchFixtureEvents(eventId).catch(() => []),
      apif.fetchFixtureStats(eventId).catch(() => []),
      apif.fetchPlayerStats(eventId).catch(() => []),
    ]);

    const state = mapState(fixture.status);
    const homeTeam = resolveApifTeam(fixture.home);
    const awayTeam = resolveApifTeam(fixture.away);
    homeTeam.logo = homeTeam.logo || fixture.home?.logo || null;
    awayTeam.logo = awayTeam.logo || fixture.away?.logo || null;

    const out = {
      match: {
        id: fixture.id,
        home: homeTeam,
        away: awayTeam,
        hg: state === "pre" ? null : (fixture.goals?.home ?? null),
        ag: state === "pre" ? null : (fixture.goals?.away ?? null),
        state,
        status: mapStatus(fixture.status, fixture.elapsed),
        kickoff: fixture.date,
        city: fixture.city || "",
        venue: fixture.venue || "",
        stage: fixture.league?.round || "",
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
        return {
          kind,
          label: e.detail || e.type || "",
          minute: String(e.minute) + (e.extra ? "+" + e.extra : "") + "'",
          team,
          player: e.player || "",
          playerOut: kind === "sub" ? (e.assist || "") : "",
          text: `${e.minute}' ${e.player}${e.assist ? " (" + e.assist + ")" : ""} — ${e.detail || e.type}`,
        };
      });
    }

    // Lineups
    if (lineups.length >= 2) {
      const mapSide = (lu, team) => ({
        team,
        formation: lu.formation || "",
        starters: lu.starters.map((p) => ({
          name: p.name,
          pos: p.pos || "",
          jersey: String(p.number || ""),
          headshot: p.photo || null,
        })),
        subs: lu.subs.map((p) => ({
          name: p.name,
          pos: p.pos || "",
          jersey: String(p.number || ""),
          headshot: p.photo || null,
          subMinute: "",
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
        ["Corners", "Corner Kicks"],
        ["Fouls", "Fouls"],
        ["Saves", "Goalkeeper Saves"],
        ["Offsides", "Offsides"],
        ["Passes", "Total passes"],
        ["Pass accuracy", "Passes %"],
        ["Expected goals", "expected_goals"],
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

    return out;
  } catch {
    return espn.fetchSummary(eventId, league);
  }
}
