/* FIFA's primary group-table criteria: points, goal difference, goals for,
   wins. Head-to-head among tied teams, fair play and drawing of lots aren't
   exposed by the API — the UI carries a footnote that those are approximated. */
export const tableOrder = (a, b) =>
  b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || b.w - a.w;

/* The 8 best third-placed teams advance. */
export function computeThirdPlace(standings) {
  const rows = [];
  for (const g of Object.keys(standings).sort()) {
    const r = standings[g]?.[2];
    if (r) rows.push({ group: g, ...r });
  }
  rows.sort((a, b) => tableOrder(a, b) || a.group.localeCompare(b.group));
  return rows.map((r, i) => ({ ...r, rank: i + 1, qualified: i < 8 }));
}
