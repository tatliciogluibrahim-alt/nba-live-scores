import { describe, it, expect } from "vitest";
import { deriveTodayHeadline, type TodayPayload } from "./today-data";

// Covers the Front Page headline copy + deck derivation. The headline
// is real state-driven copy (not the conversational brief sentence), so
// these lock the punchy strings per state.

function base(over: Partial<TodayPayload> = {}): TodayPayload {
  return {
    hero: null,
    youFollow: [],
    upNext: [],
    quietWrap: [],
    reminder: null,
    isQuietDay: true,
    slateComplete: false,
    finalsCount: 0,
    closing: null,
    pinnedSummary: {
      total: 0,
      live: 0,
      upcoming: 0,
      final: 0,
      unresolved: 0,
      primary: null,
    },
    ...over,
  };
}

function upNextItem(over: Partial<TodayPayload["upNext"][number]> = {}) {
  return {
    source: "nba" as const,
    id: "g1",
    pinned: false,
    personal: true,
    eyebrow: "NBA · Tonight",
    headline: "OKC vs SA",
    detail: "8:30 PM · Game 6",
    href: "/game/g1",
    spoilerSubject: "OKC vs SA",
    ...over,
  };
}

describe("deriveTodayHeadline", () => {
  it("leads with a live headline when a game is live", () => {
    const r = deriveTodayHeadline(
      base({
        hero: {
          kind: "nba-live",
          eyebrow: "NBA · Live",
          headline: "OKC vs SA",
          spoilerMatchup: "OKC vs SA",
          context: "Q3 · 8:42",
          live: true,
          accent: "var(--nba)",
          href: "/game/g1",
          watch: { channel: "NBC" },
        },
      })
    );
    expect(r.headline).toBe("One game live.");
    expect(r.eyebrow.label).toBe("Live now");
    expect(r.eyebrow.tone).toBe("nba");
    expect(r.deck?.matchup).toBe("OKC vs SA");
    expect(r.deck?.broadcast).toBe("NBC");
  });

  it("counts upcoming games with spelled numbers", () => {
    const r = deriveTodayHeadline(
      base({ upNext: [upNextItem(), upNextItem({ id: "g2", href: "/game/g2" })] })
    );
    expect(r.headline).toBe("Two games up next.");
    expect(r.eyebrow.label).toBe("Up next");
    expect(r.deck?.matchup).toBe("OKC vs SA");
    expect(r.deck?.detail).toBe("8:30 PM · Game 6");
  });

  it("singular for one upcoming game", () => {
    const r = deriveTodayHeadline(base({ upNext: [upNextItem()] }));
    expect(r.headline).toBe("One game up next.");
  });

  it("is calm when nothing is live or upcoming", () => {
    expect(deriveTodayHeadline(base()).headline).toBe("All quiet.");
  });

  it("softens to 'Quiet for now.' when a countdown reminder is present", () => {
    const r = deriveTodayHeadline(
      base({ reminder: { text: "World Cup kicks off in 15 days." } })
    );
    expect(r.headline).toBe("Quiet for now.");
    expect(r.deck).toBeNull();
  });
});
