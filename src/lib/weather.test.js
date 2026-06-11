import { describe, it, expect } from "vitest";
import { cityCoords, wmoInfo, parseKickoffWeather } from "./weather.js";

describe("cityCoords", () => {
  it("matches host cities directly and by substring", () => {
    expect(cityCoords("Mexico City")).toEqual([19.43, -99.13]);
    expect(cityCoords("East Rutherford")).toEqual([40.81, -74.07]);
    expect(cityCoords("Arlington, Texas")).toEqual([32.74, -97.11]);
  });

  it("returns null for unknown or empty cities", () => {
    expect(cityCoords("Gotham")).toBeNull();
    expect(cityCoords("")).toBeNull();
    expect(cityCoords(undefined)).toBeNull();
  });
});

describe("wmoInfo", () => {
  it("maps WMO code bands", () => {
    expect(wmoInfo(0).label).toBe("Clear");
    expect(wmoInfo(2).label).toBe("Partly cloudy");
    expect(wmoInfo(3).label).toBe("Overcast");
    expect(wmoInfo(61).label).toBe("Rain");
    expect(wmoInfo(95).label).toBe("Thunderstorm");
  });
});

describe("parseKickoffWeather", () => {
  const payload = {
    hourly: {
      time: ["2026-06-22T18:00", "2026-06-22T19:00", "2026-06-22T20:00"],
      temperature_2m: [30.2, 28.6, 27.1],
      precipitation_probability: [10, 35, 40],
      weather_code: [1, 61, 61],
    },
  };

  it("picks the kickoff hour, flooring minutes", () => {
    const w = parseKickoffWeather(payload, "2026-06-22T19:30:00Z");
    expect(w).toEqual({ tempC: 29, rainPct: 35, label: "Rain", emoji: "🌧️" });
  });

  it("returns null when the hour is outside the payload", () => {
    expect(parseKickoffWeather(payload, "2026-06-23T02:00:00Z")).toBeNull();
    expect(parseKickoffWeather({}, "2026-06-22T19:00:00Z")).toBeNull();
  });
});
