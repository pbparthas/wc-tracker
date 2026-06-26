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

/* Bracket columns, in order. Each column's matches come from the static 2026
   skeleton (data/bracket2026.js); here we only need the column id and label. */
export const ROUNDS = [
  { id: "R32", label: "Round of 32" },
  { id: "R16", label: "Round of 16" },
  { id: "QF", label: "Quarter-finals" },
  { id: "SF", label: "Semi-finals" },
  { id: "THIRD", label: "Third place" },
  { id: "FINAL", label: "Final" },
];
