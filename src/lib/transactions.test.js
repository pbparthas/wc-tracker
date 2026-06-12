import { describe, it, expect } from "vitest";
import { parseTransactions } from "./espn.js";

describe("parseTransactions", () => {
  it("parses the transactions-array shape, newest first", () => {
    const moves = parseTransactions({
      transactions: [
        {
          date: "2026-06-01T10:00Z",
          athlete: { displayName: "Old Deal" },
          from: { displayName: "Club A", id: 1 },
          to: { displayName: "Club B", id: 2, logos: [{ href: "https://a.espncdn.com/b.png" }] },
          displayAmount: "£40m",
        },
        {
          date: "2026-06-10T10:00Z",
          athlete: { displayName: "New Deal" },
          from: { displayName: "Club C", id: 3 },
          to: { displayName: "Club D", id: 4 },
        },
      ],
    });
    expect(moves.map((m) => m.player)).toEqual(["New Deal", "Old Deal"]);
    expect(moves[1]).toMatchObject({ from: "Club A", to: "Club B", fee: "£40m", fromId: "1", toId: "2" });
    expect(moves[1].toLogo).toContain("espncdn");
  });

  it("tolerates the items shape and alternative field names", () => {
    const moves = parseTransactions({
      items: [
        { date: "2026-06-05", player: { displayName: "P" }, toTeam: { name: "Club X" }, amount: 5000000 },
      ],
    });
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ player: "P", to: "Club X", fee: "5000000", from: "" });
  });

  it("drops rows without a player or destination and survives garbage", () => {
    expect(parseTransactions({ transactions: [{ date: "2026-06-05" }, null] })).toEqual([]);
    expect(parseTransactions(undefined)).toEqual([]);
    expect(parseTransactions({})).toEqual([]);
  });
});
