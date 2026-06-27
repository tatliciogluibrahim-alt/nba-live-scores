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
    restingState: false,
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
    knockoutMoments: [],
    scoreboard: [],
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
    isToday: true,
    dayWord: "",
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
          headline: "Third quarter underway.",
          spoilerMatchup: "OKC vs SA",
          context: "OKC LEADS SERIES 3-2",
          stake: "OKC leads series 3-2",
          live: true,
          accent: "var(--nba)",
          href: "/game/g1",
          watch: { channel: "NBC" },
        },
      })
    );
    // NBA games skew evening → "tonight". Eyebrow carries the live state.
    expect(r.headline).toBe("OKC vs SA.");
    expect(r.eyebrow.label).toBe("Live now");
    expect(r.eyebrow.tone).toBe("nba");
    expect(r.deck?.matchup).toBe("OKC vs SA");
    expect(r.deck?.broadcast).toBe("NBC");
    // Series stake surfaces as the support line.
    expect(r.support).toBe("OKC leads series 3-2");
  });

  it("names the followed subject when one of your games is live", () => {
    const r = deriveTodayHeadline(
      base({
        hero: {
          kind: "wc-live",
          eyebrow: "Summer Soccer · Group D",
          headline: "Second half underway.",
          spoilerMatchup: "USA vs PAR",
          subject: "United States",
          followedLiveCount: 1,
          live: true,
          accent: "var(--wc)",
          href: "/game/g1",
        },
      })
    );
    expect(r.headline).toBe("United States are live.");
    expect(r.eyebrow.label).toBe("Live now");
    expect(r.eyebrow.tone).toBe("wc");
  });

  it("counts your live follows when two or more are live (over the subject)", () => {
    const r = deriveTodayHeadline(
      base({
        hero: {
          kind: "wc-live",
          eyebrow: "Summer Soccer",
          headline: "Second half underway.",
          spoilerMatchup: "USA vs PAR",
          subject: "United States",
          followedLiveCount: 2,
          context: "2 Summer Soccer matches live now.",
          live: true,
          accent: "var(--wc)",
          href: "/game/g1",
        },
      })
    );
    expect(r.headline).toBe("Two of yours are live.");
  });

  it("counts upcoming games with spelled numbers", () => {
    const r = deriveTodayHeadline(
      base({ upNext: [upNextItem(), upNextItem({ id: "g2", href: "/game/g2" })] })
    );
    expect(r.headline).toBe("Two games tonight.");
    expect(r.eyebrow.label).toBe("Up next");
    expect(r.deck?.matchup).toBe("OKC vs SA");
    expect(r.deck?.detail).toBe("8:30 PM · Game 6");
  });

  it("singular for one upcoming game", () => {
    const r = deriveTodayHeadline(base({ upNext: [upNextItem()] }));
    expect(r.headline).toBe("OKC vs SA tonight.");
  });

  it("counts only TODAY's games, not a future 'Game 7 if necessary'", () => {
    const r = deriveTodayHeadline(
      base({
        upNext: [
          upNextItem(), // tonight
          upNextItem({
            id: "g2",
            href: "/game/g2",
            isToday: false,
            dayWord: "Saturday",
            detail: "8:00 PM · Game 7 if necessary",
          }),
        ],
      })
    );
    expect(r.headline).toBe("OKC vs SA tonight.");
  });

  it("leads with the soonest day when nothing is on today", () => {
    const r = deriveTodayHeadline(
      base({
        upNext: [
          upNextItem({ isToday: false, dayWord: "Saturday" }),
          upNextItem({
            id: "g2",
            href: "/game/g2",
            isToday: false,
            dayWord: "Sunday",
          }),
        ],
      })
    );
    expect(r.headline).toBe("OKC vs SA Saturday.");
  });

  it("surfaces the series stake of an upcoming game as the support line", () => {
    const r = deriveTodayHeadline(
      base({ upNext: [upNextItem({ stake: "OKC leads series 3-2" })] })
    );
    expect(r.support).toBe("OKC leads series 3-2");
  });

  it("says 'today' for Summer Soccer games (daytime), not 'tonight'", () => {
    const r = deriveTodayHeadline(
      base({
        upNext: [
          upNextItem({
            source: "wc",
            eyebrow: "Summer Soccer · Sat",
            detail: "3:00 PM · Group D",
            stake: undefined,
          }),
        ],
      })
    );
    expect(r.headline).toBe("OKC vs SA today.");
    expect(r.eyebrow.tone).toBe("wc");
    // Summer Soccer fixtures carry no series stake.
    expect(r.support).toBeUndefined();
  });

  it("pluralizes soccer as 'matches', not the 'matchs' typo", () => {
    const r = deriveTodayHeadline(
      base({
        upNext: [
          upNextItem({ id: "w1", source: "wc", eyebrow: "Summer Soccer · Today" }),
          upNextItem({ id: "w2", source: "wc", eyebrow: "Summer Soccer · Today" }),
        ],
      })
    );
    expect(r.headline).toBe("Two matches today.");
  });

  it("pluralizes basketball as 'games'", () => {
    const r = deriveTodayHeadline(
      base({
        upNext: [
          upNextItem({ id: "g1" }),
          upNextItem({ id: "g2" }),
        ],
      })
    );
    expect(r.headline).toBe("Two games tonight.");
  });

  it("is calm when nothing is live or upcoming", () => {
    expect(deriveTodayHeadline(base()).headline).toBe("All quiet.");
  });

  it("softens to 'Quiet for now.' when a countdown reminder is present", () => {
    const r = deriveTodayHeadline(
      base({ reminder: { text: "Summer Soccer kicks off in 15 days." } })
    );
    expect(r.headline).toBe("Quiet for now.");
    expect(r.deck).toBeNull();
  });
});
