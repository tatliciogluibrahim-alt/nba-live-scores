import { describe, it, expect } from "vitest";
import {
  buildWatchingMeta,
  trackedStampText,
  isExpiredFinalPin,
  WATCHING_FINAL_TTL_MS,
  type PinnedItem,
} from "./watching-data";

// Pure copy helpers for the System D mobile Watching recomposition (D2 T5).
// Timing-only, never a winner or a margin — safe under No-Spoilers.

const s = (status: "live" | "upcoming" | "final") => ({ status });

function pin(over: Partial<PinnedItem> = {}): PinnedItem {
  return {
    source: "wc",
    id: "1",
    pinnedAt: 0,
    dateISO: "2026-07-14T19:00:00Z",
    matchup: "FRA · ESP",
    contextEyebrow: "",
    status: "final",
    statusLabel: "FINAL",
    statusTone: "final",
    scoreLine: "2 – 1",
    detailLine: "Final",
    awayCode: "FRA",
    homeCode: "ESP",
    awayName: "France",
    homeName: "Spain",
    spoilerSubject: "France vs Spain",
    spoilerKind: "final",
    href: "/game/1",
    ...over,
  };
}

describe("isExpiredFinalPin (Watching 24h auto-remove)", () => {
  const kickoff = new Date("2026-07-14T19:00:00Z").getTime();

  it("expires a final pin once kickoff + 24h has passed", () => {
    const now = kickoff + WATCHING_FINAL_TTL_MS + 1;
    expect(isExpiredFinalPin(pin({ status: "final" }), now)).toBe(true);
  });

  it("keeps a final pin just under the 24h window", () => {
    const now = kickoff + WATCHING_FINAL_TTL_MS - 1;
    expect(isExpiredFinalPin(pin({ status: "final" }), now)).toBe(false);
  });

  it("never expires a live or upcoming pin", () => {
    const now = kickoff + WATCHING_FINAL_TTL_MS * 10;
    expect(isExpiredFinalPin(pin({ status: "live" }), now)).toBe(false);
    expect(isExpiredFinalPin(pin({ status: "upcoming" }), now)).toBe(false);
  });

  it("never expires a pin with a missing or unparseable date", () => {
    const now = kickoff + WATCHING_FINAL_TTL_MS * 10;
    expect(isExpiredFinalPin(pin({ status: "final", dateISO: "" }), now)).toBe(false);
    expect(isExpiredFinalPin(pin({ status: "final", dateISO: "not-a-date" }), now)).toBe(
      false
    );
  });
});

describe("buildWatchingMeta (mobile pagehead meta)", () => {
  it("live wins over every other bucket and flags the breathing dot", () => {
    expect(buildWatchingMeta([s("live"), s("upcoming"), s("final")], 0)).toEqual({
      text: "1 GAME LIVE",
      live: true,
    });
    expect(buildWatchingMeta([s("live"), s("live")], 0)).toEqual({
      text: "2 GAMES LIVE",
      live: true,
    });
  });

  it("upcoming-only reads as tracked for later, no dot", () => {
    expect(buildWatchingMeta([s("upcoming")], 0)).toEqual({
      text: "1 TRACKED FOR LATER",
      live: false,
    });
    expect(buildWatchingMeta([s("upcoming"), s("upcoming")], 0)).toEqual({
      text: "2 TRACKED FOR LATER",
      live: false,
    });
  });

  it("final-only reads as wrapped", () => {
    expect(buildWatchingMeta([s("final")], 0).text).toBe("1 GAME WRAPPED");
    expect(buildWatchingMeta([s("final"), s("final")], 0).text).toBe("ALL WRAPPED");
  });

  it("mixed upcoming + final splits the count", () => {
    expect(buildWatchingMeta([s("upcoming"), s("final"), s("final")], 0).text).toBe(
      "1 UPCOMING · 2 WRAPPED"
    );
  });

  it("no resolved items surfaces the stale-unavailable count", () => {
    expect(buildWatchingMeta([], 1).text).toBe("1 TRACKED GAME UNAVAILABLE");
    expect(buildWatchingMeta([], 3).text).toBe("3 TRACKED GAMES UNAVAILABLE");
  });

  it("no items and no stale pins falls back to a calm default", () => {
    expect(buildWatchingMeta([], 0)).toEqual({ text: "ONE GAME TRACKED", live: false });
  });

  it("never contains pin/unpin vocabulary", () => {
    const cases = [
      buildWatchingMeta([s("live")], 0),
      buildWatchingMeta([s("upcoming")], 0),
      buildWatchingMeta([s("final")], 0),
      buildWatchingMeta([], 2),
      buildWatchingMeta([], 0),
    ];
    for (const c of cases) {
      expect(c.text.toLowerCase()).not.toMatch(/pin/);
    }
  });
});

describe("trackedStampText (agate row stamp)", () => {
  it("final is always FT", () => {
    expect(trackedStampText({ status: "final", detailLine: "Final" })).toBe("FT");
  });

  it("upcoming pulls the kickoff clock time out of the detail line", () => {
    expect(trackedStampText({ status: "upcoming", detailLine: "Tonight · 8:00 PM" })).toBe(
      "8:00 PM"
    );
    expect(
      trackedStampText({ status: "upcoming", detailLine: "Today · 12:30 PM · Group A" })
    ).toBe("12:30 PM");
  });

  it("upcoming with no parseable time falls back to Soon", () => {
    expect(trackedStampText({ status: "upcoming", detailLine: "Tomorrow" })).toBe("Soon");
  });

  it("live shows the compact clock/period from the detail line", () => {
    expect(trackedStampText({ status: "live", detailLine: "50'" })).toBe("50'");
    expect(trackedStampText({ status: "live", detailLine: "Q3 · 0:09" })).toBe("Q3 · 0:09");
  });

  it("live with an empty detail line falls back to LIVE", () => {
    expect(trackedStampText({ status: "live", detailLine: "" })).toBe("LIVE");
  });
});
