import { describe, it, expect } from "vitest";
import { detectWCEvents, type FreshWCGameState } from "./wc-event-detector";
import type { CachedWCGameState } from "./wc-state-cache";
import { detectNBAHighlights } from "./nba-highlight-detector";

// Coverage for the two newest detectors: WC goals (score-diff) and NBA
// player-milestone highlights (game-detail leaders).

function wcFresh(over: Partial<FreshWCGameState> = {}): FreshWCGameState {
  return {
    gameId: "wc1",
    status: "live",
    awayCode: "USA",
    homeCode: "TUR",
    awayScore: 0,
    homeScore: 0,
    minute: 50,
    ...over,
  };
}

function wcPrev(over: Partial<CachedWCGameState> = {}): CachedWCGameState {
  return {
    gameId: "wc1",
    status: "live",
    awayCode: "USA",
    homeCode: "TUR",
    awayScore: 0,
    homeScore: 0,
    minute: 49,
    halftimeFired: true,
    updatedAt: Date.now(),
    ...over,
  };
}

describe("detectWCEvents — goals", () => {
  it("fires wc-goal when the scoreline rises while live", () => {
    const { events } = detectWCEvents(
      wcPrev({ awayScore: 1, homeScore: 1 }),
      wcFresh({ awayScore: 2, homeScore: 1 })
    );
    expect(events.some((e) => e.type === "wc-goal")).toBe(true);
  });

  it("does not fire wc-goal when the score is unchanged", () => {
    const { events } = detectWCEvents(
      wcPrev({ awayScore: 1, homeScore: 1 }),
      wcFresh({ awayScore: 1, homeScore: 1 })
    );
    expect(events.some((e) => e.type === "wc-goal")).toBe(false);
  });

  it("does not fire wc-goal on the first observation of a live game", () => {
    const { events } = detectWCEvents(null, wcFresh({ awayScore: 1, homeScore: 0 }));
    expect(events.some((e) => e.type === "wc-goal")).toBe(false);
  });
});

describe("detectNBAHighlights — milestones", () => {
  const base = {
    gameId: "g1",
    awayCode: "OKC",
    homeCode: "SA",
    awayScore: 80,
    homeScore: 78,
  };

  it("fires at the 30-point milestone with a fresh slate", () => {
    const { events, firedKeys } = detectNBAHighlights({
      ...base,
      firedKeys: [],
      leaders: [{ label: "PTS", name: "SGA", team: "OKC", value: "34" }],
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("nba-highlight");
    expect(events[0].note).toContain("SGA");
    expect(events[0].note).toContain("34 PTS");
    expect(firedKeys).toContain("SGA:30");
  });

  it("does not re-fire a milestone already in firedKeys", () => {
    const { events } = detectNBAHighlights({
      ...base,
      firedKeys: ["SGA:30"],
      leaders: [{ label: "PTS", name: "SGA", team: "OKC", value: "34" }],
    });
    expect(events).toHaveLength(0);
  });

  it("fires a new higher milestone (40) even if 30 already fired", () => {
    const { events, firedKeys } = detectNBAHighlights({
      ...base,
      firedKeys: ["SGA:30"],
      leaders: [{ label: "PTS", name: "SGA", team: "OKC", value: "41" }],
    });
    expect(events).toHaveLength(1);
    expect(firedKeys).toContain("SGA:40");
  });

  it("parses points from the statline when value isn't a clean int", () => {
    const { events } = detectNBAHighlights({
      ...base,
      firedKeys: [],
      leaders: [{ label: "PTS", name: "Luka", team: "SA", value: "—", detail: "31 PTS, 9 AST" }],
    });
    expect(events).toHaveLength(1);
    expect(events[0].note).toContain("31 PTS");
  });

  it("ignores sub-threshold scorers", () => {
    const { events } = detectNBAHighlights({
      ...base,
      firedKeys: [],
      leaders: [{ label: "PTS", name: "Role Player", team: "OKC", value: "12" }],
    });
    expect(events).toHaveLength(0);
  });
});
