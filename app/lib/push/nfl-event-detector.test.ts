import { describe, it, expect } from "vitest";
import {
  detectNFLEvents,
  type CachedNFLGameState,
  type FreshNFLGameState,
} from "./nfl-event-detector";

function fresh(over: Partial<FreshNFLGameState> = {}): FreshNFLGameState {
  return {
    gameId: "g1",
    status: "live",
    period: 1,
    awayCode: "BUF",
    homeCode: "KC",
    awayScore: 0,
    homeScore: 0,
    ...over,
  };
}
function cached(over: Partial<CachedNFLGameState> = {}): CachedNFLGameState {
  return {
    gameId: "g1",
    status: "live",
    period: 1,
    awayCode: "BUF",
    homeCode: "KC",
    awayScore: 0,
    homeScore: 0,
    updatedAt: 0,
    ...over,
  };
}
const types = (r: ReturnType<typeof detectNFLEvents>) =>
  r.events.map((e) => e.type);

describe("detectNFLEvents — game state", () => {
  it("fires kickoff on upcoming → live only", () => {
    expect(types(detectNFLEvents(cached({ status: "upcoming" }), fresh()))).toEqual([
      "nfl-kickoff",
    ]);
    // Joined mid-game (never saw upcoming) → no late kickoff.
    expect(types(detectNFLEvents(null, fresh()))).toEqual([]);
  });

  it("fires each quarter break once, on the boundary period", () => {
    expect(types(detectNFLEvents(cached({ period: 1 }), fresh({ period: 2 })))).toEqual([
      "nfl-eoq-1",
    ]);
    expect(types(detectNFLEvents(cached({ period: 2 }), fresh({ period: 3 })))).toEqual([
      "nfl-halftime",
    ]);
    expect(types(detectNFLEvents(cached({ period: 3 }), fresh({ period: 4 })))).toEqual([
      "nfl-eoq-3",
    ]);
  });

  it("does not re-fire a break already flagged", () => {
    expect(
      types(detectNFLEvents(cached({ period: 2, eoq1Fired: true }), fresh({ period: 2 })))
    ).toEqual([]);
  });

  it("fires OT when the period reaches 5", () => {
    expect(
      types(
        detectNFLEvents(
          cached({ period: 4, eoq1Fired: true, halftimeFired: true, eoq3Fired: true }),
          fresh({ period: 5 })
        )
      )
    ).toEqual(["nfl-ot"]);
  });

  it("fires final on live → final", () => {
    expect(
      types(detectNFLEvents(cached({ status: "live", period: 4 }), fresh({ status: "final", period: 4 })))
    ).toEqual(["nfl-final"]);
  });

  it("pins status + period forward on a feed regression (no re-fire)", () => {
    // A transient live→upcoming blip must not re-arm kickoff.
    const r = detectNFLEvents(
      cached({ status: "live", period: 3 }),
      fresh({ status: "upcoming", period: 1 })
    );
    expect(r.events).toEqual([]);
    expect(r.nextState.status).toBe("live");
    expect(r.nextState.period).toBe(3);
  });

  it("attaches significance to every event", () => {
    const r = detectNFLEvents(cached({ status: "upcoming" }), fresh());
    expect(r.events[0].significance).toBeGreaterThan(0);
  });
});
