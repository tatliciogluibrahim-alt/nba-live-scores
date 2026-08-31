import { describe, it, expect } from "vitest";
import { composeBrief, shouldSendBrief, type BriefNFLGame } from "./compose-brief";
import type { BriefSubscriber } from "./subscriber-store";
import type { Game } from "../../nba/types";
import type { Follow } from "../../companion/state/types";
import { legacyRefToFollow } from "../../companion/state/follow-migration";

// Brief composition coverage. The daily email is unsupervised — once
// cron-job.org calls /api/cron/send-briefs at 8:30 AM ET, whatever
// composeBrief returns is what every subscriber gets. Bugs here are
// silent until subscribers complain. The matrix below covers the
// scenarios that drive `shouldSendBrief`.

// Fixed clock: a Wednesday morning. "Yesterday" = Tuesday. "Today" =
// Wednesday. Everything is anchored to ET via the sports-day cutoff in
// the composer, so we keep the test data clearly ET-anchored.
const NOW = new Date("2026-06-03T13:00:00Z"); // Wed Jun 3, 9 AM ET

const YESTERDAY = "2026-06-03T01:00:00Z"; // Tue Jun 2, 9 PM ET (sports-day yesterday)
const TODAY_EVENING = "2026-06-04T01:00:00Z"; // Wed Jun 3, 9 PM ET (today's tip)

function nbaGame(over: Partial<Game> = {}): Game {
  const base: Game = {
    id: "g-test",
    date: TODAY_EVENING,
    status: "upcoming",
    statusText: "8:30 PM",
    period: 0,
    remaining: null,
    matchup: "OKC vs SA",
    gameContext: "",
    seriesSummary: "",
    seriesConference: "",
    seriesRound: "",
    home: {
      id: "1",
      abbreviation: "SA",
      name: "San Antonio",
      score: 0,
      logo: "",
    } as Game["home"],
    away: {
      id: "2",
      abbreviation: "OKC",
      name: "Oklahoma City",
      score: 0,
      logo: "",
    } as Game["away"],
    periodScores: { away: [], home: [] },
    broadcasts: [],
    line: null,
    leaders: [],
    teamComparison: [],
  };
  return { ...base, ...over };
}

function sub(over: Partial<BriefSubscriber> = {}): BriefSubscriber {
  return {
    email: "test@example.com",
    follows: [],
    includeScores: true,
    unsubscribeToken: "tok",
    createdAt: 0,
    ...over,
  };
}

const teamFollow = (id: string): Follow =>
  legacyRefToFollow("team", id, {
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  })!;

describe("composeBrief — shouldSendBrief gating", () => {
  it("returns false (skip) when subscriber has no follows and no games", () => {
    const payload = composeBrief({ subscriber: sub(), nba: [], now: NOW });
    expect(shouldSendBrief(payload)).toBe(false);
  });

  it("returns false (skip) when subscriber has follows but no games match", () => {
    const payload = composeBrief({
      subscriber: sub({ follows: [teamFollow("NYK")] }),
      nba: [nbaGame({ id: "g-okc-sa" })], // NYK not in this game
      now: NOW,
    });
    expect(shouldSendBrief(payload)).toBe(false);
  });

  it("returns TRUE when a followed team has a TODAY game", () => {
    const payload = composeBrief({
      subscriber: sub({ follows: [teamFollow("OKC")] }),
      nba: [nbaGame()], // OKC plays today
      now: NOW,
    });
    expect(shouldSendBrief(payload)).toBe(true);
    expect(payload.today).toHaveLength(1);
  });

  it("returns TRUE when a followed team has a YESTERDAY final", () => {
    const payload = composeBrief({
      subscriber: sub({ follows: [teamFollow("OKC")] }),
      nba: [
        nbaGame({
          id: "g-yest",
          date: YESTERDAY,
          status: "final",
          home: { ...nbaGame().home, score: 108 },
          away: { ...nbaGame().away, score: 100 },
        }),
      ],
      now: NOW,
    });
    expect(shouldSendBrief(payload)).toBe(true);
    expect(payload.yesterday).toHaveLength(1);
  });
});

describe("composeBrief — No-Spoilers (includeScores=false)", () => {
  it("yesterday's game shows with null scoreLine when includeScores is false", () => {
    const payload = composeBrief({
      subscriber: sub({
        follows: [teamFollow("OKC")],
        includeScores: false,
      }),
      nba: [
        nbaGame({
          id: "g-yest",
          date: YESTERDAY,
          status: "final",
          home: { ...nbaGame().home, score: 108 },
          away: { ...nbaGame().away, score: 100 },
        }),
      ],
      now: NOW,
    });
    expect(payload.yesterday).toHaveLength(1);
    // With includeScores=false the row must NOT carry a visible score.
    // The renderer uses null scoreLine to emit a redaction slug.
    expect(payload.yesterday[0]?.scoreLine).toBeNull();
  });
});

describe("composeBrief — follow filtering correctness", () => {
  it("a game with NO followed team does NOT surface", () => {
    const payload = composeBrief({
      subscriber: sub({ follows: [teamFollow("NYK")] }),
      nba: [nbaGame({ id: "g-okc-sa" })], // OKC vs SA, neither followed
      now: NOW,
    });
    expect(payload.today).toHaveLength(0);
    expect(payload.yesterday).toHaveLength(0);
  });

  it("multiple followed games on the same day all surface", () => {
    const payload = composeBrief({
      subscriber: sub({
        follows: [teamFollow("OKC"), teamFollow("NYK")],
      }),
      nba: [
        nbaGame({ id: "g1" }),
        nbaGame({
          id: "g2",
          home: { ...nbaGame().home, abbreviation: "NYK", name: "New York" },
          away: { ...nbaGame().away, abbreviation: "BOS", name: "Boston" },
        }),
      ],
      now: NOW,
    });
    expect(payload.today.length).toBeGreaterThanOrEqual(2);
  });
});

// ── NFL in the Brief (Preseason Review backlog #2) ───────────────────
// The Brief was NFL-blind: "Your alerts" named the Chiefs while
// Yesterday/Today never showed their games. These lock the weekly
// cadence: Monday morning carries Sunday's final, game day carries the
// kickoff row, preseason stays out, and the LAC collision guard holds
// in the email exactly as it does in the app.

function nflGame(over: Partial<BriefNFLGame> = {}): BriefNFLGame {
  return {
    id: "nfl-b1",
    date: "2026-09-13T17:00:00Z",
    status: "final",
    statusText: "Final",
    week: 1,
    seasonType: 2,
    home: { abbreviation: "DET", name: "Lions", score: 24 },
    away: { abbreviation: "NO", name: "Saints", score: 17 },
    ...over,
  };
}

function nflFollow(scopeId: string): Follow {
  return {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId,
    kind: "team",
    id: scopeId,
    alertEnabled: true,
    alertTier: "quiet",
    followedAt: 1,
  };
}

// Monday Sep 14 morning, after the Sunday slate.
const MONDAY = new Date("2026-09-14T12:00:00Z");

describe("composeBrief — NFL", () => {
  it("Monday's brief carries Sunday's final for a followed team", () => {
    const p = composeBrief({
      subscriber: sub({ follows: [nflFollow("DET")] }),
      nba: [],
      nfl: [nflGame()],
      now: MONDAY,
    });
    expect(p.yesterday).toHaveLength(1);
    expect(p.yesterday[0].source).toBe("nfl");
    expect(p.yesterday[0].matchup).toBe("NO · DET");
    expect(p.yesterday[0].scoreLine).toBe("17 – 24");
    expect(p.yesterday[0].context).toBe("Final · Week 1");
  });

  it("no-spoilers subscribers get the row without the score", () => {
    const p = composeBrief({
      subscriber: sub({ follows: [nflFollow("DET")], includeScores: false }),
      nba: [],
      nfl: [nflGame()],
      now: MONDAY,
    });
    expect(p.yesterday[0].scoreLine).toBeNull();
    expect(p.yesterday[0].context).toBe("Final.");
  });

  it("game day carries the kickoff row with the week label", () => {
    const p = composeBrief({
      subscriber: sub({ follows: [nflFollow("DET")] }),
      nba: [],
      nfl: [nflGame({ status: "upcoming", statusText: "Upcoming", date: "2026-09-13T17:00:00Z" })],
      now: new Date("2026-09-13T12:00:00Z"),
    });
    expect(p.today).toHaveLength(1);
    expect(p.today[0].source).toBe("nfl");
    expect(p.today[0].context).toContain("Week 1");
  });

  it("preseason finals never reach the brief", () => {
    const p = composeBrief({
      subscriber: sub({ follows: [nflFollow("DET")] }),
      nba: [],
      nfl: [nflGame({ seasonType: 1, date: "2026-09-13T17:00:00Z" })],
      now: MONDAY,
    });
    expect(p.yesterday).toHaveLength(0);
  });

  it("collision guard: an NBA LAC follow never matches an NFL LAC game", () => {
    const nbaLac = legacyRefToFollow("team", "LAC", {
      alertEnabled: true,
      alertTier: "companion",
      followedAt: 1,
    }) as Follow;
    const p = composeBrief({
      subscriber: sub({ follows: [nbaLac] }),
      nba: [],
      nfl: [
        nflGame({
          home: { abbreviation: "KC", name: "Chiefs", score: 24 },
          away: { abbreviation: "LAC", name: "Chargers", score: 17 },
        }),
      ],
      now: MONDAY,
    });
    expect(p.yesterday).toHaveLength(0);
  });

  it("a whole-season NFL follow sees every game", () => {
    const all: Follow = {
      momentId: "nfl-season-2026",
      scope: "all",
      scopeId: null,
      kind: "tournament",
      id: "nfl-season-2026",
      alertEnabled: true,
      alertTier: "quiet",
      followedAt: 1,
    };
    const p = composeBrief({
      subscriber: sub({ follows: [all] }),
      nba: [],
      nfl: [nflGame()],
      now: MONDAY,
    });
    expect(p.yesterday).toHaveLength(1);
  });
});
