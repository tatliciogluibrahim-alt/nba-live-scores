import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeNFLStandings } from "../../api/nfl-standings/normalize";
import { toFollow } from "../state/follow-migration";
import type { Follow } from "../state/types";
import {
  buildStandingsView,
  standingsNeedGate,
} from "./nfl-standings-view";

// Built on the real Week 5 capture (see the normalizer tests).
const standings = normalizeNFLStandings(
  JSON.parse(
    readFileSync(
      new URL(
        "../../../scripts/fixtures/nfl-standings-2026-10-11.json",
        import.meta.url
      ),
      "utf8"
    )
  )
)!;

function follow(
  momentId: string,
  scopeId: string | null,
  extra: Partial<Follow> = {}
): Follow {
  return {
    ...toFollow({
      momentId,
      scope: scopeId ? "team" : "all",
      scopeId,
      alertEnabled: true,
      alertTier: "quiet",
      followedAt: 1,
    }),
    ...extra,
  };
}

const ESPN_ORDER = [
  "AFC East",
  "AFC North",
  "AFC South",
  "AFC West",
  "NFC East",
  "NFC North",
  "NFC South",
  "NFC West",
];

describe("buildStandingsView", () => {
  it("with no team follows, keeps ESPN's conference and division order", () => {
    const view = buildStandingsView(standings, new Set());
    expect(view.divisions.map((d) => d.name)).toEqual(ESPN_ORDER);
    expect(view.divisions.every((d) => !d.followed)).toBe(true);
  });

  it("puts the followed team's division first and marks the team", () => {
    const view = buildStandingsView(standings, new Set(["PIT"]));
    expect(view.divisions.map((d) => d.name)).toEqual([
      "AFC North",
      "AFC East",
      "AFC South",
      "AFC West",
      "NFC East",
      "NFC North",
      "NFC South",
      "NFC West",
    ]);
    const north = view.divisions[0];
    expect(north.followed).toBe(true);
    expect(north.rows.map((r) => [r.pos, r.abbreviation, r.followed])).toEqual([
      [1, "CLE", false],
      [2, "BAL", false],
      [3, "PIT", true],
      [4, "CIN", false],
    ]);
  });

  it("keeps several followed divisions in ESPN order ahead of the rest", () => {
    const view = buildStandingsView(standings, new Set(["GB", "PIT"]));
    expect(view.divisions.slice(0, 2).map((d) => d.name)).toEqual([
      "AFC North",
      "NFC North",
    ]);
    expect(view.divisions).toHaveLength(8);
  });

  it("carries each row's record exactly as normalized", () => {
    const view = buildStandingsView(standings, new Set());
    const kc = view.divisions[3].rows[0];
    expect(kc).toMatchObject({
      abbreviation: "KC",
      name: "Chiefs",
      wins: 4,
      losses: 0,
      ties: 0,
      pct: "1.000",
      div: "2-0",
    });
  });

  it("knows the season is underway once any team has played", () => {
    expect(buildStandingsView(standings, new Set()).seasonUnderway).toBe(true);
  });

  it("reads a 0-0 league as not underway", () => {
    const blank = {
      ...standings,
      conferences: standings.conferences.map((c) => ({
        ...c,
        divisions: c.divisions.map((d) => ({
          ...d,
          teams: d.teams.map((t) => ({
            ...t,
            wins: 0,
            losses: 0,
            ties: 0,
            divisionRecord: "0-0",
          })),
        })),
      })),
    };
    expect(buildStandingsView(blank, new Set()).seasonUnderway).toBe(false);
  });

  it("shows the division column only when every team has a record", () => {
    expect(buildStandingsView(standings, new Set()).showDivisionRecord).toBe(true);
    const gap = {
      ...standings,
      conferences: standings.conferences.map((c, ci) => ({
        ...c,
        divisions: c.divisions.map((d, di) => ({
          ...d,
          teams: d.teams.map((t, ti) =>
            ci === 0 && di === 0 && ti === 0 ? { ...t, divisionRecord: null } : t
          ),
        })),
      })),
    };
    expect(buildStandingsView(gap, new Set()).showDivisionRecord).toBe(false);
  });
});

describe("standingsNeedGate (standings reveal results)", () => {
  it("gates under global No-Spoilers", () => {
    expect(standingsNeedGate(true, [])).toBe(true);
  });

  it("gates when an NFL follow hides spoilers, even with the global toggle off", () => {
    const pit = follow("nfl-season-2026", "PIT", { hideSpoilers: true });
    expect(standingsNeedGate(false, [pit])).toBe(true);
  });

  it("gates for a whole-season NFL follow that hides spoilers", () => {
    const season = follow("nfl-season-2026", null, { hideSpoilers: true });
    expect(standingsNeedGate(false, [season])).toBe(true);
  });

  it("ignores a hidden follow from another sport (the LAC collision)", () => {
    const clippers = follow("nba-playoffs-2026", "LAC", { hideSpoilers: true });
    expect(standingsNeedGate(false, [clippers])).toBe(false);
  });

  it("stays open with No-Spoilers off and nothing hidden", () => {
    expect(standingsNeedGate(false, [follow("nfl-season-2026", "PIT")])).toBe(false);
    expect(standingsNeedGate(false, [])).toBe(false);
  });
});
