import { describe, it, expect } from "vitest";
import {
  buildScheduleCompetitions,
  followsCompetition,
  scopeCompetitions,
} from "./competitions";
import { TOURNAMENTS } from "../following/data/tournaments";
import type { Follow } from "../state/types";

function f(over: Partial<Follow> & Pick<Follow, "kind" | "id">): Follow {
  return {
    alertEnabled: false,
    alertTier: "quiet",
    followedAt: 0,
    ...over,
  };
}

// Mid-World-Cup: WC live (knockout), NBA Playoffs 2025 long-concluded, NFL
// coming soon. Local-constructed so wcPhase reads knockout in any tz.
const DURING_WC = new Date(2026, 6, 14, 12).getTime();

describe("followsCompetition", () => {
  it("maps a country follow to the World Cup only", () => {
    const follows = [f({ kind: "country", id: "FRA" })];
    expect(followsCompetition("fifa-world-cup-2026", follows)).toBe(true);
    expect(followsCompetition("nba-playoffs-2025", follows)).toBe(false);
    expect(followsCompetition("nfl-season-2026", follows)).toBe(false);
  });

  it("maps an NBA team / series to NBA, an NFL team to NFL", () => {
    expect(
      followsCompetition("nba-playoffs-2025", [f({ kind: "team", id: "BOS" })])
    ).toBe(true);
    expect(
      followsCompetition("nba-playoffs-2025", [f({ kind: "series", id: "NYK-BOS" })])
    ).toBe(true);
    expect(
      followsCompetition("nfl-season-2026", [f({ kind: "team", id: "BUF" })])
    ).toBe(true);
    // An NBA team is not an NFL follow.
    expect(
      followsCompetition("nfl-season-2026", [f({ kind: "team", id: "BOS" })])
    ).toBe(false);
  });

  it("maps a tournament follow by family, year-agnostic", () => {
    const follows = [f({ kind: "tournament", id: "nba-playoffs-2024" })];
    expect(followsCompetition("nba-playoffs-2025", follows)).toBe(true);
  });
});

describe("buildScheduleCompetitions", () => {
  it("includes the live WC and coming-soon NFL, drops the stale NBA playoffs", () => {
    const comps = buildScheduleCompetitions(TOURNAMENTS, [], DURING_WC);
    const ids = comps.map((c) => c.id);
    expect(ids).toContain("fifa-world-cup-2026");
    expect(ids).toContain("nfl-season-2026");
    expect(ids).not.toContain("nba-playoffs-2025"); // concluded > 30 days ago
  });

  it("tags status + views: WC live with schedule views, NFL coming soon empty", () => {
    const comps = buildScheduleCompetitions(TOURNAMENTS, [], DURING_WC);
    const wc = comps.find((c) => c.id === "fifa-world-cup-2026")!;
    expect(wc.status).toBe("live");
    expect(wc.views).toEqual(["byday", "bracket", "groups"]);
    const nfl = comps.find((c) => c.id === "nfl-season-2026")!;
    expect(nfl.status).toBe("comingsoon");
    expect(nfl.views).toEqual([]);
  });

  it("orders live before coming soon", () => {
    const comps = buildScheduleCompetitions(TOURNAMENTS, [], DURING_WC);
    expect(comps[0].status).toBe("live");
    expect(comps[comps.length - 1].status).toBe("comingsoon");
  });

  it("sets followed from the user's follows", () => {
    const comps = buildScheduleCompetitions(
      TOURNAMENTS,
      [f({ kind: "country", id: "ESP" })],
      DURING_WC
    );
    expect(comps.find((c) => c.id === "fifa-world-cup-2026")!.followed).toBe(true);
    expect(comps.find((c) => c.id === "nfl-season-2026")!.followed).toBe(false);
  });
});

describe("scopeCompetitions", () => {
  it("following scope keeps only followed; all keeps everything", () => {
    const comps = buildScheduleCompetitions(
      TOURNAMENTS,
      [f({ kind: "country", id: "FRA" })],
      DURING_WC
    );
    expect(scopeCompetitions(comps, "following").map((c) => c.id)).toEqual([
      "fifa-world-cup-2026",
    ]);
    expect(scopeCompetitions(comps, "all").length).toBe(comps.length);
  });
});
