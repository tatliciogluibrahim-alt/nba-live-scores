import { describe, it, expect } from "vitest";
import { buildTodayPayload, type WCGameLite } from "./today-data";
import type { Follow } from "../state/types";

// Quiet Wrap was NBA-only until the WC feed was wired into buildQuietWrap.
// These lock the fix: Summer Soccer finals appear, follow-aware ordering
// holds, and the "no follows → 1 discovery row" cap no longer misfires for
// a country-only (soccer) follower.

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
    expect(wcRows[0].href).toBe("/game/wc1");
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

  it("caps a user with NO follows at a single discovery row", () => {
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
    expect(p.quietWrap).toHaveLength(1);
  });

  it("gives a country-only follower the full slate (cap 3), not the no-follow cap", () => {
    const finals = ["a", "b", "c", "d"].map((id, i) =>
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
      follows: [country("USA")], // a follow exists, just no matching team
      pinned: [],
    });
    expect(p.quietWrap).toHaveLength(3);
  });
});
