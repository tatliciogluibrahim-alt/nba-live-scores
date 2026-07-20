import { describe, it, expect } from "vitest";
import {
  buildScheduleCompetitions,
  followsCompetition,
  scopeCompetitions,
} from "./competitions";
import { TOURNAMENTS } from "../following/data/tournaments";
import type { Follow } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";

function f(over: Partial<Follow> & Pick<Follow, "kind" | "id">): Follow {
  const { kind, id, ...rest } = over;
  return {
    ...legacyRefToFollow(kind, id, {
      alertEnabled: false,
      alertTier: "quiet",
      followedAt: 0,
    })!,
    ...rest,
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

  it("maps NBA team/series follows to NBA; NFL requires a canonical NFL moment", () => {
    expect(
      followsCompetition("nba-playoffs-2025", [f({ kind: "team", id: "BOS" })])
    ).toBe(true);
    expect(
      followsCompetition("nba-playoffs-2025", [f({ kind: "series", id: "NYK-BOS" })])
    ).toBe(true);
    // Path B semantics: a LEGACY team follow is NBA by construction (only
    // the NBA picker ever existed pre-flip), so "BUF" as a legacy team
    // follow is NOT an NFL follow — the old directory-lookup ambiguity
    // (LAC = Clippers or Chargers?) is exactly what the schema kills.
    expect(
      followsCompetition("nfl-season-2026", [f({ kind: "team", id: "BUF" })])
    ).toBe(false);
    // An NFL follow is born canonical (addMomentFollow / the gate-3 picker).
    expect(
      followsCompetition("nfl-season-2026", [
        {
          momentId: "nfl-season-2026",
          scope: "team",
          scopeId: "BUF",
          kind: "team",
          id: "BUF",
          alertEnabled: false,
          alertTier: "quiet",
          followedAt: 0,
        },
      ])
    ).toBe(true);
    // ...and the same "LAC" as an NBA follow never leaks into the NFL.
    expect(
      followsCompetition("nfl-season-2026", [f({ kind: "team", id: "LAC" })])
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
