import { describe, it, expect } from "vitest";
import { roadPrompt } from "./prompts.js";

const team = { name: "Germany", code: "GER", group: "E" };
const koLoss = {
  home: { name: "Germany", code: "GER" }, away: { name: "Paraguay", code: "PAR" },
  hg: 1, ag: 1, phg: 3, pag: 4, state: "post", stage: "Round of 16", kickoff: "2026-06-29T20:30:00Z",
};

describe("roadPrompt — elimination", () => {
  it("states elimination and the penalty loss when the team is out", () => {
    const p = roadPrompt(team, {}, [], [koLoss], [], true);
    expect(p).toMatch(/ELIMINATED/);
    expect(p).toMatch(/LOST 1-1 vs Paraguay \(3-4 on penalties\)/);
    expect(p).toMatch(/no longer exists/i);
  });

  it("does not assert elimination when the team is still in", () => {
    const p = roadPrompt(team, {}, [], [], [], false);
    expect(p).not.toMatch(/ALREADY BEEN ELIMINATED/);
  });
});
