/* API-Football via Cloudflare Worker proxy.
   The proxy holds the API key as a secret — nothing sensitive in the browser. */

const PROXY_KEY = "golazo:apifootball:proxy";
const DEFAULT_PROXY = "https://golazo-api-proxy.pbparthas.workers.dev";

export function getProxyUrl() {
  return localStorage.getItem(PROXY_KEY) || DEFAULT_PROXY;
}

export function setProxyUrl(url) {
  if (url && url !== DEFAULT_PROXY) localStorage.setItem(PROXY_KEY, url);
  else localStorage.removeItem(PROXY_KEY);
}

async function apiFetch(endpoint, params = {}) {
  const proxy = getProxyUrl();
  if (!proxy) throw new Error("No proxy URL configured");
  const qs = new URLSearchParams(params).toString();
  const url = `${proxy}/${endpoint}${qs ? "?" + qs : ""}`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error("Rate limit reached — free tier allows 100 req/day");
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

export async function fetchStandings(leagueId, season) {
  const data = await apiFetch("standings", { league: leagueId, season });
  return data.response?.[0]?.league?.standings || [];
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
