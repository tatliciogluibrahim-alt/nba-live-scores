import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { composeBrief } from "../../lib/brief/compose-brief";
import type { Follow } from "../state/types";
import { nflBriefSlate, previewIncludesScores } from "./brief-preview-data";

// A real /api/nfl-scores response (Week 4, captured 2026-10-01): the exact
// payload the preview and the send-briefs cron both read.
const week4 = JSON.parse(
  readFileSync(
    new URL("../../../scripts/fixtures/nfl-week4-2026.json", import.meta.url),
    "utf8"
  )
);

function nflFollow(scopeId: string, extra: Partial<Follow> = {}): Follow {
  return {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId,
    kind: "team",
    id: scopeId,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
    ...extra,
  };
}

describe("nflBriefSlate", () => {
  it("keeps every game of a real week with the fields the composer reads", () => {
    const slate = nflBriefSlate(week4);
    expect(slate).toHaveLength(16);
    expect(slate[0]).toEqual({
      id: "401872964",
      date: "2026-10-02T00:15Z",
      status: "final",
      statusText: "Final",
      week: 4,
      seasonType: 2,
      home: { abbreviation: "CLE", name: "Browns", score: 27 },
      away: { abbreviation: "PIT", name: "Steelers", score: 24 },
    });
  });

  it("drops rows it cannot trust instead of guessing", () => {
    const good = week4.games[0];
    const slate = nflBriefSlate({
      games: [
        good,
        { ...good, id: "x1", status: "postponed" },
        { ...good, id: "x2", home: undefined },
        { ...good, id: "x3", away: { ...good.away, score: "24" } },
        null,
      ],
    });
    expect(slate.map((g) => g.id)).toEqual([good.id]);
  });

  it("reads a failed or empty response as no games", () => {
    expect(nflBriefSlate(null)).toEqual([]);
    expect(nflBriefSlate({})).toEqual([]);
    expect(nflBriefSlate({ games: "none" })).toEqual([]);
  });

  it("puts a followed team's live game in Today (the persona sweep case)", () => {
    // Synthetic live state on a real fixture row: PIT at CLE in progress.
    const live = {
      games: [
        {
          ...week4.games[0],
          status: "live",
          statusText: "Q3 8:12",
          date: "2026-10-11T20:25Z",
        },
      ],
    };
    const payload = composeBrief({
      subscriber: {
        email: "preview@nonoisescores.app",
        follows: [nflFollow("PIT")],
        includeScores: false,
        unsubscribeToken: "preview",
        createdAt: 0,
      },
      nba: [],
      wc: [],
      nfl: nflBriefSlate(live),
      now: new Date("2026-10-11T21:00:00Z"),
    });
    expect(payload.today).toHaveLength(1);
    expect(payload.today[0]).toMatchObject({
      source: "nfl",
      matchup: "PIT · CLE",
      scoreLine: null,
      context: "Live · Q3 8:12",
    });
  });
});

describe("previewIncludesScores", () => {
  it("shows scores when nothing is hidden", () => {
    expect(previewIncludesScores(false, [nflFollow("PIT")])).toBe(true);
  });

  it("hides scores under global No-Spoilers", () => {
    expect(previewIncludesScores(true, [nflFollow("PIT")])).toBe(false);
  });

  it("hides scores when any follow hides spoilers", () => {
    expect(
      previewIncludesScores(false, [
        nflFollow("PIT"),
        nflFollow("GB", { hideSpoilers: true }),
      ])
    ).toBe(false);
  });
});
