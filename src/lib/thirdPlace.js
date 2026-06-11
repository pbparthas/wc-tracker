/* The 8 best third-placed teams advance. Rankable from the API: points,
   goal difference, goals for, wins. Fair-play points and drawing of lots
   are not exposed — the UI carries a footnote that those are approximated. */
export function computeThirdPlace(standings) {
  const rows = [];
  for (const g of Object.keys(standings).sort()) {
    const r = standings[g]?.[2];
    if (r) rows.push({ group: g, ...r });
  }
  rows.sort(
    (a, b) =>
      b.pts - a.pts ||
      (b.gf - b.ga) - (a.gf - a.ga) ||
      b.gf - a.gf ||
      b.w - a.w ||
      a.group.localeCompare(b.group)
  );
  return rows.map((r, i) => ({ ...r, rank: i + 1, qualified: i < 8 }));
}
