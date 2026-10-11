import { describe, it, expect } from "vitest";
import { freshForSeconds, LIVE_TTL_SECONDS, IDLE_TTL_SECONDS } from "./cache-policy";

// Persona sweep 2026-10-11: updates reached the app a median 46s after the
// play, partly from a flat 30s cache. While a game is live the scoreboard
// is fresh for 10s. Idle stays at 30s, because scan-nfl's kickoff
// detection reads this route.

const g = (status: "live" | "upcoming" | "final") => ({ status });

describe("freshForSeconds", () => {
  it("is short while any game is live", () => {
    expect(freshForSeconds({ games: [g("final"), g("live")] })).toBe(LIVE_TTL_SECONDS);
    expect(LIVE_TTL_SECONDS).toBe(10);
  });

  it("stays at the idle window when nothing is live", () => {
    expect(freshForSeconds({ games: [g("final"), g("upcoming")] })).toBe(IDLE_TTL_SECONDS);
    expect(freshForSeconds({ games: [] })).toBe(IDLE_TTL_SECONDS);
    expect(IDLE_TTL_SECONDS).toBe(30);
  });
});
