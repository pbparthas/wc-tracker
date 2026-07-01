/* API-Football via Cloudflare Worker proxy.
   The proxy holds the API key as a secret — nothing sensitive in the browser. */

/* Fixed: the production CSP's connect-src only whitelists this host, so a
   configurable proxy URL was a trap — any custom value would be silently
   blocked by the browser. */
const PROXY = "https://golazo-api-proxy.pbparthas.workers.dev";

/* Rate-guard every API-Football request through one queue so a burst can't spike
   the per-minute limit. A screen can want several calls at once (a match summary
   fetches fixture + lineups + events + stats + player-stats; once the leagues
   are live, five competitions can refresh together). Rather than fire them all
   at once — or crawl strictly one-at-a-time, which would leave live goal scorers
   waiting behind less-urgent calls — we cap how many are in flight and space
   their starts. Fast enough for live data, still no spike. Exported for testing. */
const MAX_CONCURRENT = 4;
const MIN_GAP_MS = 90;
const REQUEST_TIMEOUT_MS = 12000;
let apifActive = 0;
let apifLastStart = 0;
const apifQueue = [];

function apifSchedule() {
  if (apifActive >= MAX_CONCURRENT || apifQueue.length === 0) return;
  const wait = apifLastStart + MIN_GAP_MS - Date.now();
  if (wait > 0) { setTimeout(apifSchedule, wait); return; }
  const job = apifQueue.shift();
  apifActive++;
  apifLastStart = Date.now();
  Promise.resolve()
    .then(job.fn)
    .then(job.resolve, job.reject)
    .finally(() => { apifActive--; apifSchedule(); });
  apifSchedule(); // fill remaining slots — each start still honours the gap
}

export function throttle(fn) {
  return new Promise((resolve, reject) => {
    apifQueue.push({ fn, resolve, reject });
    apifSchedule();
  });
}

function apiFetch(endpoint, params = {}) {
  return throttle(() => rawApiFetch(endpoint, params));
}

async function rawApiFetch(endpoint, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${PROXY}/${endpoint}${qs ? "?" + qs : ""}`;
  // A hung request would otherwise block the whole serial queue.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new Error("API-Football rate limit reached — try again later");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${body ? ": " + body : ""}`);
  }
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(Object.values(data.errors).join("; "));
  }
  return data;
}

export async function testApiKey() {
  const data = await apiFetch("status");
  const sub = data.response?.subscription;
  const req = data.response?.requests;
  return {
    plan: sub?.plan || "unknown",
    remaining: req ? (Number(req.limit_day) - Number(req.current)) : null,
    limitDay: req?.limit_day || null,
  };
}

/* League IDs for competitions we care about */
export const LEAGUES = {
  worldcup: 1,
  epl: 39,
  laliga: 140,
  bundesliga: 78,
  seriea: 135,
  ligue1: 61,
  championship: 40,
  ucl: 2,
  uel: 3,
};

export async function fetchFixtures(leagueId, { season, date, live } = {}) {
  const params = { league: leagueId };
  if (season) params.season = season;
  if (date) params.date = date;
  if (live) params.live = "all";
  const data = await apiFetch("fixtures", params);
  return (data.response || []).map(normalizeFixture);
}

export async function fetchFixtureDetail(fixtureId) {
  const data = await apiFetch("fixtures", { id: fixtureId });
  const fixture = data.response?.[0];
  if (!fixture) throw new Error("Fixture not found");
  return normalizeFixture(fixture);
}

export async function fetchLineups(fixtureId) {
  const data = await apiFetch("fixtures/lineups", { fixture: fixtureId });
  return (data.response || []).map((team) => ({
    teamName: team.team?.name || "?",
    teamLogo: team.team?.logo || null,
    formation: team.formation || "",
    coach: team.coach?.name || "",
    coachPhoto: team.coach?.photo || null,
    starters: (team.startXI || []).map((p) => normPlayer(p.player)),
    subs: (team.substitutes || []).map((p) => normPlayer(p.player)),
  }));
}

export async function fetchFixtureEvents(fixtureId) {
  const data = await apiFetch("fixtures/events", { fixture: fixtureId });
  return (data.response || []).map((e) => ({
    minute: e.time?.elapsed || 0,
    extra: e.time?.extra || null,
    team: e.team?.name || "",
    teamLogo: e.team?.logo || null,
    player: e.player?.name || "",
    assist: e.assist?.name || "",
    type: e.type || "",
    detail: e.detail || "",
    comments: e.comments || "", // "Penalty Shootout" for shootout kicks
  }));
}

export async function fetchFixtureStats(fixtureId) {
  const data = await apiFetch("fixtures/statistics", { fixture: fixtureId });
  return (data.response || []).map((team) => ({
    teamName: team.team?.name || "?",
    stats: Object.fromEntries(
      (team.statistics || []).map((s) => [s.type, s.value])
    ),
  }));
}

export async function fetchPlayerStats(fixtureId) {
  const data = await apiFetch("fixtures/players", { fixture: fixtureId });
  return (data.response || []).map((team) => ({
    teamName: team.team?.name || "?",
    players: (team.players || []).map((p) => ({
      name: p.player?.name || "?",
      photo: p.player?.photo || null,
      rating: p.statistics?.[0]?.games?.rating || null,
      minutes: p.statistics?.[0]?.games?.minutes || 0,
      goals: p.statistics?.[0]?.goals?.total || 0,
      assists: p.statistics?.[0]?.goals?.assists || 0,
      shots: p.statistics?.[0]?.shots?.total || 0,
      shotsOn: p.statistics?.[0]?.shots?.on || 0,
      passes: p.statistics?.[0]?.passes?.total || 0,
      passAccuracy: p.statistics?.[0]?.passes?.accuracy || null,
      tackles: p.statistics?.[0]?.tackles?.total || 0,
      fouls: p.statistics?.[0]?.fouls?.committed || 0,
      cards: {
        yellow: p.statistics?.[0]?.cards?.yellow || 0,
        red: p.statistics?.[0]?.cards?.red || 0,
      },
    })),
  }));
}

export async function fetchLeagueTable(leagueId, season) {
  const data = await apiFetch("standings", { league: leagueId, season });
  const groups = data.response?.[0]?.league?.standings || [];
  const entries = groups.flat();
  return entries.map((e) => ({
    team: {
      name: e.team?.name || "?",
      logo: e.team?.logo || null,
      id: e.team?.id || null,
    },
    rank: e.rank || 0,
    p: e.all?.played ?? 0,
    w: e.all?.win ?? 0,
    d: e.all?.draw ?? 0,
    l: e.all?.lose ?? 0,
    gf: e.all?.goals?.for ?? 0,
    ga: e.all?.goals?.against ?? 0,
    pts: e.points ?? 0,
    form: e.form || "",
  }));
}

export async function fetchStandings(leagueId, season) {
  const data = await apiFetch("standings", { league: leagueId, season });
  return data.response?.[0]?.league?.standings || [];
}

export async function fetchPredictions(fixtureId) {
  const data = await apiFetch("predictions", { fixture: fixtureId });
  const pred = data.response?.[0];
  if (!pred) return null;
  return {
    percent: pred.predictions?.percent || {},
    winner: pred.predictions?.winner?.name || null,
    advice: pred.predictions?.advice || null,
    homeForm: pred.teams?.home?.last_5?.form || null,
    awayForm: pred.teams?.away?.last_5?.form || null,
  };
}

export async function fetchInjuries(fixtureId) {
  const data = await apiFetch("injuries", { fixture: fixtureId });
  return (data.response || []).map((i) => ({
    player: i.player?.name || "?",
    photo: i.player?.photo || null,
    team: i.team?.name || "",
    teamId: i.team?.id ?? null,
    teamLogo: i.team?.logo || null,
    type: i.player?.type || "",
    reason: i.player?.reason || "",
  }));
}

function mapLeader(e, i) {
  return {
    rank: i + 1,
    player: e.player?.name || "?",
    photo: e.player?.photo || null,
    nationality: e.player?.nationality || "",
    goals: e.statistics?.[0]?.goals?.total || 0,
    assists: e.statistics?.[0]?.goals?.assists || 0,
    appearances: e.statistics?.[0]?.games?.appearences || 0,
    team: e.statistics?.[0]?.team?.name || "",
    teamLogo: e.statistics?.[0]?.team?.logo || null,
    rating: e.statistics?.[0]?.games?.rating || null,
  };
}

export async function fetchTopScorers(leagueId, season) {
  const data = await apiFetch("players/topscorers", { league: leagueId, season });
  return (data.response || []).map(mapLeader);
}

export async function fetchTopAssists(leagueId, season) {
  const data = await apiFetch("players/topassists", { league: leagueId, season });
  return (data.response || []).map(mapLeader);
}

/* All clubs in a league/season, with API-Football team ids (needed for squads,
   transfers and per-player stats). */
export async function fetchTeams(leagueId, season) {
  const data = await apiFetch("teams", { league: leagueId, season });
  return (data.response || [])
    .map((x) => ({
      id: x.team?.id != null ? String(x.team.id) : "",
      name: x.team?.name || "",
      logo: x.team?.logo || null,
      code: x.team?.code || "",
      venue: x.venue?.name || "",
      city: x.venue?.city || "",
    }))
    .filter((c) => c.id && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const POS_ABBR = { Goalkeeper: "G", Defender: "D", Midfielder: "M", Attacker: "F" };

/* Current squad for a team. */
export async function fetchSquad(teamId) {
  const data = await apiFetch("players/squads", { team: teamId });
  const players = data.response?.[0]?.players || [];
  return players.map((p) => ({
    id: p.id != null ? String(p.id) : "",
    name: p.name || "?",
    jersey: p.number != null ? String(p.number) : "",
    pos: POS_ABBR[p.position] || (p.position || "")[0] || "",
    posName: p.position || "",
    age: p.age || null,
    headshot: p.photo || null,
  }));
}

/* Transfer history for a team's players. Flattened to one row per move; the
   caller filters by date/direction for a given window. */
export async function fetchTransfers(teamId) {
  const data = await apiFetch("transfers", { team: teamId });
  const out = [];
  for (const entry of data.response || []) {
    const player = entry.player?.name || "";
    const playerId = entry.player?.id != null ? String(entry.player.id) : null;
    for (const t of entry.transfers || []) {
      out.push({
        player,
        playerId,
        date: t.date || "",
        type: t.type || "",
        inId: t.teams?.in?.id != null ? String(t.teams.in.id) : null,
        inName: t.teams?.in?.name || "",
        inLogo: t.teams?.in?.logo || null,
        outId: t.teams?.out?.id != null ? String(t.teams.out.id) : null,
        outName: t.teams?.out?.name || "",
        outLogo: t.teams?.out?.logo || null,
      });
    }
  }
  out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return out;
}

function normalizeFixture(f) {
  return {
    id: String(f.fixture?.id || ""),
    date: f.fixture?.date || "",
    status: f.fixture?.status?.short || "",
    statusLong: f.fixture?.status?.long || "",
    elapsed: f.fixture?.status?.elapsed || null,
    venue: f.fixture?.venue?.name || "",
    city: f.fixture?.venue?.city || "",
    referee: f.fixture?.referee || "",
    home: {
      id: f.teams?.home?.id,
      name: f.teams?.home?.name || "?",
      logo: f.teams?.home?.logo || null,
      winner: f.teams?.home?.winner,
    },
    away: {
      id: f.teams?.away?.id,
      name: f.teams?.away?.name || "?",
      logo: f.teams?.away?.logo || null,
      winner: f.teams?.away?.winner,
    },
    goals: {
      home: f.goals?.home,
      away: f.goals?.away,
    },
    score: f.score || {},
    league: {
      id: f.league?.id,
      name: f.league?.name || "",
      logo: f.league?.logo || null,
      round: f.league?.round || "",
    },
  };
}

function normPlayer(p) {
  return {
    id: p?.id || null,
    name: p?.name || "?",
    number: p?.number || "",
    pos: p?.pos || "",
    grid: p?.grid || null,
    photo: p?.id ? `https://media.api-sports.io/football/players/${p.id}.png` : null,
  };
}
