import { describe, it, expect } from "vitest";
import { throttle } from "./apifootball.js";

describe("throttle — serial API-Football queue", () => {
  it("runs queued tasks one at a time (no overlap)", async () => {
    let active = 0;
    let maxActive = 0;
    const order = [];
    const task = (n) => () =>
      new Promise((resolve) => {
        active++;
        maxActive = Math.max(maxActive, active);
        setTimeout(() => {
          order.push(n);
          active--;
          resolve(n);
        }, 8);
      });
    await Promise.all([throttle(task(1)), throttle(task(2)), throttle(task(3))]);
    expect(maxActive).toBe(1); // never two in flight at once
    expect(order).toEqual([1, 2, 3]); // and in submission order
  });

  it("keeps the queue alive after a rejection", async () => {
    await expect(throttle(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(throttle(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});
