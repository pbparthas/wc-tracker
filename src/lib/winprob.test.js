import { describe, it, expect } from "vitest";
import { liveWinProbability, parseMatchMinute } from "./winprob.js";

const PCT = { home: "45%", draw: "34%", away: "21%" };

describe("parseMatchMinute", () => {
  it("reads the minute from live status strings", () => {
    expect(parseMatchMinute("LIVE 67'")).toBe(67);
    expect(parseMatchMinute("LIVE 90+2")).toBe(90);
    expect(parseMatchMinute("HT")).toBe(45);
    expect(parseMatchMinute("FT")).toBe(null);
    expect(parseMatchMinute("")).toBe(null);
  });
});

describe("liveWinProbability", () => {
  it("≈ the pre-match prediction at kickoff (0-0, minute 0)", () => {
    const p = liveWinProbability(PCT, 0, 0, 0);
    expect(Math.abs(p.home - 45)).toBeLessThanOrEqual(3);
    expect(Math.abs(p.away - 21)).toBeLessThanOrEqual(3);
  });

  it("flips toward the side that's leading late in the game", () => {
    // Brazil (home, pre-match favourite) trail Japan 0-1 at the 80th minute.
    const p = liveWinProbability(PCT, 0, 1, 80);
    expect(p.away).toBeGreaterThan(p.home); // Japan now favoured
    expect(p.away).toBeGreaterThan(60);
    expect(p.home).toBeLessThan(25);
  });

  it("an early goal dents but doesn't flip a strong favourite", () => {
    // Favourite trails 0-1 at the 10th minute — reduced, still in it.
    const p = liveWinProbability(PCT, 0, 1, 10);
    expect(p.home).toBeLessThan(45); // dropped from pre-match
    expect(p.home).toBeGreaterThan(20); // but plenty of time left
  });

  it("is near-certain for a two-goal lead in stoppage time", () => {
    const p = liveWinProbability(PCT, 2, 0, 90);
    expect(p.home).toBeGreaterThan(95);
  });

  it("a level game at full time is essentially a draw", () => {
    const p = liveWinProbability(PCT, 1, 1, 90);
    expect(p.draw).toBeGreaterThan(95);
  });

  it("always returns three percentages that sum to 100", () => {
    for (const [hg, ag, m] of [[0, 0, 0], [1, 0, 30], [0, 2, 70], [3, 1, 88]]) {
      const p = liveWinProbability(PCT, hg, ag, m);
      expect(p.home + p.draw + p.away).toBe(100);
    }
  });
});
