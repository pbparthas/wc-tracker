import { describe, it, expect } from "vitest";
import { computeThirdPlace, tableOrder } from "./thirdPlace.js";

const row = (code, pts, gf, ga, w) => ({ team: { code, name: code }, p: 3, w, d: 0, l: 0, gf, ga, pts });

// Twelve groups; only the third row (index 2) of each matters.
function standingsWithThirds(thirds) {
  const out = {};
  "ABCDEFGHIJKL".split("").forEach((g, i) => {
    out[g] = [row(g + "1", 9, 9, 0, 3), row(g + "2", 6, 6, 3, 2), thirds[i]];
  });
  return out;
}

describe("tableOrder", () => {
  it("sorts ESPN's draw-order rows into a real table (the SK-3pts-below-0pts bug)", () => {
    // Group A after matchday 1, exactly as ESPN returned it: draw order.
    const drawOrder = [
      { team: { code: "MEX" }, p: 1, w: 1, d: 0, l: 0, gf: 2, ga: 0, pts: 3 },
      { team: { code: "CZE" }, p: 1, w: 0, d: 0, l: 1, gf: 0, ga: 1, pts: 0 },
      { team: { code: "KOR" }, p: 1, w: 1, d: 0, l: 0, gf: 1, ga: 0, pts: 3 },
      { team: { code: "RSA" }, p: 1, w: 0, d: 0, l: 1, gf: 0, ga: 2, pts: 0 },
    ];
    const sorted = [...drawOrder].sort(tableOrder);
    expect(sorted.map((r) => r.team.code)).toEqual(["MEX", "KOR", "CZE", "RSA"]);
  });

  it("breaks point ties by GD, then GF, then wins", () => {
    const a = { pts: 4, gf: 5, ga: 3, w: 1 }; // GD +2
    const b = { pts: 4, gf: 6, ga: 4, w: 1 }; // GD +2, more GF
    const c = { pts: 4, gf: 4, ga: 1, w: 1 }; // GD +3
    expect([a, b, c].sort(tableOrder)).toEqual([c, b, a]);
  });
});

describe("computeThirdPlace", () => {
  it("ranks by points, then goal difference, then goals for, then wins", () => {
    const thirds = [
      row("A3", 4, 4, 2, 1), // pts 4
      row("B3", 4, 6, 4, 1), // pts 4, same GD(+2), more GF → above A3
      row("C3", 6, 3, 1, 2), // pts 6 → top
      row("D3", 4, 5, 3, 2), // pts 4, GD +2, GF 5 → between B3 and A3
      row("E3", 3, 3, 3, 1),
      row("F3", 3, 2, 2, 1),
      row("G3", 2, 2, 3, 0),
      row("H3", 2, 1, 2, 0),
      row("I3", 1, 1, 3, 0),
      row("J3", 1, 0, 2, 0),
      row("K3", 0, 0, 5, 0),
      row("L3", 0, 0, 6, 0),
    ];
    const ranked = computeThirdPlace(standingsWithThirds(thirds));
    expect(ranked.map((r) => r.team.code).slice(0, 4)).toEqual(["C3", "B3", "D3", "A3"]);
  });

  it("marks exactly the top 8 as qualified", () => {
    const thirds = "ABCDEFGHIJKL".split("").map((g, i) => row(g + "3", 12 - i, 5, 2, 2));
    const ranked = computeThirdPlace(standingsWithThirds(thirds));
    expect(ranked.filter((r) => r.qualified)).toHaveLength(8);
    expect(ranked[7].qualified).toBe(true);
    expect(ranked[8].qualified).toBe(false);
  });

  it("handles incomplete standings without crashing", () => {
    expect(computeThirdPlace({})).toEqual([]);
    expect(computeThirdPlace({ A: [row("A1", 3, 1, 0, 1)] })).toEqual([]); // no third row yet
  });
});
