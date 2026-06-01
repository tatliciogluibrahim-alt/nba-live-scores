import { describe, it, expect } from "vitest";
import { subscriberWantsEvent } from "./dispatcher";
import type { PushEvent } from "./event-detector";
import type { SyncedAlert } from "./sync-validation";

// Dispatcher matcher coverage. This is the launch-critical fan-out gate:
// for any (subscriber, event) pair it decides whether the push goes out.
// Bugs here are silent — a user just stops getting alerts they expected —
// so the matrix is locked here.

function nbaEvent(over: Partial<PushEvent> = {}): PushEvent {
  return {
    type: "final",
    gameId: "g1",
    awayCode: "OKC",
    homeCode: "SA",
    awayScore: 0,
    homeScore: 0,
    ...over,
  };
}

function wcEvent(over: Partial<PushEvent> = {}): PushEvent {
  return {
    type: "wc-final",
    gameId: "w1",
    awayCode: "BRA",
    homeCode: "ARG",
    awayScore: 0,
    homeScore: 0,
    ...over,
  };
}

function sub(alerts: SyncedAlert[], noSpoilers = false) {
  return { alerts, noSpoilers };
}

describe("subscriberWantsEvent — team & country direct match", () => {
  it("matches an NBA team follow on the away side", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("matches an NBA team follow on the home side", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "SA", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("does NOT match a team follow for a different team", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "NYK", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(false);
  });

  it("matches a WC country follow on the away side", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "country", id: "BRA", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(true);
  });

  it("does NOT cross sports: NBA team follow on a WC event", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "BRA", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — series follow (NBA only)", () => {
  it("matches when both teams are in the series key", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "series", id: "OKC-SA", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("matches with reversed series key (OKC vs SA, key SA-OKC)", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "series", id: "SA-OKC", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("does NOT match when only ONE team is in the series", () => {
    // Series follow for OKC-NYK; event is OKC vs SA. Only OKC matches.
    expect(
      subscriberWantsEvent(
        sub([{ kind: "series", id: "OKC-NYK", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(false);
  });

  it("series follows do not match WC events", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "series", id: "BRA-ARG", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — tournament follow", () => {
  it("nba-playoffs-* tournament follow matches any NBA event", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "tournament", id: "nba-playoffs-2025", tier: "companion" }]),
        nbaEvent({ awayCode: "BOS", homeCode: "MIA" }) // teams unrelated to follow
      )
    ).toBe(true);
  });

  it("fifa-world-cup-* tournament follow matches any WC event", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "tournament", id: "fifa-world-cup-2026", tier: "companion" }]),
        wcEvent({ awayCode: "USA", homeCode: "MEX" })
      )
    ).toBe(true);
  });

  it("nba-playoffs tournament does NOT match WC events", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "tournament", id: "nba-playoffs-2025", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(false);
  });

  it("fifa-world-cup tournament does NOT match NBA events", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "tournament", id: "fifa-world-cup-2026", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — tier filtering", () => {
  it("Quiet tier gets tipoff", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "quiet" }]),
        nbaEvent({ type: "tipoff" })
      )
    ).toBe(true);
  });

  it("Quiet tier does NOT get end-of-quarter", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "quiet" }]),
        nbaEvent({ type: "eoq-1" })
      )
    ).toBe(false);
  });

  it("Companion tier DOES get end-of-quarter", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "companion" }]),
        nbaEvent({ type: "eoq-1" })
      )
    ).toBe(true);
  });
});

describe("subscriberWantsEvent — No-Spoilers gate", () => {
  it("close-game is SUPPRESSED for noSpoilers subscribers", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "all" }], true),
        nbaEvent({ type: "close-game" })
      )
    ).toBe(false);
  });

  it("comeback is SUPPRESSED for noSpoilers subscribers", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "all" }], true),
        nbaEvent({ type: "comeback" })
      )
    ).toBe(false);
  });

  it("final is NOT suppressed for noSpoilers (calm fallback body is used)", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "companion" }], true),
        nbaEvent({ type: "final" })
      )
    ).toBe(true);
  });

  it("close-game DOES fire for non-noSpoilers", () => {
    expect(
      subscriberWantsEvent(
        sub([{ kind: "team", id: "OKC", tier: "all" }], false),
        nbaEvent({ type: "close-game" })
      )
    ).toBe(true);
  });
});

describe("subscriberWantsEvent — defensive", () => {
  it("treats missing alerts as empty array (no match)", () => {
    expect(
      subscriberWantsEvent(
        // Bad data: alerts undefined. Should not throw, should not match.
        { alerts: undefined as unknown as SyncedAlert[], noSpoilers: false },
        nbaEvent()
      )
    ).toBe(false);
  });
});
