/* Competition registry — adding a competition should be a new entry here plus
   a homepage card, not new code. `slug` is ESPN's league path (the fallback
   feed). `kind: "cup"` marks UEFA-style competitions: no transfer window (the
   Matches tab is the landing page) and a league-phase table with its own
   qualification bands. `zones` are the table's coloured bands, top-down:
   `{ upTo }` marks positions <= N, `{ from }` positions >= N. */
export const COMPETITIONS = {
  epl: {
    id: "epl",
    name: "Premier League",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    slug: "soccer/eng.1",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in mid-June." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z",
      closesIso: "2026-09-01T17:30:00Z",
    },
    /* England earned five CL places in 2025-26 via UEFA coefficients; cup
       winners can shift the Europa/Conference spots — footnoted as approximate. */
    zones: [
      { upTo: 5, label: "Champions League", color: "var(--saffron)" },
      { upTo: 6, label: "Europa League", color: "var(--gold)" },
      { upTo: 7, label: "Conference League", color: "#7FB5FF" },
      { from: 18, label: "Relegation", color: "var(--live)" },
    ],
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
    zones: [
      { upTo: 5, label: "Champions League", color: "var(--saffron)" },
      { upTo: 6, label: "Europa League", color: "var(--gold)" },
      { upTo: 7, label: "Conference League", color: "#7FB5FF" },
      { from: 18, label: "Relegation", color: "var(--live)" },
    ],
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
    /* 18 teams; 16th is the relegation play-off. */
    zones: [
      { upTo: 4, label: "Champions League", color: "var(--saffron)" },
      { upTo: 6, label: "Europa League", color: "var(--gold)" },
      { upTo: 7, label: "Conference League", color: "#7FB5FF" },
      { from: 16, label: "Relegation", color: "var(--live)" },
    ],
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
    zones: [
      { upTo: 5, label: "Champions League", color: "var(--saffron)" },
      { upTo: 6, label: "Europa League", color: "var(--gold)" },
      { upTo: 7, label: "Conference League", color: "#7FB5FF" },
      { from: 18, label: "Relegation", color: "var(--live)" },
    ],
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
    /* 18 teams; 16th is the relegation play-off. */
    zones: [
      { upTo: 4, label: "Champions League", color: "var(--saffron)" },
      { upTo: 5, label: "Europa League", color: "var(--gold)" },
      { upTo: 6, label: "Conference League", color: "#7FB5FF" },
      { from: 16, label: "Relegation", color: "var(--live)" },
    ],
  },
  championship: {
    id: "championship",
    name: "EFL Championship",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    slug: "soccer/eng.2",
    season: { label: "2026-27", fixturesNote: "Fixtures are usually released in late June; the season kicks off in early August." },
    window: {
      label: "Summer transfer window",
      opensIso: "2026-06-01T00:00:00Z",
      closesIso: "2026-09-01T17:30:00Z",
    },
    /* 24 teams: top 2 up automatically, 3rd-6th into the play-offs. */
    zones: [
      { upTo: 2, label: "Promotion", color: "var(--saffron)" },
      { upTo: 6, label: "Play-offs", color: "var(--gold)" },
      { from: 22, label: "Relegation", color: "var(--live)" },
    ],
  },
  ucl: {
    id: "ucl",
    name: "Champions League",
    flag: "⭐",
    kind: "cup",
    slug: "soccer/uefa.champions",
    season: { label: "2026-27", fixturesNote: "The league-phase draw is in late August; matches run from mid-September." },
    /* 36-team league phase: top 8 straight to the last 16, 9-24 into the
       knockout play-off, the rest are out. */
    zones: [
      { upTo: 8, label: "Last 16", color: "var(--saffron)" },
      { upTo: 24, label: "Knockout play-off", color: "var(--gold)" },
      { from: 25, label: "Eliminated", color: "var(--live)" },
    ],
  },
  uel: {
    id: "uel",
    name: "Europa League",
    flag: "🏆",
    kind: "cup",
    slug: "soccer/uefa.europa",
    season: { label: "2026-27", fixturesNote: "The league-phase draw is in late August; matches run from late September." },
    zones: [
      { upTo: 8, label: "Last 16", color: "var(--saffron)" },
      { upTo: 24, label: "Knockout play-off", color: "var(--gold)" },
      { from: 25, label: "Eliminated", color: "var(--live)" },
    ],
  },
};

export function windowOpen(comp) {
  const iso = COMPETITIONS[comp]?.window?.closesIso;
  return !!iso && Date.now() < new Date(iso).getTime();
}
