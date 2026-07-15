import { describe, it, expect } from "vitest";
import {
  deriveTodayHeadline,
  wcLeadGame,
  nbaLeadGame,
  wcKnockoutStake,
  type TodayPayload,
  type WCGameLite,
  type NBAGame,
} from "./today-data";

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
    recapFinals: [],
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
    reliancePrompt: over.reliancePrompt ?? null,
  };
}

function upNextItem(
  over: Partial<TodayPayload["upNext"][number]> = {}
): TodayPayload["upNext"][number] {
  return {
    source: "nba" as const,
    id: "g1",
    pinned: false,
    personal: true,
    eyebrow: "NBA · Tonight",
    headline: "OKC vs SA",
    detail: "8:30 PM · Game 6",
    dateIso: "2026-06-12T00:30:00Z",
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

  // ── Lead game enrichment (System D monument) ──
  // The monument renders real numerals + a parseable clock; these lock
  // the thread-through from the hero / up-next pick to the headline.

  it("threads the live hero's game facts (scores + clock) through", () => {
    const game = {
      source: "wc" as const,
      gameId: "g1",
      awayCode: "JPN",
      homeCode: "GER",
      awayName: "Japan",
      homeName: "Germany",
      awayScore: 0,
      homeScore: 0,
      status: "live" as const,
      statusLine: "25'",
      stage: "Group Stage",
      contextLabel: "Group E",
      spoilerSubject: "JPN vs GER",
    };
    const r = deriveTodayHeadline(
      base({
        hero: {
          kind: "wc-live",
          eyebrow: "Summer Soccer · Group E",
          headline: "First half underway.",
          spoilerMatchup: "JPN vs GER",
          live: true,
          accent: "var(--wc)",
          href: "/game/g1",
          game,
        },
      })
    );
    expect(r.game).toEqual(game);
  });

  it("threads the up-next game's facts when the lead is upcoming (null scores)", () => {
    const game = {
      source: "nba" as const,
      gameId: "g1",
      awayCode: "OKC",
      homeCode: "SA",
      awayName: "Thunder",
      homeName: "Spurs",
      awayScore: null,
      homeScore: null,
      status: "upcoming" as const,
      statusLine: "Upcoming",
      contextLabel: "Game 6",
      spoilerSubject: "OKC vs SA",
    };
    const r = deriveTodayHeadline(base({ upNext: [upNextItem({ game })] }));
    expect(r.game).toEqual(game);
    expect(r.game?.awayScore).toBeNull();
  });

  it("carries no game facts on quiet days", () => {
    expect(deriveTodayHeadline(base()).game).toBeUndefined();
  });
});

// ── Builder unit tests: wcLeadGame + nbaLeadGame ──────────────────────
// These tests exercise the mapping layer directly — the functions that
// translate raw feed shapes into TodayLeadGame. The deriveTodayHeadline
// tests above only thread a hand-built literal through; these lock the
// real enrichment: codes from abbreviations, statusLine from statusText,
// stage/group resolution, score-nulling for upcoming, and the gameId /
// spoilerSubject contract.

function makeWC(over: Partial<WCGameLite> = {}): WCGameLite {
  return {
    id: "wc-g1",
    date: "2026-06-28T17:00Z",
    status: "live",
    statusText: "72'",
    stage: "Quarterfinals",
    group: "",
    home: { abbreviation: "GER", name: "Germany", score: 1 },
    away: { abbreviation: "JPN", name: "Japan", score: 2 },
    broadcasts: [],
    watchLabel: "",
    ...over,
  };
}

function makeNBA(over: Partial<NBAGame> = {}): NBAGame {
  return {
    id: "nba-g1",
    date: "2026-06-12T01:00Z",
    status: "live",
    statusText: "Q3 · 4:21",
    period: 3,
    matchup: "OKC vs SA",
    gameContext: "Game 6",
    seriesSummary: "OKC LEADS SERIES 3-2",
    seriesConference: "West",
    seriesRound: "NBA Finals",
    home: { name: "Spurs", abbreviation: "SA", score: 88, logo: "" },
    away: { name: "Thunder", abbreviation: "OKC", score: 95, logo: "" },
    broadcasts: ["ABC"],
    ...over,
  };
}

describe("wcLeadGame", () => {
  it("(a) live: maps abbreviations to codes and statusText to statusLine", () => {
    const r = wcLeadGame(makeWC());
    expect(r.source).toBe("wc");
    expect(r.awayCode).toBe("JPN");
    expect(r.homeCode).toBe("GER");
    expect(r.awayName).toBe("Japan");
    expect(r.homeName).toBe("Germany");
    expect(r.statusLine).toBe("72'");
    expect(r.status).toBe("live");
  });

  it("(a) live: maps scores as numbers", () => {
    const r = wcLeadGame(makeWC());
    expect(r.awayScore).toBe(2);
    expect(r.homeScore).toBe(1);
  });

  it("(a) stage mapping: knockout stage (no group) lands on contextLabel + stage", () => {
    const r = wcLeadGame(makeWC({ stage: "Quarterfinals", group: "" }));
    expect(r.stage).toBe("Quarterfinals");
    expect(r.contextLabel).toBe("Quarterfinals");
  });

  it("(a) stage mapping: group letter produces 'Group X' contextLabel over raw stage", () => {
    const r = wcLeadGame(makeWC({ stage: "Group Stage", group: "E" }));
    expect(r.contextLabel).toBe("Group E");
    // raw stage is still stored for the elimination-law peak check
    expect(r.stage).toBe("Group Stage");
  });

  it("(b) upcoming: scores are null", () => {
    const g = makeWC({
      status: "upcoming",
      home: { abbreviation: "GER", name: "Germany", score: 0 },
      away: { abbreviation: "JPN", name: "Japan", score: 0 },
    });
    const r = wcLeadGame(g);
    expect(r.awayScore).toBeNull();
    expect(r.homeScore).toBeNull();
    expect(r.status).toBe("upcoming");
  });

  it("(d) gameId and spoilerSubject are populated", () => {
    const r = wcLeadGame(makeWC());
    expect(r.gameId).toBe("wc-g1");
    expect(r.spoilerSubject).toBe("JPN vs GER");
  });
});

describe("nbaLeadGame", () => {
  it("(c) live: maps abbreviations to codes and statusText to statusLine (clock)", () => {
    const r = nbaLeadGame(makeNBA());
    expect(r.source).toBe("nba");
    expect(r.awayCode).toBe("OKC");
    expect(r.homeCode).toBe("SA");
    expect(r.awayName).toBe("Thunder");
    expect(r.homeName).toBe("Spurs");
    expect(r.statusLine).toBe("Q3 · 4:21");
    expect(r.status).toBe("live");
  });

  it("(c) live: maps scores as numbers", () => {
    const r = nbaLeadGame(makeNBA());
    expect(r.awayScore).toBe(95);
    expect(r.homeScore).toBe(88);
  });

  it("(c) gameContext maps to contextLabel", () => {
    const r = nbaLeadGame(makeNBA());
    expect(r.contextLabel).toBe("Game 6");
  });

  it("(b) upcoming: scores are null", () => {
    const r = nbaLeadGame(makeNBA({ status: "upcoming" }));
    expect(r.awayScore).toBeNull();
    expect(r.homeScore).toBeNull();
    expect(r.status).toBe("upcoming");
  });

  it("(d) gameId and spoilerSubject populated from matchup", () => {
    const r = nbaLeadGame(makeNBA());
    expect(r.gameId).toBe("nba-g1");
    expect(r.spoilerSubject).toBe("OKC vs SA");
  });
});

describe("wcKnockoutStake (knockout stake copy)", () => {
  const wcGame = (stage?: string): ReturnType<typeof wcLeadGame> => ({
    source: "wc",
    gameId: "wc-1",
    awayCode: "NOR",
    homeCode: "BRA",
    awayName: "Norway",
    homeName: "Brazil",
    awayScore: null,
    homeScore: null,
    status: "upcoming",
    statusLine: "",
    stage,
    spoilerSubject: "NOR vs BRA",
  });

  it("names the next round per knockout stage", () => {
    expect(wcKnockoutStake(wcGame("Round of 32"))).toBe(
      "Winner goes through to the Round of 16."
    );
    expect(wcKnockoutStake(wcGame("Round of 16"))).toBe(
      "Winner goes through to the quarterfinals."
    );
    expect(wcKnockoutStake(wcGame("Quarterfinals"))).toBe(
      "Winner goes through to the semifinals."
    );
    expect(wcKnockoutStake(wcGame("Semifinals"))).toBe(
      "Winner plays in the final."
    );
    expect(wcKnockoutStake(wcGame("Final"))).toBe("One match for the title.");
  });

  it("returns nothing for group stage, missing stage, and NBA leads", () => {
    expect(wcKnockoutStake(wcGame("Group L"))).toBeUndefined();
    expect(wcKnockoutStake(wcGame(undefined))).toBeUndefined();
    expect(wcKnockoutStake(undefined)).toBeUndefined();
    expect(
      wcKnockoutStake({ ...wcGame("Round of 16"), source: "nba" })
    ).toBeUndefined();
  });
});
