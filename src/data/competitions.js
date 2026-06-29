/* Competition registry — adding a league should be a new entry here plus a
   homepage card, not new code. `slug` is ESPN's league path. Dates are config,
   not gospel: edit freely when official dates land. */
export const COMPETITIONS = {
  epl: {
    id: "epl",
    name: "Premier League",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    slug: "soccer/eng.1",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in mid-June." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z", // summer window business — used to filter the transfer feed
      closesIso: "2026-09-01T17:30:00Z", // expected ≈ 11 PM IST, 1 Sep — edit when confirmed
    },
    /* Table zone markers (positions ≤ value). England earned five Champions
       League places in 2025-26 via UEFA coefficients; cup winners can shift
       the Europa/Conference spots — footnoted as approximate in the UI. */
    zones: { ucl: 5, uel: 6, conf: 7, releg: 17 },
  },
  laliga: {
    id: "laliga",
    name: "La Liga",
    flag: "🇪🇸",
    slug: "soccer/esp.1",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in mid-July." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z",
      closesIso: "2026-09-01T22:00:00Z",
    },
    zones: { ucl: 5, uel: 6, conf: 7, releg: 17 }, // 20 teams; European spots approximate
  },
  bundesliga: {
    id: "bundesliga",
    name: "Bundesliga",
    flag: "🇩🇪",
    slug: "soccer/ger.1",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in late June." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z",
      closesIso: "2026-09-01T20:00:00Z",
    },
    zones: { ucl: 4, uel: 6, conf: 7, releg: 15 }, // 18 teams; 16th is the relegation play-off
  },
  seriea: {
    id: "seriea",
    name: "Serie A",
    flag: "🇮🇹",
    slug: "soccer/ita.1",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in mid-July." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z",
      closesIso: "2026-09-01T18:00:00Z",
    },
    zones: { ucl: 5, uel: 6, conf: 7, releg: 17 }, // 20 teams; European spots approximate
  },
  ligue1: {
    id: "ligue1",
    name: "Ligue 1",
    flag: "🇫🇷",
    slug: "soccer/fra.1",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in mid-July." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z",
      closesIso: "2026-09-01T20:00:00Z",
    },
    zones: { ucl: 4, uel: 5, conf: 6, releg: 15 }, // 18 teams; 16th is the relegation play-off
  },
};

export function windowOpen(comp) {
  const iso = COMPETITIONS[comp]?.window?.closesIso;
  return !!iso && Date.now() < new Date(iso).getTime();
}
