import { describe, it, expect } from "vitest";
import { buildIcs } from "./ics.js";

const match = {
  id: "12345",
  home: { name: "Côte d'Ivoire" },
  away: { name: "Bosnia & Herzegovina; rest" }, // ; and , must survive escaping
  stage: "Group E",
  kickoff: "2026-06-22T19:00:00Z",
  venue: "AT&T Stadium, backslash \\ test",
  city: "Arlington",
};

describe("buildIcs", () => {
  const ics = buildIcs(match);
  const unfolded = ics.replace(/\r\n /g, "");

  it("escapes semicolons, commas and backslashes in text fields", () => {
    expect(unfolded).toContain("Herzegovina\\; rest");
    expect(unfolded).toContain("AT&T Stadium\\, backslash \\\\ test");
  });

  it("keeps every physical line within the 75-octet RFC 5545 limit", () => {
    for (const line of ics.split("\r\n")) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });

  it("contains the event window and a 30-minute alarm", () => {
    expect(unfolded).toContain("DTSTART:20260622T190000Z");
    expect(unfolded).toContain("DTEND:20260622T204500Z"); // kickoff + 105min
    expect(unfolded).toContain("TRIGGER:-PT30M");
    expect(unfolded).toContain("UID:espn-12345@wc-tracker");
  });

  it("is a complete VCALENDAR document with CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });
});
