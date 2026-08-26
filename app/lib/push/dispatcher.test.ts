import { describe, it, expect } from "vitest";
import {
  subscriberWantsEvent,
  subscriberUsesNoSpoilersForEvent,
  isStartEvent,
  buildPayload,
  buildLiveActivityOfferPayload,
  liveActivityOfferData,
  wantsLiveActivityOffer,
} from "./dispatcher";
import type { PushEvent } from "./event-detector";
import type { SyncedAlert, SyncedFollow } from "./sync-validation";
import { scoreEvent } from "./significance";

// Dispatcher matcher coverage. This is the launch-critical fan-out gate:
// for any (subscriber, event) pair it decides whether the push goes out.
// Bugs here are silent — a user just stops getting alerts they expected —
// so the matrix is locked here. Events carry a real significance score (as
// the detectors attach in production) so the tier gate is exercised honestly.

function nbaEvent(over: Partial<PushEvent> = {}): PushEvent {
  const e: PushEvent = {
    type: "final",
    gameId: "g1",
    awayCode: "OKC",
    homeCode: "SA",
    awayScore: 0,
    homeScore: 0,
    ...over,
  };
  return {
    ...e,
    significance:
      over.significance ??
      scoreEvent({
        type: e.type,
        isGame7: e.isGame7,
        margin: Math.abs(e.awayScore - e.homeScore),
      }),
  };
}

function wcEvent(over: Partial<PushEvent> = {}): PushEvent {
  const e: PushEvent = {
    type: "wc-final",
    gameId: "w1",
    awayCode: "BRA",
    homeCode: "ARG",
    awayScore: 0,
    homeScore: 0,
    stage: "Final",
    ...over,
  };
  return {
    ...e,
    significance: over.significance ?? scoreEvent({ type: e.type, stage: e.stage }),
  };
}

function nflEvent(over: Partial<PushEvent> = {}): PushEvent {
  const e: PushEvent = {
    type: "nfl-final",
    gameId: "n1",
    awayCode: "LAC",
    homeCode: "KC",
    awayScore: 0,
    homeScore: 0,
    ...over,
  };
  return {
    ...e,
    significance:
      over.significance ??
      scoreEvent({
        type: e.type,
        margin: Math.abs(e.awayScore - e.homeScore),
      }),
  };
}

function sub(
  alerts: SyncedAlert[],
  noSpoilers = false,
  spoilerFollows: SyncedFollow[] = []
) {
  return { alerts, noSpoilers, spoilerFollows };
}

describe("subscriberWantsEvent — team & country direct match", () => {
  it("matches an NBA team follow on the away side", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("matches an NBA team follow on the home side", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "SA", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("does NOT match a team follow for a different team", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(false);
  });

  it("matches a WC country follow on the away side", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(true);
  });

  it("does NOT cross sports: NBA team follow on a WC event", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "BRA", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — series follow (NBA only)", () => {
  it("matches when both teams are in the series key", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "OKC-SA", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("matches with reversed series key (OKC vs SA, key SA-OKC)", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "SA-OKC", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(true);
  });

  it("does NOT match when only ONE team is in the series", () => {
    // Series follow for OKC-NYK; event is OKC vs SA. Only OKC matches.
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "OKC-NYK", tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(false);
  });

  it("series follows do not match WC events", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "BRA-ARG", tier: "companion" }]),
        wcEvent()
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — tournament follow", () => {
  it("nba-playoffs-* tournament follow matches any NBA event", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "all", scopeId: null, tier: "companion" }]),
        nbaEvent({ awayCode: "BOS", homeCode: "MIA" }) // teams unrelated to follow
      )
    ).toBe(true);
  });

  it("fifa-world-cup-* tournament follow matches any WC event", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "fifa-world-cup-2026", scope: "all", scopeId: null, tier: "companion" }]),
        wcEvent({ awayCode: "USA", homeCode: "MEX" })
      )
    ).toBe(true);
  });

  it("nba-playoffs tournament does NOT match WC events", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "all", scopeId: null, tier: "companion" }]),
        wcEvent()
      )
    ).toBe(false);
  });

  it("fifa-world-cup tournament does NOT match NBA events", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "fifa-world-cup-2026", scope: "all", scopeId: null, tier: "companion" }]),
        nbaEvent()
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — tier filtering", () => {
  it("Quiet tier gets tipoff", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "quiet" }]),
        nbaEvent({ type: "tipoff" })
      )
    ).toBe(true);
  });

  it("Quiet tier does NOT get end-of-quarter", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "quiet" }]),
        nbaEvent({ type: "eoq-1" })
      )
    ).toBe(false);
  });

  it("Companion tier DOES get end-of-quarter", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "companion" }]),
        nbaEvent({ type: "eoq-1" })
      )
    ).toBe(true);
  });
});

describe("subscriberWantsEvent — significance gate (the engine's point)", () => {
  it("a classic breaks through to a Quiet follower of their team", () => {
    // A comeback is not in Quiet's old event list, but it's a genuine
    // moment — a Quiet user following OKC should still get it.
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "quiet" }]),
        nbaEvent({ type: "comeback", significance: scoreEvent({ type: "comeback", maxLead: 20 }) })
      )
    ).toBe(true);
  });

  it("a routine tipoff does NOT reach a Quiet WHOLE-TOURNAMENT follower", () => {
    // No personal boost for a tournament follow — Quiet stays finals + classics.
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "all", scopeId: null, tier: "quiet" }]),
        nbaEvent({ type: "tipoff" })
      )
    ).toBe(false);
  });

  it("...but a final DOES reach that same Quiet tournament follower", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "all", scopeId: null, tier: "quiet" }]),
        nbaEvent({ type: "final" })
      )
    ).toBe(true);
  });

  it("the personal boost: your country's goal in the final reaches you on Quiet", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA", tier: "quiet" }]),
        wcEvent({ type: "wc-goal", stage: "Final", awayScore: 1, homeScore: 0 })
      )
    ).toBe(true);
  });

  it("tier invariant: a direct follow ALWAYS gets start + final, even at significance 0", () => {
    for (const type of ["tipoff", "final"] as const) {
      expect(
        subscriberWantsEvent(
          sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "quiet" }]),
          nbaEvent({ type, significance: 0 })
        )
      ).toBe(true);
    }
    // A country follow gets its own match kickoff + full time regardless.
    for (const type of ["wc-kickoff", "wc-final"] as const) {
      expect(
        subscriberWantsEvent(
          sub([{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA", tier: "quiet" }]),
          wcEvent({ type, stage: "Group A", significance: 0 })
        )
      ).toBe(true);
    }
  });

  it("the invariant does NOT extend to a broad tournament follow", () => {
    // A whole-tournament Quiet follow still gets finals by threshold, but a
    // low-significance start does not sneak through on the invariant.
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "all", scopeId: null, tier: "quiet" }]),
        nbaEvent({ type: "tipoff", significance: 20 })
      )
    ).toBe(false);
  });

  it("a routine group goal does NOT reach a Quiet country follower", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA", tier: "quiet" }]),
        wcEvent({ type: "wc-goal", stage: "Group C", awayScore: 1, homeScore: 0 })
      )
    ).toBe(false);
  });
});

describe("subscriberWantsEvent — No-Spoilers gate", () => {
  it("close-game is SUPPRESSED for noSpoilers subscribers", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "all" }], true),
        nbaEvent({ type: "close-game" })
      )
    ).toBe(false);
  });

  it("comeback is SUPPRESSED for noSpoilers subscribers", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "all" }], true),
        nbaEvent({ type: "comeback" })
      )
    ).toBe(false);
  });

  it("final is NOT suppressed for noSpoilers (calm fallback body is used)", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "companion" }], true),
        nbaEvent({ type: "final" })
      )
    ).toBe(true);
  });

  it("close-game DOES fire for non-noSpoilers", () => {
    expect(
      subscriberWantsEvent(
        sub([{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "all" }], false),
        nbaEvent({ type: "close-game" })
      )
    ).toBe(true);
  });

  it("suppresses unsafe events for a matching selectively-hidden team", () => {
    const selective = sub(
      [{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "all", hideSpoilers: true }],
      false
    );

    expect(
      subscriberWantsEvent(selective, nbaEvent({ type: "close-game" }))
    ).toBe(false);
    expect(
      subscriberWantsEvent(selective, nbaEvent({ type: "comeback" }))
    ).toBe(false);
  });
});

describe("subscriberUsesNoSpoilersForEvent — selective matching", () => {
  it("matches an inline hidden NBA team alert and redacts safe events", () => {
    const selective = sub([
      { momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC", tier: "companion", hideSpoilers: true },
    ]);
    const event = nbaEvent({ type: "final", awayScore: 112, homeScore: 108 });

    expect(subscriberUsesNoSpoilersForEvent(selective, event)).toBe(true);
    expect(
      buildPayload(
        event,
        subscriberUsesNoSpoilersForEvent(selective, event)
      ).body
    ).toBe("Game's done. Tap when you're ready.");
  });

  it("matches a hidden country without an alert slot", () => {
    const selective = sub(
      [{ momentId: "fifa-world-cup-2026", scope: "all", scopeId: null, tier: "all" }],
      false,
      [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA" }]
    );

    const event = wcEvent({ type: "wc-goal", awayScore: 1, homeScore: 0 });
    const hidden = subscriberUsesNoSpoilersForEvent(selective, event);
    expect(hidden).toBe(true);
    expect(buildPayload(event, hidden).body).toBe(
      "Someone scored. Tap to check in."
    );
  });

  it("matches a hidden NBA series only when both participants are present", () => {
    const event = nbaEvent({ awayCode: "OKC", homeCode: "SA" });
    for (const id of ["OKC-SA", "SA-OKC"]) {
      expect(
        subscriberUsesNoSpoilersForEvent(
          sub(
            [{ momentId: "nba-playoffs-2026", scope: "all", scopeId: null, tier: "all" }],
            false,
            [{ momentId: "nba-playoffs-2025", scope: "series", scopeId: id }]
          ),
          event
        )
      ).toBe(true);
    }
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "OKC-NYK" }]),
        event
      )
    ).toBe(false);
  });

  it("suppresses an unsafe event delivered through a broad alert when its series is hidden", () => {
    const selective = sub(
      [{ momentId: "nba-playoffs-2026", scope: "all", scopeId: null, tier: "all" }],
      false,
      [{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "OKC-SA" }]
    );

    expect(
      subscriberWantsEvent(selective, nbaEvent({ type: "close-game" }))
    ).toBe(false);
  });

  it("does not redact non-matching team, country, or series events", () => {
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK" }]),
        nbaEvent()
      )
    ).toBe(false);
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "USA" }]),
        wcEvent()
      )
    ).toBe(false);
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [{ momentId: "nba-playoffs-2025", scope: "series", scopeId: "NYK-BOS" }]),
        nbaEvent()
      )
    ).toBe(false);
  });

  it("intentionally excludes tournament selective hiding", () => {
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [
          { momentId: "nba-playoffs-2026", scope: "all", scopeId: null },
        ]),
        nbaEvent()
      )
    ).toBe(false);
  });

  it("keeps global No-Spoilers backward-compatible", () => {
    expect(subscriberUsesNoSpoilersForEvent(sub([], true), nbaEvent())).toBe(
      true
    );
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

  it("builds offer data with pin metadata and the exact game URL", () => {
    expect(liveActivityOfferData(wcEvent())).toEqual({
      type: "live-activity-offer",
      gameId: "wc1",
      sport: "wc",
      url: "/game/wc1?offer=live-activity",
    });
    expect(liveActivityOfferData(nbaEvent({ type: "tipoff", gameId: "g9" }))).toEqual({
      type: "live-activity-offer",
      gameId: "g9",
      sport: "nba",
      url: "/game/g9?offer=live-activity",
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

// ── NFL fan-out (the Sep-9 gate) ──────────────────────────────────────
// Every NFL alert was silently dropped here: the dispatcher classified an
// event's sport as a WC-or-NBA binary, so an "nfl-*" type read as "nba".
// An NFL follow (momentSport "nfl") then failed the sport gate on every
// event, and — the mirror image — an NBA follow of a colliding code (CLE,
// LAC, and 12 others) matched NFL events it has nothing to do with.
// Preseason's delivery hold masked it: no NFL event ever reached the matcher.

describe("subscriberWantsEvent — NFL fan-out", () => {
  const nflTeam = (scopeId: string): SyncedAlert => ({
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId,
    tier: "companion",
  });
  const nbaTeam = (scopeId: string): SyncedAlert => ({
    momentId: "nba-playoffs-2025",
    scope: "team",
    scopeId,
    tier: "companion",
  });

  it("matches an NFL team follow on the home side", () => {
    expect(subscriberWantsEvent(sub([nflTeam("KC")]), nflEvent())).toBe(true);
  });

  it("matches an NFL team follow on the away side", () => {
    expect(subscriberWantsEvent(sub([nflTeam("LAC")]), nflEvent())).toBe(true);
  });

  it("matches a whole-season NFL follow on any NFL event", () => {
    const all: SyncedAlert = {
      momentId: "nfl-season-2026",
      scope: "all",
      scopeId: null,
      tier: "companion",
    };
    expect(subscriberWantsEvent(sub([all]), nflEvent({ type: "nfl-kickoff" }))).toBe(
      true
    );
  });

  it("does NOT match an NFL follow for a different team", () => {
    expect(subscriberWantsEvent(sub([nflTeam("BUF")]), nflEvent())).toBe(false);
  });

  it("collision guard: an NBA 'LAC' follow never matches an NFL LAC event", () => {
    // The Clippers follower must not be woken by a Chargers game.
    expect(subscriberWantsEvent(sub([nbaTeam("LAC")]), nflEvent())).toBe(false);
  });

  it("collision guard: an NFL 'LAC' follow never matches an NBA LAC event", () => {
    expect(
      subscriberWantsEvent(
        sub([nflTeam("LAC")]),
        nbaEvent({ awayCode: "LAC", homeCode: "GSW" })
      )
    ).toBe(false);
  });

  it("a direct NFL follow gets kickoff and final on Quiet (the tier floor)", () => {
    const quiet: SyncedAlert = {
      momentId: "nfl-season-2026",
      scope: "team",
      scopeId: "KC",
      tier: "quiet",
    };
    expect(
      subscriberWantsEvent(sub([quiet]), nflEvent({ type: "nfl-kickoff" }))
    ).toBe(true);
    expect(subscriberWantsEvent(sub([quiet]), nflEvent({ type: "nfl-final" }))).toBe(
      true
    );
  });

  it("Quiet does NOT get a mid-game NFL touchdown", () => {
    const quiet: SyncedAlert = {
      momentId: "nfl-season-2026",
      scope: "team",
      scopeId: "KC",
      tier: "quiet",
    };
    expect(
      subscriberWantsEvent(sub([quiet]), nflEvent({ type: "nfl-td-rushing" }))
    ).toBe(false);
  });
});

describe("selective No-Spoilers — NFL", () => {
  it("an NFL hide-spoilers follow redacts its own game", () => {
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [
          { momentId: "nfl-season-2026", scope: "team", scopeId: "KC" },
        ]),
        nflEvent()
      )
    ).toBe(true);
  });

  it("an NBA hide-spoilers follow does NOT redact a same-code NFL game", () => {
    // Hiding the Cavaliers must not silently redact Browns pushes.
    expect(
      subscriberUsesNoSpoilersForEvent(
        sub([], false, [
          { momentId: "nba-playoffs-2025", scope: "team", scopeId: "CLE" },
        ]),
        nflEvent({ awayCode: "CLE", homeCode: "CHI" })
      )
    ).toBe(false);
  });
});

describe("liveActivityOfferData — sport tag", () => {
  it("tags an NFL offer as nfl (the native side themes on this)", () => {
    expect(liveActivityOfferData(nflEvent({ type: "nfl-kickoff" })).sport).toBe(
      "nfl"
    );
  });
  it("still tags wc and nba correctly", () => {
    expect(liveActivityOfferData(wcEvent({ type: "wc-kickoff" })).sport).toBe("wc");
    expect(liveActivityOfferData(nbaEvent({ type: "tipoff" })).sport).toBe("nba");
  });
});
