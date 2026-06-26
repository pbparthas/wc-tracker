import { describe, it, expect } from "vitest";
import { assembleBracket } from "./bracket.js";

const m = (id, stage, kickoff) => ({
  id,
  stage,
  kickoff,
  home: { name: "TBD" },
  away: { name: "TBD" },
  state: "pre",
});

describe("assembleBracket", () => {
  it("buckets fixtures into rounds by stage note", () => {
    const rounds = assembleBracket([
      m("1", "Group A", "2026-06-12T00:00:00Z"),
      m("2", "Round of 32", "2026-06-28T19:00:00Z"),
      m("3", "Round of 16", "2026-07-04T19:00:00Z"),
      m("4", "Quarter-final", "2026-07-09T19:00:00Z"),
      m("5", "Semi-final", "2026-07-14T19:00:00Z"),
      m("6", "Final", "2026-07-19T19:00:00Z"),
    ]);
    const byId = Object.fromEntries(rounds.map((r) => [r.id, r.matches.filter(Boolean).map((x) => x.id)]));
    expect(byId.R32).toEqual(["2"]);
    expect(byId.R16).toEqual(["3"]);
    expect(byId.QF).toEqual(["4"]);
    expect(byId.SF).toEqual(["5"]);
    expect(byId.FINAL).toEqual(["6"]);
  });

  it("keeps a Round of 32 fixture in R32 even when its IST kickoff rolls into the R16 window", () => {
    // Argentina's R32 match kicks off 22:00 UTC on 3 Jul = 03:30 IST on 4 Jul,
    // which falls in the R16 date window (4–8 Jul). The round label must win so
    // it stays in Round of 32 rather than leaking into Round of 16.
    const rounds = assembleBracket([
      m("argR32", "Round of 32", "2026-07-03T22:00:00Z"),
      m("realR16", "Round of 16", "2026-07-05T19:00:00Z"),
    ]);
    const byId = Object.fromEntries(rounds.map((r) => [r.id, r.matches.filter(Boolean).map((x) => x.id)]));
    expect(byId.R32).toEqual(["argR32"]);
    expect(byId.R16).toEqual(["realR16"]);
  });

  it("excludes group fixtures and never double-assigns a match", () => {
    const rounds = assembleBracket([
      m("g", "Group L", "2026-06-26T19:00:00Z"),
      // "semi-final" must not be swallowed by the FINAL round's /final/ regex
      m("sf", "Semi-final", "2026-07-14T19:00:00Z"),
    ]);
    const all = rounds.flatMap((r) => r.matches.filter(Boolean).map((x) => x.id));
    expect(all).toEqual(["sf"]);
    expect(rounds.find((r) => r.id === "FINAL").matches.filter(Boolean)).toHaveLength(0);
  });

  it("falls back to date windows when the stage note is generic", () => {
    const rounds = assembleBracket([m("k", "Knockout", "2026-07-09T20:00:00Z")]); // QF window
    expect(rounds.find((r) => r.id === "QF").matches.filter(Boolean).map((x) => x.id)).toEqual(["k"]);
  });

  it("pads every round to its bracket size", () => {
    const rounds = assembleBracket([]);
    expect(rounds.find((r) => r.id === "R32").matches).toHaveLength(16);
    expect(rounds.find((r) => r.id === "FINAL").matches).toHaveLength(1);
  });
});
