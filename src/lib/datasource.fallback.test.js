import { describe, it, expect } from "vitest";
import { isFallbackData } from "./datasource.js";

/* isFallbackData decides how long a payload may live in the cache: ESPN
   fallback data is capped to minutes so it can't outlive the API-Football
   blip that produced it (the bug that froze club pages for a week). */
describe("isFallbackData", () => {
  it("flags ESPN-tagged club lists", () => {
    expect(isFallbackData([{ id: "360", name: "Man Utd", src: "espn" }])).toBe(true);
  });

  it("passes API-Football club lists", () => {
    expect(isFallbackData([{ id: "33", name: "Man Utd", src: "apif" }])).toBe(false);
  });

  it("flags match lists in the ESPN id space (no af- prefix)", () => {
    expect(isFallbackData([{ id: "740123", kickoff: "2026-08-15T14:00Z", home: {}, away: {} }])).toBe(true);
  });

  it("passes API-Football match lists", () => {
    expect(isFallbackData([{ id: "af-1001", kickoff: "2026-08-15T14:00Z", home: {}, away: {} }])).toBe(false);
  });

  it("flags an ESPN-tagged league table", () => {
    expect(isFallbackData({ rows: [{ team: { name: "Arsenal" } }], src: "espn" })).toBe(true);
    expect(isFallbackData({ rows: [{ team: { name: "Arsenal" } }], season: "2026" })).toBe(false);
  });

  it("flags ESPN-sourced scorer feeds", () => {
    expect(isFallbackData({ source: "espn", goals: [] })).toBe(true);
    expect(isFallbackData({ source: "apif", goals: [] })).toBe(false);
  });

  it("ignores empty and non-object payloads", () => {
    expect(isFallbackData([])).toBe(false);
    expect(isFallbackData(null)).toBe(false);
    expect(isFallbackData("x")).toBe(false);
  });
});
