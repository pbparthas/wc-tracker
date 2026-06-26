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

/* Knockout round date windows (IST date keys) used to bucket fixtures into
   bracket columns when ESPN's stage note is missing or ambiguous. */
export const ROUNDS = [
  /* ESPN labels the first KO round "Round of 16" (legacy naming — they haven't
     updated for the 2026 48-team format). Accept both so those fixtures land in
     the R32 column. Matches are sorted by kickoff and capped at size 16, so the
     earliest 16 (June 28 – July 3) go to R32 and the rest fall through to R16. */
  { id: "R32", label: "Round of 32", from: "2026-06-28", to: "2026-07-03", size: 16, match: /round of (32|16)/i },
  { id: "R16", label: "Round of 16", from: "2026-07-04", to: "2026-07-08", size: 8, match: /round of 16/i },
  { id: "QF", label: "Quarter-finals", from: "2026-07-09", to: "2026-07-12", size: 4, match: /quarter/i },
  { id: "SF", label: "Semi-finals", from: "2026-07-14", to: "2026-07-16", size: 2, match: /semi/i },
  { id: "THIRD", label: "Third place", from: "2026-07-18", to: "2026-07-18", size: 1, match: /third/i },
  { id: "FINAL", label: "Final", from: "2026-07-19", to: "2026-07-19", size: 1, match: /final/i },
];
