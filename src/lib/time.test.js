import { describe, it, expect } from "vitest";
import { yyyymmdd, addDays, dateKeyRange, istParts, istDateKey } from "./time.js";

describe("time helpers", () => {
  it("yyyymmdd formats in UTC regardless of local zone", () => {
    expect(yyyymmdd(new Date("2026-06-11T23:30:00Z"))).toBe("20260611");
    expect(yyyymmdd(new Date("2026-06-11T00:00:00Z"))).toBe("20260611");
  });

  it("addDays moves whole days", () => {
    expect(addDays(new Date("2026-06-30T00:00:00Z"), 2).toISOString()).toBe("2026-07-02T00:00:00.000Z");
  });

  it("dateKeyRange is inclusive of both ends", () => {
    const r = dateKeyRange("2026-06-11", "2026-06-14");
    expect(r).toEqual(["2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"]);
  });

  it("istParts converts a UTC kickoff into IST (+5:30)", () => {
    // 19:00 UTC = 00:30 IST next day
    const p = istParts("2026-06-22T19:00:00Z");
    expect(p.time).toBe("12:30 AM");
    expect(p.dateKey).toBe("2026-06-23");
  });

  it("istParts returns null for garbage", () => {
    expect(istParts("not-a-date")).toBeNull();
  });

  it("istDateKey returns a sortable YYYY-MM-DD key", () => {
    expect(istDateKey(new Date("2026-07-19T20:00:00Z"))).toBe("2026-07-20");
  });
});
