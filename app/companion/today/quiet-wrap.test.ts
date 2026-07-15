import { describe, it, expect } from "vitest";
import {
  buildTodayPayload,
  type NBAGame,
  type WCGameLite,
} from "./today-data";
import type { Follow } from "../state/types";

// Quiet Wrap was NBA-only until the WC feed was wired into buildQuietWrap.
// These lock the fix: Summer Soccer finals appear, follow-aware ordering
// holds, and a fresh user never receives unrelated discovery finals.

function wcFinal(over: Partial<WCGameLite> = {}): WCGameLite {
  return {
    id: "wc1",
    date: new Date().toISOString(), // today → inside the 3-day window
    status: "final",
    statusText: "Full time",
    stage: "Group D",
    group: "D",
    home: { name: "Türkiye", abbreviation: "TUR", score: 1 },
    away: { name: "United States", abbreviation: "USA", score: 2 },
    broadcasts: [],
    watchLabel: "",
    ...over,
  };
}

const country = (id: string): Follow => ({
  kind: "country",
  id,
  alertEnabled: false,
  alertTier: "quiet",
  followedAt: 0,
});

const follow = (kind: Follow["kind"], id: string): Follow => ({
  kind,
  id,
  alertEnabled: false,
  alertTier: "quiet",
  followedAt: 0,
});

function nbaFinal(over: Partial<NBAGame> = {}): NBAGame {
  return {
    id: "nba1",
    date: new Date().toISOString(),
    status: "final",
    statusText: "Final",
    period: 4,
    matchup: "LAL vs BOS",
    gameContext: "Game 4",
    seriesSummary: "BOS WINS SERIES 4-0",
    seriesConference: "Finals",
    seriesRound: "NBA Finals",
    away: {
      name: "Los Angeles Lakers",
      abbreviation: "LAL",
      score: 99,
      logo: "",
    },
    home: {
      name: "Boston Celtics",
      abbreviation: "BOS",
      score: 110,
      logo: "",
    },
    broadcasts: [],
    ...over,
  };
}

describe("Quiet Wrap — World Cup integration", () => {
  it("surfaces a Summer Soccer final as a 'wc' row", () => {
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [],
      wc: [wcFinal()],
      follows: [country("USA")],
      pinned: [],
    });
    const wcRows = p.quietWrap.filter((r) => r.source === "wc");
    expect(wcRows).toHaveLength(1);
    expect(wcRows[0].matchup).toBe("USA vs TUR");
    expect(wcRows[0].scoreLine).toBe("2 – 1");
    expect(wcRows[0].context).toBe("Full time.");
    expect(wcRows[0].href).toBe("/game/wc1?from=today");
  });

  it("floats a followed country's final above a more-recent unfollowed one", () => {
    const followed = wcFinal({
      id: "followed",
      date: new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
      away: { name: "United States", abbreviation: "USA", score: 1 },
      home: { name: "Türkiye", abbreviation: "TUR", score: 0 },
    });
    const newer = wcFinal({
      id: "newer",
      date: new Date().toISOString(), // now (more recent)
      away: { name: "Brazil", abbreviation: "BRA", score: 2 },
      home: { name: "Scotland", abbreviation: "SCO", score: 0 },
    });
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [],
      wc: [newer, followed],
      follows: [country("USA")],
      pinned: [],
    });
    expect(p.quietWrap[0].id).toBe("followed");
  });

  it("shows no wrap to a fresh user with no follows", () => {
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [],
      wc: [
        wcFinal({ id: "a" }),
        wcFinal({
          id: "b",
          away: { name: "Brazil", abbreviation: "BRA", score: 1 },
          home: { name: "Scotland", abbreviation: "SCO", score: 0 },
        }),
      ],
      follows: [],
      pinned: [],
    });
    expect(p.quietWrap).toHaveLength(0);
  });

  it("shows a follower ONLY their own finals, never unrelated ones (contract)", () => {
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [],
      wc: [
        wcFinal({
          id: "usa",
          away: { name: "USA", abbreviation: "USA", score: 2 },
          home: { name: "Iran", abbreviation: "IRN", score: 1 },
        }),
        wcFinal({
          id: "other",
          away: { name: "X", abbreviation: "X0", score: 1 },
          home: { name: "Y", abbreviation: "Y0", score: 0 },
        }),
      ],
      follows: [country("USA")],
      pinned: [],
    });
    // Only USA's final — the unrelated one never fills a slot.
    expect(p.quietWrap.map((i) => i.id)).toEqual(["usa"]);
  });

  it("shows an empty wrap when the follower's teams didn't play (no unrelated fill)", () => {
    const finals = ["a", "b", "c"].map((id, i) =>
      wcFinal({
        id,
        date: new Date(Date.now() - i * 3_600_000).toISOString(),
        away: { name: "X", abbreviation: `X${i}`, score: 1 },
        home: { name: "Y", abbreviation: `Y${i}`, score: 0 },
      })
    );
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [],
      wc: finals,
      follows: [country("USA")], // a follow exists, but none of these are theirs
      pinned: [],
    });
    expect(p.quietWrap).toHaveLength(0);
  });

  it("treats a followed NBA series as personal", () => {
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [nbaFinal()],
      wc: [],
      follows: [follow("series", "LAL-BOS")],
      pinned: [],
    });
    expect(p.quietWrap.map((item) => item.id)).toEqual(["nba1"]);
  });

  it("treats a followed tournament as personal without adding other sports", () => {
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [nbaFinal()],
      wc: [wcFinal()],
      follows: [follow("tournament", "fifa-world-cup-2026")],
      pinned: [],
    });
    expect(p.quietWrap.map((item) => item.id)).toEqual(["wc1"]);
  });

  it("counts a same-day NBA final even when its eyebrow includes Game N", () => {
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [
        nbaFinal({
          gameContext: "Game 4",
          seriesSummary: "BOS leads 2-1",
        }),
      ],
      wc: [],
      follows: [follow("team", "LAL")],
      pinned: [],
    });

    expect(p.quietWrap[0].eyebrow).toContain("Game 4");
    expect(p.slateComplete).toBe(true);
    expect(p.finalsCount).toBe(1);
    expect(p.recapFinals).toEqual([
      {
        source: "nba",
        id: "nba1",
        awayCode: "LAL",
        homeCode: "BOS",
      },
    ]);
  });

  it("counts every personal final beyond Quiet Wrap's three-row cap", () => {
    const finals = ["a", "b", "c", "d"].map((id, index) =>
      wcFinal({
        id,
        away: {
          name: `Away ${index}`,
          abbreviation: `A${index}`,
          score: 2,
        },
        home: {
          name: `Home ${index}`,
          abbreviation: `H${index}`,
          score: 1,
        },
      })
    );
    const p = buildTodayPayload({
      nba: [],
      nbaRecent: [],
      wc: finals,
      follows: [follow("tournament", "fifa-world-cup-2026")],
      pinned: [],
    });

    expect(p.quietWrap).toHaveLength(3);
    expect(p.slateComplete).toBe(true);
    expect(p.finalsCount).toBe(4);
    expect(p.recapFinals).toHaveLength(4);
  });
});
