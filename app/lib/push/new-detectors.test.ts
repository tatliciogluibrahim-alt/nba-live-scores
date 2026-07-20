import { describe, it, expect } from "vitest";
import { detectWCEvents, type FreshWCGameState } from "./wc-event-detector";
import type { CachedWCGameState } from "./wc-state-cache";
import { detectNBAHighlights } from "./nba-highlight-detector";
import { subscriberWantsEvent } from "./dispatcher";

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

describe("detectWCEvents — significance attached (engine C2)", () => {
  it("scores THE final near-max and a group full-time low", () => {
    const finalEvt = detectWCEvents(
      wcPrev({ status: "live" }),
      wcFresh({ status: "final", stage: "Final" })
    ).events.find((e) => e.type === "wc-final")!;
    expect(finalEvt.significance).toBeGreaterThanOrEqual(70);

    const groupEvt = detectWCEvents(
      wcPrev({ status: "live" }),
      wcFresh({ status: "final", stage: "Group A" })
    ).events.find((e) => e.type === "wc-final")!;
    expect(groupEvt.significance).toBeLessThan(42);
  });

  it("scores a goal and carries it on the event", () => {
    const goal = detectWCEvents(
      wcPrev({ awayScore: 0, homeScore: 0 }),
      wcFresh({ awayScore: 1, homeScore: 0, stage: "Final" })
    ).events.find((e) => e.type === "wc-goal")!;
    expect(goal.significance).toBeGreaterThanOrEqual(42);
  });
});

describe("end-to-end: detect → score → gate (the final's firing path)", () => {
  it("THE final, detected live, breaks through to a Quiet country follower", () => {
    const finalEvt = detectWCEvents(
      wcPrev({ status: "live", awayCode: "FRA", homeCode: "ESP" }),
      wcFresh({
        status: "final",
        stage: "Final",
        awayCode: "FRA",
        homeCode: "ESP",
        awayScore: 2,
        homeScore: 1,
      })
    ).events.find((e) => e.type === "wc-final")!;

    expect(
      subscriberWantsEvent(
        { alerts: [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "FRA", tier: "quiet" }], noSpoilers: false },
        finalEvt
      )
    ).toBe(true);
  });

  it("a group full-time does NOT reach a Quiet whole-tournament follower", () => {
    const groupEvt = detectWCEvents(
      wcPrev({ status: "live" }),
      wcFresh({ status: "final", stage: "Group A", awayScore: 1, homeScore: 0 })
    ).events.find((e) => e.type === "wc-final")!;

    expect(
      subscriberWantsEvent(
        {
          alerts: [{ momentId: "fifa-world-cup-2026", scope: "all", scopeId: null, tier: "quiet" }],
          noSpoilers: false,
        },
        groupEvt
      )
    ).toBe(false);
  });
});

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

describe("detectWCEvents — second half vs first-half stoppage", () => {
  // The bug: "45'+6'" folds to minute 51, and the minute>50 fallback fired a
  // "Second half started" push DURING first-half stoppage (and at the break).
  it("does NOT fire wc-second-half during first-half stoppage (45'+6')", () => {
    const { events } = detectWCEvents(
      wcPrev({ minute: 44, isHalftime: false, halftimeFired: false }),
      wcFresh({ minute: 51, isHalftime: false, isFirstHalfStoppage: true })
    );
    expect(events.some((e) => e.type === "wc-second-half")).toBe(false);
  });

  it("still fires wc-second-half on a genuine second-half clock (HT-less feed)", () => {
    const { events } = detectWCEvents(
      wcPrev({ minute: 49, isHalftime: false, halftimeFired: false }),
      wcFresh({ minute: 51, isHalftime: false, isFirstHalfStoppage: false })
    );
    expect(events.some((e) => e.type === "wc-second-half")).toBe(true);
  });

  it("fires wc-second-half when resuming from the halftime break", () => {
    const { events } = detectWCEvents(
      wcPrev({ minute: 45, isHalftime: true, halftimeFired: true }),
      wcFresh({ minute: 46, isHalftime: false, isFirstHalfStoppage: false })
    );
    expect(events.some((e) => e.type === "wc-second-half")).toBe(true);
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
