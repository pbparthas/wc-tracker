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
    /* Table zone markers (positions ≤ value). The fifth CL spot depends on
       UEFA coefficients — footnoted as approximate in the UI. */
    zones: { ucl: 4, uel: 5, conf: 6, releg: 17 },
  },
};

export function windowOpen(comp) {
  const iso = COMPETITIONS[comp]?.window?.closesIso;
  return !!iso && Date.now() < new Date(iso).getTime();
}
