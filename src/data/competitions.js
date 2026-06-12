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
      closesIso: "2026-09-01T17:30:00Z", // expected ≈ 11 PM IST, 1 Sep — edit when confirmed
    },
    /* Table zone markers (positions ≤ value). England earned five Champions
       League places in 2025-26 via UEFA coefficients; cup winners can shift
       the Europa/Conference spots — footnoted as approximate in the UI. */
    zones: { ucl: 5, uel: 6, conf: 7, releg: 17 },
  },
};

export function windowOpen(comp) {
  const iso = COMPETITIONS[comp]?.window?.closesIso;
  return !!iso && Date.now() < new Date(iso).getTime();
}
