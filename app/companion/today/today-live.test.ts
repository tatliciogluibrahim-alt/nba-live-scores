import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Frozen clock: Sunday Oct 11 2026, 4:30 PM ET (the 4 PM window is live).
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-11T20:30:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

import { buildTodayPayload, deriveNFLLiveHeadline, type NBAGame } from "./today-data";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import type { Follow, PinnedGame } from "../state/types";

// Today's live slate after the persona sweep (2026-10-11): the lead carries
// the NFL situation, tracked games rank first in ALSO LIVE, the payload
// counts the whole feed's live games for a visitor with no follows, and
// Quiet Wrap rows say which day they're from.

function nfl(id: string, over: Partial<NFLGameLite> = {}): NFLGameLite {
  return {
    id,
    date: "2026-10-11T17:00Z",
    status: "live",
    statusText: "Q3 12:08",
    week: 5,
    seasonType: 2,
    period: 3,
    home: { name: "Steelers", abbreviation: "PIT", score: 17 },
    away: { name: "Colts", abbreviation: "IND", score: 13 },
    broadcasts: ["CBS"],
    ...over,
  };
}

function team(code: string): Follow {
  return {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId: code,
    kind: "team",
    id: code,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  };
}

const season: Follow = {
  momentId: "nfl-season-2026",
  scope: "all",
  scopeId: null,
  kind: "tournament",
  id: "nfl-season-2026",
  alertEnabled: true,
  alertTier: "all",
  followedAt: 1,
};

const base = { nba: [] as NBAGame[], nbaRecent: [] as NBAGame[], wc: [] };

describe("the lead carries the live situation", () => {
  it("an NFL lead gets its period and situation for the deck", () => {
    const situation = { possession: "IND", downDistance: "1st & Goal at PIT 3", redZone: true };
    const p = buildTodayPayload({
      ...base,
      nfl: [nfl("401872985", { situation })],
      follows: [team("PIT")],
      pinned: [],
    });
    expect(p.hero?.game?.period).toBe(3);
    expect(p.hero?.game?.situation).toEqual(situation);
  });

  it("the data-layer headline never says Game is live.", () => {
    expect(deriveNFLLiveHeadline(nfl("a", { statusText: "Q1 9:12", period: 1 }))).toBe(
      "First quarter underway."
    );
    expect(deriveNFLLiveHeadline(nfl("a", { statusText: "End of 1st", period: 2 }))).toBe(
      "End of the first quarter."
    );
  });
});

describe("ALSO LIVE: tracked games rank first", () => {
  it("a tracked game sorts ahead of followed ones, and says so", () => {
    const pinned: PinnedGame[] = [{ gameId: "g3", pinnedAt: 5 }];
    const p = buildTodayPayload({
      ...base,
      nfl: [nfl("g1"), nfl("g2"), nfl("g3")],
      follows: [season],
      pinned,
    });
    expect(p.scoreboard.map((t) => t.id)).toEqual(["g3", "g1", "g2"]);
    expect(p.scoreboard[0].tracked).toBe(true);
    expect(p.scoreboard[1].tracked).toBe(false);
  });
});

describe("feedLive: the whole feed's live count", () => {
  it("counts live games whatever the user follows", () => {
    const games = [
      nfl("a"),
      nfl("b"),
      nfl("c", { status: "final", statusText: "Final" }),
      nfl("d", { status: "upcoming", statusText: "Upcoming" }),
    ];
    const p = buildTodayPayload({ ...base, nfl: games, follows: [], pinned: [] });
    expect(p.feedLive).toEqual({ nba: 0, wc: 0, nfl: 2 });
    // Nothing personal: the calm state still owns the slot when nothing is live.
    expect(p.isQuietDay).toBe(true);
  });
});

describe("Quiet Wrap rows say which day they're from", () => {
  it("today's finals read Today, yesterday's carry nothing, older ones the weekday", () => {
    const finals = [
      // 1 PM Sunday window: today.
      nfl("sun", { status: "final", statusText: "Final", date: "2026-10-11T17:00Z" }),
      // Thursday night (TB at DAL, Week 5): three days back in ET.
      nfl("thu", {
        status: "final",
        statusText: "Final",
        date: "2026-10-09T00:15Z",
        home: { name: "Cowboys", abbreviation: "DAL", score: 16 },
        away: { name: "Buccaneers", abbreviation: "TB", score: 24 },
      }),
      // Saturday: yesterday.
      nfl("sat", { status: "final", statusText: "Final", date: "2026-10-10T20:00Z" }),
    ];
    const p = buildTodayPayload({
      ...base,
      nfl: finals,
      follows: [season],
      pinned: [],
      now: new Date("2026-10-11T20:30:00Z"),
    });
    const byId = new Map(p.quietWrap.map((i) => [i.id, i]));
    expect(byId.get("sun")?.dayNote).toBe("Today");
    expect(byId.get("sat")?.dayNote).toBeUndefined();
    expect(byId.get("thu")?.dayNote).toBe(
      new Date("2026-10-09T00:15Z").toLocaleDateString(undefined, { weekday: "short" })
    );
  });
});
