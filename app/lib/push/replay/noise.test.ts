import { describe, it, expect } from "vitest";
import { peakInWindow, noiseStats } from "./noise";
import type { ReplayDelivery } from "./replay-nfl";

const MIN = 60_000;

function d(atMin: number, tag: string, title = "Touchdown"): ReplayDelivery {
  return {
    atMs: atMin * MIN,
    eventType: "nfl-td-rushing",
    title,
    body: "x",
    tag,
    dedupeTag: `${tag}:${atMin}`,
    offer: false,
  };
}

describe("peakInWindow", () => {
  it("is zero with nothing delivered", () => {
    expect(peakInWindow([], 60 * MIN)).toBe(0);
  });

  it("counts the busiest half-open window [t, t + window)", () => {
    const times = [0, 0.5, 0.98, 1, 3.3].map((m) => m * MIN);
    expect(peakInWindow(times, MIN)).toBe(3);
  });

  it("does not care about input order", () => {
    const times = [3.3, 0.98, 0, 1, 0.5].map((m) => m * MIN);
    expect(peakInWindow(times, MIN)).toBe(3);
  });
});

describe("noiseStats", () => {
  it("reports pushes, the busiest hour and five minutes, and cards left", () => {
    const deliveries = [
      d(0, "g:nfl-state", "Kickoff"),
      d(10, "g:nfl-play"),
      d(12, "g:nfl-play"),
      d(14, "g:nfl-play"),
      d(90, "g:nfl-state", "Halftime"),
      d(200, "g:nfl-state", "Final"),
    ];
    expect(noiseStats(deliveries)).toEqual({
      pushes: 6,
      busiest60m: 4,
      busiest5m: 3,
      cardsLeft: 2,
    });
  });
});
