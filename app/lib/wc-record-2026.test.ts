import { describe, it, expect } from "vitest";
import { wcRecord2026 } from "./wc-record-2026";

// The Summer Soccer 2026 record is a public record that is locked: these
// tests pin it so an edit to the JSON can't slip through unnoticed.

describe("wcRecord2026", () => {
  const r = wcRecord2026();

  it("holds all 104 matches, every one final", () => {
    expect(r.fixtures).toHaveLength(104);
    expect(r.fixtures.every((f) => f.status === "final")).toBe(true);
    expect(new Set(r.fixtures.map((f) => f.id)).size).toBe(104);
  });

  it("holds the twelve final group tables", () => {
    expect(Object.keys(r.standings).sort()).toEqual(
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]
    );
    for (const rows of Object.values(r.standings)) {
      expect(rows).toHaveLength(4);
      expect(rows.every((row) => row.played === 3)).toBe(true);
    }
  });

  it("ends with Spain 1, Argentina 0 after extra time on July 19", () => {
    const final = r.fixtures.find((f) => f.stage === "final");
    expect(final).toMatchObject({
      id: "760517",
      statusText: "AET",
      home: { abbreviation: "ESP", score: 1, winner: true },
      away: { abbreviation: "ARG", score: 0, winner: false },
    });
    expect(final?.date.startsWith("2026-07-19")).toBe(true);
    expect(r.champion).toMatchObject({ code: "ESP", name: "Spain", gameId: "760517" });
  });

  it("runs from June 11 to July 19, in kickoff order", () => {
    const dates = r.fixtures.map((f) => f.date);
    expect(dates[0].startsWith("2026-06-11")).toBe(true);
    expect(dates[dates.length - 1].startsWith("2026-07-19")).toBe(true);
    expect([...dates].sort()).toEqual(dates);
  });
});
