import { describe, it, expect } from "vitest";
import { detectEvents, type FreshGameState } from "./event-detector";
import type { CachedGameState } from "./state-cache";

// Coverage for the pure event detector — the heart of the push
// pipeline. Focuses on the transitions most recently touched (Game 7
// tipoff flag, end-of-quarter at the buzzer) plus the core bookends.

function fresh(over: Partial<FreshGameState> = {}): FreshGameState {
  return {
    gameId: "g1",
    status: "live",
    period: 1,
    awayCode: "OKC",
    homeCode: "MIN",
    awayScore: 0,
    homeScore: 0,
    secondsRemaining: null,
    statusText: "Q1 10:00",
    gameContext: "",
    ...over,
  };
}

function cached(over: Partial<CachedGameState> = {}): CachedGameState {
  return {
    gameId: "g1",
    status: "upcoming",
    period: 0,
    awayCode: "OKC",
    homeCode: "MIN",
    awayScore: 0,
    homeScore: 0,
    maxLead: 0,
    closeGameFired: false,
    comebackFired: false,
    updatedAt: 0,
    ...over,
  };
}

const types = (events: ReturnType<typeof detectEvents>["events"]) =>
  events.map((e) => e.type);

describe("detectEvents — tipoff", () => {
  it("fires tipoff on upcoming → live", () => {
    const { events } = detectEvents(cached({ status: "upcoming" }), fresh({ status: "live" }));
    expect(types(events)).toContain("tipoff");
  });

  it("does NOT set isGame7 for a normal game", () => {
    const { events } = detectEvents(
      cached({ status: "upcoming" }),
      fresh({ status: "live", gameContext: "Game 4" })
    );
    const tip = events.find((e) => e.type === "tipoff");
    expect(tip?.isGame7).toBeUndefined();
  });

  it("sets isGame7 when gameContext is Game 7", () => {
    const { events } = detectEvents(
      cached({ status: "upcoming" }),
      fresh({ status: "live", gameContext: "Game 7" })
    );
    const tip = events.find((e) => e.type === "tipoff");
    expect(tip?.isGame7).toBe(true);
  });

  it("does NOT re-fire tipoff when the game was already live", () => {
    const { events } = detectEvents(cached({ status: "live", period: 1 }), fresh({ status: "live", period: 1 }));
    expect(types(events)).not.toContain("tipoff");
  });
});

describe("detectEvents — end of quarter", () => {
  it("fires eoq-2 at the buzzer (statusText 'End Q2'), not at next-quarter tip", () => {
    const { events } = detectEvents(
      cached({ status: "live", period: 2 }),
      fresh({ status: "live", period: 2, statusText: "End Q2" })
    );
    expect(types(events)).toContain("eoq-2");
  });

  it("does not re-fire an eoq once its flag is set", () => {
    const { events } = detectEvents(
      cached({ status: "live", period: 2, eoq2Fired: true }),
      fresh({ status: "live", period: 2, statusText: "End Q2" })
    );
    expect(types(events)).not.toContain("eoq-2");
  });
});

describe("detectEvents — final", () => {
  it("fires final on live → final", () => {
    const { events } = detectEvents(
      cached({ status: "live", period: 4 }),
      fresh({ status: "final", period: 4, statusText: "Final" })
    );
    expect(types(events)).toContain("final");
  });
});
