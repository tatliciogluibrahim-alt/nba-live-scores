import { describe, it, expect } from "vitest";
import {
  subscriberWantsEvent,
  isStartEvent,
  buildPayload,
  buildLiveActivityOfferPayload,
  liveActivityOfferData,
  wantsLiveActivityOffer,
} from "./dispatcher";
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

describe("buildPayload — WC lifecycle collapse (peer review 2026-07-11)", () => {
  // Match-state pushes (kickoff, halftime, second half, full time) share
  // ONE Notification Center slot per match: each state replaces the last,
  // so a finished match leaves goals + "Full time", never a stale
  // "Halftime" stack. Goals keep per-scoreline tags — the user asked for
  // them, they persist. Dedupe is dedupeTagFor (separate), NOT these tags.
  it("gives kickoff, halftime, second half, and full time one shared state tag", () => {
    const states = [
      "wc-kickoff",
      "wc-halftime",
      "wc-second-half",
      "wc-final",
    ] as const;
    for (const type of states) {
      expect(buildPayload(wcEvent({ type }), false).tag).toBe("w1:wc-state");
    }
  });

  it("keeps every goal in its own slot (per-scoreline tags)", () => {
    const first = buildPayload(
      wcEvent({ type: "wc-goal", awayScore: 1, homeScore: 0 }),
      false
    );
    const second = buildPayload(
      wcEvent({ type: "wc-goal", awayScore: 1, homeScore: 1 }),
      false
    );
    expect(first.tag).toBe("w1:wc-goal:1-0");
    expect(second.tag).toBe("w1:wc-goal:1-1");
    expect(first.tag).not.toBe(second.tag);
  });

  it("keeps the live-activity offer in the same slot as the kickoff push", () => {
    const offer = buildLiveActivityOfferPayload(wcEvent({ type: "wc-kickoff" }));
    const kickoff = buildPayload(wcEvent({ type: "wc-kickoff" }), false);
    expect(offer.tag).toBe(kickoff.tag);
  });
});

describe("live-activity offer builders", () => {
  function wcEvent(over: Partial<PushEvent> = {}): PushEvent {
    return {
      type: "wc-kickoff",
      gameId: "wc1",
      awayCode: "BRA",
      homeCode: "JPN",
      awayScore: 0,
      homeScore: 0,
      ...over,
    };
  }

  it("treats tipoff and wc-kickoff as start events", () => {
    expect(isStartEvent(nbaEvent({ type: "tipoff" }))).toBe(true);
    expect(isStartEvent(wcEvent())).toBe(true);
  });

  it("does not treat non-start events as start events", () => {
    expect(isStartEvent(nbaEvent({ type: "final" }))).toBe(false);
    expect(isStartEvent(nbaEvent({ type: "close-game" }))).toBe(false);
    expect(isStartEvent(wcEvent({ type: "wc-goal" }))).toBe(false);
  });

  it("builds a spoiler-safe offer payload with the matchup as title", () => {
    const p = buildLiveActivityOfferPayload(wcEvent());
    expect(p.title).toBe("BRA vs JPN");
    expect(p.subtitle).toBe("Starting now");
    expect(p.body).toBe("Track this match on your Lock Screen.");
    expect(p.url).toBe("/game/wc1?offer=live-activity");
    expect(p.tag).toBe("wc1:wc-state");
    // never leak a score
    expect(p.body).not.toMatch(/\d/);
    // no em-dashes in user-facing copy
    expect(`${p.title}${p.subtitle}${p.body}`).not.toContain("—");
  });

  it("uses the nba start tag for nba tipoff offers", () => {
    const p = buildLiveActivityOfferPayload(nbaEvent({ type: "tipoff", gameId: "g9" }));
    expect(p.tag).toBe("g9:tipoff");
    expect(p.title).toBe("OKC vs SA");
  });

  it("builds offer data with type, gameId, and sport", () => {
    expect(liveActivityOfferData(wcEvent())).toEqual({
      type: "live-activity-offer",
      gameId: "wc1",
      sport: "wc",
    });
    expect(liveActivityOfferData(nbaEvent({ type: "tipoff", gameId: "g9" }))).toEqual({
      type: "live-activity-offer",
      gameId: "g9",
      sport: "nba",
    });
  });

  it("uses the Game 7 stakes as the offer subtitle for a Game 7 tipoff", () => {
    const p = buildLiveActivityOfferPayload(nbaEvent({ type: "tipoff", isGame7: true }));
    expect(p.subtitle).toBe("Game 7 · series on the line");
    expect(p.title).toBe("OKC vs SA");
    expect(p.body).toBe("Track this match on your Lock Screen.");
  });

  it("uses the knockout round as the offer subtitle for a WC knockout kickoff", () => {
    const p = buildLiveActivityOfferPayload(wcEvent({ stage: "Round of 32" }));
    expect(p.subtitle).toBe("Round of 32");
  });

  it("falls back to 'Starting now' for a WC group-stage kickoff", () => {
    const p = buildLiveActivityOfferPayload(wcEvent({ stage: "Group A" }));
    expect(p.subtitle).toBe("Starting now");
  });

  it("falls back to 'Starting now' for a plain tipoff with no stakes", () => {
    const p = buildLiveActivityOfferPayload(nbaEvent({ type: "tipoff" }));
    expect(p.subtitle).toBe("Starting now");
  });
});

describe("wantsLiveActivityOffer", () => {
  const base = { lockScreenOffers: true } as const;

  it("true for a start event when lockScreenOffers is on", () => {
    expect(wantsLiveActivityOffer(base, nbaEvent({ type: "tipoff" }))).toBe(true);
    expect(
      wantsLiveActivityOffer(base, nbaEvent({ type: "wc-kickoff", awayCode: "BRA", homeCode: "JPN" }))
    ).toBe(true);
  });

  it("false when the toggle is off", () => {
    expect(
      wantsLiveActivityOffer({ lockScreenOffers: false }, nbaEvent({ type: "tipoff" }))
    ).toBe(false);
  });

  it("false for non-start events even with the toggle on", () => {
    expect(wantsLiveActivityOffer(base, nbaEvent({ type: "final" }))).toBe(false);
    expect(wantsLiveActivityOffer(base, nbaEvent({ type: "close-game" }))).toBe(false);
  });

  it("treats undefined lockScreenOffers as on (default)", () => {
    expect(wantsLiveActivityOffer({}, nbaEvent({ type: "tipoff" }))).toBe(true);
  });
});
