import { describe, it, expect } from "vitest";
import { composeBrief, shouldSendBrief } from "./compose-brief";
import type { BriefSubscriber } from "./subscriber-store";
import type { Game } from "../../nba/types";
import type { Follow } from "../../companion/state/types";

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
      score: null,
      logo: "",
    } as Game["home"],
    away: {
      id: "2",
      abbreviation: "OKC",
      name: "Oklahoma City",
      score: null,
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

const teamFollow = (id: string): Follow => ({
  kind: "team",
  id,
  alertEnabled: true,
  alertTier: "companion",
  followedAt: 0,
});

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
