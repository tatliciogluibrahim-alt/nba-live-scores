import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { replayNFLGame } from "./replay-nfl";
import { standardGameProfiles } from "./profiles";
import { checkNFLSummaryContract, type ReplaySummary } from "./nfl-summary";
import { buildWeekReport, renderWeekReportMarkdown, type GameInput } from "./week-report";

const FIXTURES = join(__dirname, "__fixtures__");
const load = (name: string): ReplaySummary =>
  JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));

function game(name: string, scheduledAt: string): GameInput {
  const summary = load(name);
  const probe = replayNFLGame(summary, []);
  const replay = replayNFLGame(summary, standardGameProfiles(probe.awayCode, probe.homeCode));
  return { replay, scheduledAt, contract: checkNFLSummaryContract(summary) };
}

// Two real games that kicked off in the same window, plus two others.
const games: GameInput[] = [
  game("nfl-summary-401872932-det-at-buf.json", "2026-09-18T00:15Z"),
  game("nfl-summary-401872945-ind-at-kc-ot.json", "2026-09-21T00:20Z"),
  game("nfl-summary-401872933-car-at-atl.json", "2026-09-20T17:00Z"),
  game("nfl-summary-401872941-lv-at-lac.json", "2026-09-20T17:00Z"),
];

const report = buildWeekReport({
  season: 2026,
  seasonType: 2,
  week: 2,
  generatedAt: "2026-09-22T11:00:00Z",
  games,
  scoreboardProblems: [],
});

describe("buildWeekReport", () => {
  it("passes the contract when every payload has what the pipeline reads", () => {
    expect(report.contract.ok).toBe(true);
  });

  it("finds nothing swallowed in a week the scanner watched from kickoff", () => {
    expect(report.findings.coldStartSwallowed).toEqual([]);
  });

  it("lists every score the cold-start seed swallowed when the scanner joined late", () => {
    const summary = load("nfl-summary-401872932-det-at-buf.json");
    const probe = replayNFLGame(summary, []);
    const joinAtMs = probe.timeline.plays.find((p) => p.id === "401872932640")!.visibleAtMs + 1;
    const replay = replayNFLGame(summary, standardGameProfiles("DET", "BUF"), { joinAtMs });
    const late = buildWeekReport({
      season: 2026,
      seasonType: 2,
      week: 2,
      generatedAt: "2026-09-22T11:00:00Z",
      games: [{ replay, scheduledAt: "2026-09-18T00:15Z", contract: checkNFLSummaryContract(summary) }],
      scoreboardProblems: [],
    });
    expect(late.findings.coldStartSwallowed.map((s) => s.text)).toEqual([
      "Josh Allen 1 Yd Rush (Tyler Bass Kick)",
      "Joshua Palmer 43 Yd pass from Josh Allen (Tyler Bass Kick)",
    ]);
  });

  it("lists the walk-off that landed with the final", () => {
    expect(report.findings.landedWithFinal.map((s) => s.matchup)).toContain("IND at KC");
  });

  it("measures how late the halftime push lands (at the half since 2026-09-29)", () => {
    const late = report.findings.halftimeLateMin!;
    expect(late.min).toBeGreaterThanOrEqual(0);
    expect(late.max).toBeLessThanOrEqual(1);
    expect(late.max).toBeGreaterThanOrEqual(late.median);
  });

  it("summarizes a direct team follow per tier across both teams of every game", () => {
    const companion = report.teamFollow.find((r) => r.tier === "companion")!;
    expect(companion.games).toBe(8);
    expect(companion.maxPushes).toBeGreaterThanOrEqual(companion.medianPushes);
    const quiet = report.teamFollow.find((r) => r.tier === "quiet")!;
    expect(quiet.maxPushes).toBeLessThanOrEqual(3);
  });

  it("merges the whole-season follow across the week", () => {
    const quiet = report.seasonFollow.find((r) => r.tier === "quiet")!;
    // Threshold-only: one final per game.
    expect(quiet.pushes).toBe(4);
  });

  it("skips the three-team follower when no window has three games", () => {
    expect(report.threeTeam).toBeNull();
  });

  it("builds a three-team follower from three different games in the busiest window", () => {
    const sameWindow = games.slice(1).map((g) => ({ ...g, scheduledAt: "2026-09-20T17:00Z" }));
    const r = buildWeekReport({
      season: 2026,
      seasonType: 2,
      week: 2,
      generatedAt: "2026-09-22T11:00:00Z",
      games: [games[0], ...sameWindow],
      scoreboardProblems: [],
    });
    expect(r.threeTeam?.window).toBe("2026-09-20T17:00Z");
    const teams = r.threeTeam!.teams;
    expect(teams).toHaveLength(3);
    const gameOf = (code: string) =>
      sameWindow.find((g) => [g.replay.awayCode, g.replay.homeCode].includes(code))!.replay.gameId;
    expect(new Set(teams.map(gameOf)).size).toBe(3);
  });

  it("names the contract problem and the game it came from", () => {
    const broken = buildWeekReport({
      season: 2026,
      seasonType: 2,
      week: 2,
      generatedAt: "2026-09-22T11:00:00Z",
      games: [{ ...games[0], contract: { problems: ["drives.previous missing"], warnings: [] } }],
      scoreboardProblems: ["event 401 status.period missing"],
    });
    expect(broken.contract.ok).toBe(false);
    expect(broken.contract.problems).toEqual([
      "scoreboard: event 401 status.period missing",
      "DET at BUF (401872932): drives.previous missing",
    ]);
  });
});

describe("renderWeekReportMarkdown", () => {
  const md = renderWeekReportMarkdown(report);

  it("opens with the week and the checks the Tuesday shift reads first", () => {
    expect(md).toMatch(/^# NFL push replay: 2026 week 2/m);
    expect(md).toMatch(/Contract: PASS/);
    expect(md).toMatch(/Budget: (PASS|FAIL)/);
  });

  it("carries the findings with the play text", () => {
    expect(md).toContain("Harrison Butker 40 Yd Field Goal");
    expect(md).toMatch(/[Hh]alftime push/);
  });

  it("never uses an em dash", () => {
    expect(md).not.toContain("—");
  });
});
