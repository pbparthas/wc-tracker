import { describe, it, expect } from "vitest";
import { isCurrentWindowMove } from "./datasource.js";

describe("isCurrentWindowMove", () => {
  const OPENS = "2026-06-01T00:00:00Z"; // current (2026-27) summer window open

  it("keeps deals from the current window", () => {
    expect(isCurrentWindowMove("2026-07-10", OPENS)).toBe(true);
    expect(isCurrentWindowMove("2026-06-01", OPENS)).toBe(true);
  });

  it("excludes last season's deals", () => {
    expect(isCurrentWindowMove("2025-07-10", OPENS)).toBe(false); // e.g. Wirtz/Ekitike 2025
    expect(isCurrentWindowMove("2025-08-31", OPENS)).toBe(false);
    expect(isCurrentWindowMove("2024-01-15", OPENS)).toBe(false);
  });

  it("excludes undated moves", () => {
    expect(isCurrentWindowMove("", OPENS)).toBe(false);
    expect(isCurrentWindowMove(null, OPENS)).toBe(false);
  });

  it("keeps everything when no window start is given", () => {
    expect(isCurrentWindowMove("2025-07-10", undefined)).toBe(true);
  });
});
