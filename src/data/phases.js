/* IST-first: the app buckets matches by their IST calendar day, and every US
   evening kickoff lands in the small hours of the NEXT day in India. The final
   is 19 July in New York but kicks off 12:30 AM on 20 JULY IST — so the
   tournament window and all phase dates below are the IST days, or the date
   pager's last day would show the third-place match and the final would never
   appear at all. */
export const TOURNAMENT = { start: "2026-06-11", end: "2026-07-20" };

export const PHASES = [
  { label: "Group stage", dates: "11 – 28 June", detail: "72 matches · top 2 + 8 best third-placed teams advance" },
  { label: "Round of 32", dates: "29 June – 4 July", detail: "New knockout round, first time in history" },
  { label: "Round of 16", dates: "4 – 8 July", detail: "" },
  { label: "Quarter-finals", dates: "10 – 12 July", detail: "" },
  { label: "Semi-finals", dates: "15 & 16 July", detail: "Dallas & Atlanta · 12:30 AM kickoffs" },
  { label: "Third place", dates: "19 July", detail: "Miami · 2:30 AM" },
  { label: "THE FINAL", dates: "20 July · 12:30 AM", detail: "MetLife Stadium, New York / New Jersey", final: true },
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
