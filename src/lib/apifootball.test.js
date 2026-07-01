import { describe, it, expect } from "vitest";
import { throttle } from "./apifootball.js";

describe("throttle — rate-guarded API-Football queue", () => {
  it("never lets more than the cap run at once, and completes all", async () => {
    let active = 0;
    let maxActive = 0;
    // Tasks longer than the start-gap so several genuinely overlap (as real
    // network calls do), letting us observe the concurrency cap.
    const task = (n) => () =>
      new Promise((resolve) => {
        active++;
        maxActive = Math.max(maxActive, active);
        setTimeout(() => { active--; resolve(n); }, 200);
      });
    const out = await Promise.all(Array.from({ length: 12 }, (_, i) => throttle(task(i))));
    expect(out).toHaveLength(12); // all ran
    expect(maxActive).toBeGreaterThan(1); // not strictly serial — live data isn't starved
    expect(maxActive).toBeLessThanOrEqual(4); // but never a spike
  });

  it("keeps the queue alive after a rejection", async () => {
    await expect(throttle(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(throttle(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});
