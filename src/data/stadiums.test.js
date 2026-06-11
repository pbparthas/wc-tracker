import { describe, it, expect } from "vitest";
import { stadiumFor, STADIUMS } from "./stadiums.js";

describe("stadiumFor", () => {
  it("resolves stadium-suburb cities ESPN reports", () => {
    expect(stadiumFor("East Rutherford").name).toBe("MetLife Stadium");
    expect(stadiumFor("Arlington").name).toBe("AT&T Stadium");
    expect(stadiumFor("Zapopan").name).toBe("Estadio Akron");
  });

  it("resolves metro aliases", () => {
    expect(stadiumFor("Dallas").name).toBe("AT&T Stadium");
    expect(stadiumFor("Boston").name).toBe("Gillette Stadium");
    expect(stadiumFor("Miami").name).toBe("Hard Rock Stadium");
    expect(stadiumFor("Guadalajara").name).toBe("Estadio Akron");
  });

  it("tolerates extra qualifiers in the city string", () => {
    expect(stadiumFor("Mexico City, Mexico").name).toBe("Estadio Azteca");
    expect(stadiumFor("Kansas City, Missouri").name).toBe("Arrowhead Stadium");
  });

  it("returns null for unknown or empty cities", () => {
    expect(stadiumFor("Gotham")).toBeNull();
    expect(stadiumFor("")).toBeNull();
    expect(stadiumFor(undefined)).toBeNull();
  });

  it("covers all 16 host stadiums with complete details", () => {
    const all = Object.values(STADIUMS);
    expect(all).toHaveLength(16);
    for (const s of all) {
      expect(s.name).toBeTruthy();
      expect(s.city).toBeTruthy();
      expect(s.country).toBeTruthy();
      expect(s.capacity).toBeTruthy();
      expect(s.opened).toBeGreaterThan(1900);
      expect(s.facts.length).toBeGreaterThan(50);
    }
  });
});
