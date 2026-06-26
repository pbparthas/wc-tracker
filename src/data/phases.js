export const TOURNAMENT = { start: "2026-06-11", end: "2026-07-19" };

export const PHASES = [
  { label: "Group stage", dates: "11 – 27 June", detail: "72 matches · top 2 + 8 best third-placed teams advance" },
  { label: "Round of 32", dates: "28 June – 3 July", detail: "New knockout round, first time in history" },
  { label: "Round of 16", dates: "4 – 7 July", detail: "" },
  { label: "Quarter-finals", dates: "9 – 11 July", detail: "" },
  { label: "Semi-finals", dates: "14 – 15 July", detail: "Dallas & Atlanta" },
  { label: "Third place", dates: "18 July", detail: "Miami" },
  { label: "THE FINAL", dates: "19 July", detail: "MetLife Stadium, New York / New Jersey", final: true },
];

/* Knockout round date windows (IST date keys). These are the authoritative
   signal for bucketing fixtures into bracket columns — feeds mislabel the round
   note (e.g. the 48-team first KO round gets tagged "Round of 16" when it's the
   Round of 32). The `match` regex is only a fallback for date-less fixtures. */
export const ROUNDS = [
  { id: "R32", label: "Round of 32", from: "2026-06-28", to: "2026-07-03", size: 16, match: /round of 32/i },
  { id: "R16", label: "Round of 16", from: "2026-07-04", to: "2026-07-08", size: 8, match: /round of 16/i },
  { id: "QF", label: "Quarter-finals", from: "2026-07-09", to: "2026-07-12", size: 4, match: /quarter/i },
  { id: "SF", label: "Semi-finals", from: "2026-07-14", to: "2026-07-16", size: 2, match: /semi/i },
  { id: "THIRD", label: "Third place", from: "2026-07-18", to: "2026-07-18", size: 1, match: /third/i },
  { id: "FINAL", label: "Final", from: "2026-07-19", to: "2026-07-19", size: 1, match: /final/i },
];
