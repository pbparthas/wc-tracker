import { describe, it, expect } from "vitest";
import { normalizeEvent } from "./espn.js";

const ev = (homeShoot, awayShoot) => ({
  id: "401",
  date: "2026-06-30T01:00:00Z",
  status: { type: { state: "post", name: "STATUS_FULL_TIME" } },
  competitions: [{
    competitors: [
      { homeAway: "home", score: "1", shootoutScore: homeShoot, team: { displayName: "Netherlands" } },
      { homeAway: "away", score: "1", shootoutScore: awayShoot, team: { displayName: "Morocco" } },
    ],
    venue: { fullName: "Estadio BBVA", address: { city: "Monterrey" } },
  }],
});

describe("normalizeEvent — penalty shootout score", () => {
  it("reads ESPN shootoutScore into phg/pag", () => {
    const m = normalizeEvent(ev(3, 4));
    expect(m.hg).toBe(1);
    expect(m.ag).toBe(1);
    expect(m.phg).toBe(3);
    expect(m.pag).toBe(4);
  });

  it("leaves pens null when there was no shootout", () => {
    const m = normalizeEvent(ev(undefined, undefined));
    expect(m.phg).toBe(null);
    expect(m.pag).toBe(null);
  });
});
