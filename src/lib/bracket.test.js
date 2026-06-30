import { describe, it, expect } from "vitest";
import { assembleBracket, mergeKnockoutSchedule } from "./bracket.js";

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
    // every card carries its FIFA match number so it maps to "Winner Match NN"
    expect(r32[0].matchNo).toBe(73);
    expect(final.matchNo).toBe(104);
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

  it("resolves group winner/runner-up feeders from settled standings", () => {
    // Match 73 = Runner-up Group A vs Runner-up Group B. A four-team group is
    // settled once everyone has played 3.
    const played3 = (name, pts) => ({ team: { name, code: name.slice(0, 3).toUpperCase(), flag: "", logo: null }, p: 3, pts });
    const standings = {
      A: [played3("Spain", 9), played3("Argentina", 6), played3("Qatar", 3), played3("Chad", 0)],
      B: [played3("France", 7), played3("Denmark", 5), played3("Tunisia", 3), played3("Peru", 1)],
    };
    const rounds = assembleBracket([], standings);
    const m73 = round(rounds, "R32").matches[0];
    expect(m73.home.name).toBe("Argentina"); // runner-up A
    expect(m73.away.name).toBe("Denmark"); // runner-up B
  });

  it("leaves a feeder as a label while its group is unsettled", () => {
    const standings = {
      A: [
        { team: { name: "Spain" }, p: 2, pts: 6 },
        { team: { name: "Argentina" }, p: 2, pts: 3 },
      ],
    };
    const rounds = assembleBracket([], standings);
    // Match 79 = Winner Group A vs 3rd ...; group A only played 2, so unresolved.
    const m79 = round(rounds, "R32").matches.find((m) => m.home.name === "Winner Group A");
    expect(m79).toBeTruthy();
  });

  it("binds a fixture by team identity, surfacing the third-place opponent and a link", () => {
    // Argentina = Winner Group A (resolved from standings). Its R32 opponent is
    // Cabo Verde, a third-placed side the standings can't resolve — it only
    // comes from the live fixture. The fixture's kickoff is deliberately a few
    // hours off the skeleton slot to prove time isn't what binds it.
    const played3 = (name) => ({ team: { name, code: name.slice(0, 3).toUpperCase() }, p: 3, pts: 9 });
    const standings = {
      A: [played3("Argentina"), played3("Mexico"), played3("Qatar"), played3("Chad")],
    };
    const fixture = {
      id: "af-555",
      stage: "Round of 16", // feed's (wrong) label — must not matter
      kickoff: "2026-07-01T04:30:00Z", // ~3.5h off slot 79's 01:00Z
      home: { name: "Argentina", code: "ARG" },
      away: { name: "Cabo Verde", code: "CPV" },
      state: "pre",
    };
    const rounds = assembleBracket([fixture], standings);
    const card = round(rounds, "R32").matches.find((m) => m.id === "af-555");
    expect(card).toBeTruthy(); // bound somewhere in R32
    expect(card.placeholder).toBeUndefined(); // real fixture → clickable
    expect(card.home.name).toBe("Argentina");
    expect(card.away.name).toBe("Cabo Verde");
  });

  it("merges group fixtures with the full knockout skeleton for the schedule", () => {
    const group = { id: "g1", stage: "Group A", kickoff: "2026-06-20T19:00:00Z", home: { name: "Spain", code: "ESP" }, away: { name: "Japan", code: "JPN" }, state: "post", hg: 2, ag: 1 };
    const merged = mergeKnockoutSchedule([group], {});
    // group fixture preserved
    expect(merged.find((m) => m.id === "g1")).toBeTruthy();
    // all 32 knockout slots present as placeholders
    const koPlaceholders = merged.filter((m) => m.placeholder);
    expect(koPlaceholders).toHaveLength(32);
    // a R16 placeholder carries a readable round label and a date past Jul 3
    const r16 = koPlaceholders.find((m) => m.stage === "Round of 16");
    expect(r16).toBeTruthy();
    expect(new Date(r16.kickoff) > new Date("2026-07-03T00:00:00Z")).toBe(true);
    // sorted by kickoff
    for (let i = 1; i < merged.length; i++) {
      expect(new Date(merged[i].kickoff) >= new Date(merged[i - 1].kickoff)).toBe(true);
    }
  });

  it("does not duplicate a bound knockout fixture in the merged schedule", () => {
    const played3 = (name) => ({ team: { name, code: name.slice(0, 3).toUpperCase() }, p: 3, pts: 9 });
    const standings = { A: [played3("Argentina"), played3("Mexico"), played3("Qatar"), played3("Chad")] };
    const fixture = { id: "af-555", stage: "Round of 32", kickoff: "2026-07-01T01:00:00Z", home: { name: "Argentina", code: "ARG" }, away: { name: "Cabo Verde", code: "CPV" }, state: "pre" };
    const merged = mergeKnockoutSchedule([fixture], standings);
    expect(merged.filter((m) => m.id === "af-555")).toHaveLength(1);
    // still exactly 32 knockout entries (31 placeholders + 1 bound fixture)
    const ko = merged.filter((m) => m.placeholder || m.id === "af-555");
    expect(ko).toHaveLength(32);
  });

  it("resolves a later-round feeder once the feeding match is decided", () => {
    // Match 74 (Boston, 29 Jun 20:30Z) feeds R16 match 89's home slot
    // ("Winner Match 74"). Play it out: Paraguay beat Germany on penalties.
    const m74 = {
      id: "e74", stage: "Round of 16", kickoff: "2026-06-29T20:30:00Z",
      home: { name: "Germany", code: "GER" }, away: { name: "Paraguay", code: "PAR" },
      hg: 1, ag: 1, phg: 3, pag: 4, state: "post",
    };
    const rounds = assembleBracket([m74], {});
    const r16 = round(rounds, "R16").matches;
    const m89 = r16.find((x) => x.matchNo === 89);
    expect(m89.home.name).toBe("Paraguay"); // Winner Match 74 resolved
    expect(m89.away.name).toBe("Winner Match 77"); // 77 not played yet
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
