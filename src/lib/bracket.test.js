import { describe, it, expect } from "vitest";
import { assembleBracket } from "./bracket.js";

const live = (id, kickoff, home, away, extra = {}) => ({
  id,
  stage: "Knockout",
  kickoff,
  home: { name: home },
  away: { name: away },
  state: "pre",
  ...extra,
});

const round = (rounds, rid) => rounds.find((r) => r.id === rid);

describe("assembleBracket", () => {
  it("always renders the full skeleton with the right round sizes", () => {
    const rounds = assembleBracket([]);
    expect(rounds.map((r) => r.id)).toEqual(["R32", "R16", "QF", "SF", "THIRD", "FINAL"]);
    expect(round(rounds, "R32").matches).toHaveLength(16);
    expect(round(rounds, "R16").matches).toHaveLength(8);
    expect(round(rounds, "QF").matches).toHaveLength(4);
    expect(round(rounds, "SF").matches).toHaveLength(2);
    expect(round(rounds, "THIRD").matches).toHaveLength(1);
    expect(round(rounds, "FINAL").matches).toHaveLength(1);
  });

  it("shows feeder labels on slots with no live fixture", () => {
    const rounds = assembleBracket([]);
    const r32 = round(rounds, "R32").matches;
    // Match 73 is the earliest R32 slot: Runner-up Group A vs Runner-up Group B.
    expect(r32[0].placeholder).toBe(true);
    expect(r32[0].home.name).toBe("Runner-up Group A");
    expect(r32[0].away.name).toBe("Runner-up Group B");
    const final = round(rounds, "FINAL").matches[0];
    expect(final.home.name).toBe("Winner Match 101");
    expect(final.away.name).toBe("Winner Match 102");
  });

  it("snaps a live fixture onto its slot by kickoff time", () => {
    // Match 73 kicks off 2026-06-28T19:00:00Z in Los Angeles.
    const rounds = assembleBracket([
      live("e73", "2026-06-28T19:00:00Z", "Argentina", "Croatia", { hg: 2, ag: 1, state: "post", status: "FT" }),
    ]);
    const r32 = round(rounds, "R32").matches;
    expect(r32[0].id).toBe("e73");
    expect(r32[0].placeholder).toBeUndefined();
    expect(r32[0].home.name).toBe("Argentina");
    // every other R32 slot stays a placeholder
    expect(r32.slice(1).every((m) => m.placeholder)).toBe(true);
  });

  it("keeps a R32 fixture in R32 even when its IST kickoff rolls into the R16 window", () => {
    // Match 86 kicks off 2026-07-03T22:00:00Z = 03:30 IST on 4 Jul, which is in
    // the R16 calendar window. Binding by the skeleton's authoritative slot time
    // keeps it in Round of 32 rather than leaking into Round of 16.
    const rounds = assembleBracket([
      live("e86", "2026-07-03T22:00:00Z", "Brazil", "Senegal"),
    ]);
    const inR32 = round(rounds, "R32").matches.some((m) => m.id === "e86");
    const inR16 = round(rounds, "R16").matches.some((m) => m.id === "e86");
    expect(inR32).toBe(true);
    expect(inR16).toBe(false);
  });

  it("ignores group-stage fixtures", () => {
    const rounds = assembleBracket([
      { id: "g", stage: "Group L", kickoff: "2026-06-26T19:00:00Z", home: { name: "Spain" }, away: { name: "Japan" }, state: "pre" },
    ]);
    const allIds = rounds.flatMap((r) => r.matches.map((m) => m.id));
    expect(allIds).not.toContain("g");
    // nothing bound — everything is still a placeholder
    expect(rounds.every((r) => r.matches.every((m) => m.placeholder))).toBe(true);
  });
});
