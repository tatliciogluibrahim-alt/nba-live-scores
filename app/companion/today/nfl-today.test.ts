import { describe, it, expect } from "vitest";
import { buildTodayPayload, deriveTodayHeadline } from "./today-data";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import type { NBAGame } from "./today-data";
import type { Follow } from "../state/types";

function nflGame(over: Partial<NFLGameLite> = {}): NFLGameLite {
  return {
    id: "nfl1",
    // 60s out: still upcoming and on the slate, but never crosses local
    // midnight the way "+2h" did — CI's first-ever run (22:01 UTC) caught
    // the "today." assertion reading "tomorrow." on the runner.
    date: new Date(Date.now() + 60 * 1000).toISOString(),
    status: "upcoming",
    statusText: "Upcoming",
    week: 1,
    seasonType: 2,
    period: 0,
    home: { name: "Kansas City Chiefs", abbreviation: "KC", score: 0 },
    away: { name: "Los Angeles Chargers", abbreviation: "LAC", score: 0 },
    broadcasts: ["CBS"],
    ...over,
  };
}

function nflTeamFollow(scopeId: string): Follow {
  return {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId,
    kind: "team",
    id: scopeId,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  };
}

function nbaTeamFollow(scopeId: string): Follow {
  return {
    momentId: "nba-playoffs-2025",
    scope: "team",
    scopeId,
    kind: "team",
    id: scopeId,
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1,
  };
}

const base = { nba: [] as NBAGame[], nbaRecent: [] as NBAGame[], wc: [], pinned: [] };

describe("Today reads NFL games for followed NFL teams", () => {
  it("surfaces a followed NFL team's upcoming game in Up Next", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()],
      follows: [nflTeamFollow("KC")],
    });
    const nflItems = p.upNext.filter((i) => i.source === "nfl");
    expect(nflItems).toHaveLength(1);
    expect(nflItems[0].headline).toBe("LAC at KC");
    expect(nflItems[0].personal).toBe(true);
  });

  it("collision guard: an NBA 'LAC' follow does NOT match an NFL LAC game", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()], // LAC (Chargers) at KC
      follows: [nbaTeamFollow("LAC")], // NBA Clippers
    });
    expect(p.upNext.filter((i) => i.source === "nfl")).toHaveLength(0);
  });

  it("an NFL 'LAC' follow DOES match its NFL game", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()],
      follows: [nflTeamFollow("LAC")],
    });
    expect(p.upNext.filter((i) => i.source === "nfl")).toHaveLength(1);
  });

  it("no NFL follow → no NFL games surface (follows-first)", () => {
    const p = buildTodayPayload({ ...base, nfl: [nflGame()], follows: [] });
    expect(p.upNext.filter((i) => i.source === "nfl")).toHaveLength(0);
  });

  it("labels a preseason game honestly (never a bare 'Week 2')", () => {
    // ESPN numbers preseason weeks 1..4 in its own season type. Reading that
    // as "Week 2" implies a game that counts.
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame({ seasonType: 1, week: 2 })],
      follows: [nflTeamFollow("KC")],
    });
    expect(p.upNext[0].detail).toContain("Preseason · Wk 2");
    expect(p.upNext[0].detail).not.toMatch(/\bWeek 2\b/);
  });

  it("gives an NFL up-next item the raw facts the Monument needs", () => {
    // Without `game`, the NFL lead silently fell back to the legacy render.
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame()],
      follows: [nflTeamFollow("KC")],
    });
    expect(p.upNext[0].game?.source).toBe("nfl");
    expect(p.upNext[0].game?.homeCode).toBe("KC");
  });

  it("youFollow keeps a same-code NFL + NBA follow as two distinct, sport-tagged items", () => {
    // The bug this locks: an NFL "CLE" (Browns) and an NBA "CLE" (Cavaliers)
    // share kind+id, so a kind-id React key collided (rows dropped / expand
    // state shared). Each youFollow item now carries its sport.
    const p = buildTodayPayload({
      ...base,
      nfl: [],
      follows: [nflTeamFollow("CLE"), nbaTeamFollow("CLE")],
    });
    const cle = p.youFollow.filter((i) => i.kind === "team" && i.id === "CLE");
    expect(cle).toHaveLength(2);
    expect(new Set(cle.map((i) => i.sport))).toEqual(new Set(["nfl", "nba"]));
    // The composite key (sport-kind-id) the UI uses must be unique.
    const keys = cle.map((i) => `${i.sport}-${i.kind}-${i.id}`);
    expect(new Set(keys).size).toBe(2);
  });
});

describe("Today renders LIVE NFL games (the Sep-9 render branches)", () => {
  const liveGame = (over: Partial<NFLGameLite> = {}) =>
    nflGame({
      status: "live",
      statusText: "Q4 2:11",
      period: 4,
      date: new Date().toISOString(),
      home: { name: "Kansas City Chiefs", abbreviation: "KC", score: 20 },
      away: { name: "Los Angeles Chargers", abbreviation: "LAC", score: 17 },
      ...over,
    });

  it("a followed team's live game becomes the hero", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [liveGame()],
      follows: [nflTeamFollow("KC")],
    });
    expect(p.hero?.kind).toBe("nfl-live");
    expect(p.hero?.accent).toBe("var(--nfl)");
    expect(p.hero?.live).toBe(true);
    // Nickname, not the code — the headline says "Chiefs are live."
    expect(p.hero?.subject).toBe("Chiefs");
    // Q4, 3 points apart — one possession.
    expect(p.hero?.headline).toBe("One-score game.");
    expect(p.hero?.game?.source).toBe("nfl");
  });

  it("collision guard: an NBA 'LAC' follow never picks up the NFL hero", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [liveGame()],
      follows: [nbaTeamFollow("LAC")],
    });
    expect(p.hero).toBeNull();
    expect(p.scoreboard).toHaveLength(0);
  });

  it("a live followed game lands on the scoreboard with its week label", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [liveGame({ seasonType: 1, week: 3 })],
      follows: [nflTeamFollow("LAC")],
    });
    expect(p.scoreboard).toHaveLength(1);
    expect(p.scoreboard[0].source).toBe("nfl");
    expect(p.scoreboard[0].stageLine).toBe("NFL · Preseason · Wk 3");
    expect(p.scoreboard[0].lead).toBe("home");
  });

  it("an unfollowed live game never fills the screen", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [liveGame()],
      follows: [nflTeamFollow("BUF")],
    });
    expect(p.hero).toBeNull();
    expect(p.scoreboard).toHaveLength(0);
  });

  it("counts followed live games across sports for the personal headline", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [
        liveGame(),
        liveGame({
          id: "nfl2",
          home: { name: "Buffalo Bills", abbreviation: "BUF", score: 7 },
          away: { name: "New York Jets", abbreviation: "NYJ", score: 3 },
        }),
      ],
      follows: [nflTeamFollow("KC"), nflTeamFollow("BUF")],
    });
    expect(p.hero?.followedLiveCount).toBe(2);
    expect(deriveTodayHeadline(p).headline).toBe("Two of yours are live.");
  });

  it("the live headline names the followed team", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [liveGame()],
      follows: [nflTeamFollow("KC")],
    });
    const h = deriveTodayHeadline(p);
    expect(h.headline).toBe("Chiefs are live.");
    expect(h.eyebrow.tone).toBe("nfl");
    expect(h.deck?.accent).toBe("var(--nfl)");
  });

  it("an upcoming NFL lead reads in football's register", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [nflGame({ date: new Date(Date.now() + 60_000).toISOString() })],
      follows: [nflTeamFollow("KC")],
    });
    const h = deriveTodayHeadline(p);
    // Nicknames, "at" not "vs", and "today" not "tonight" (Sunday 1:00 PM
    // kickoffs are not evening events).
    expect(h.headline).toBe("Chargers at Chiefs today.");
  });

  it("a followed NFL final wraps with football's connector", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [
        nflGame({
          status: "final",
          statusText: "Final",
          seasonType: 1,
          week: 2,
          date: new Date(Date.now() - 3 * 3600_000).toISOString(),
          home: { name: "Kansas City Chiefs", abbreviation: "KC", score: 12 },
          away: { name: "Los Angeles Chargers", abbreviation: "LAC", score: 20 },
        }),
      ],
      follows: [nflTeamFollow("KC")],
    });
    expect(p.quietWrap).toHaveLength(1);
    expect(p.quietWrap[0].source).toBe("nfl");
    expect(p.quietWrap[0].matchup).toBe("LAC at KC");
    expect(p.quietWrap[0].scoreLine).toBe("20 – 12");
    expect(p.quietWrap[0].eyebrow).toContain("Preseason · Wk 2");
    // Today's slate is done: no live, no upcoming, one personal final.
    expect(p.recapFinals).toEqual([
      { source: "nfl", id: "nfl1", awayCode: "LAC", homeCode: "KC" },
    ]);
    expect(p.slateComplete).toBe(true);
    expect(p.finalsCount).toBe(1);
  });

  it("a followed team's chip carries its real game state", () => {
    const p = buildTodayPayload({
      ...base,
      nfl: [liveGame()],
      follows: [nflTeamFollow("KC")],
    });
    const chip = p.youFollow.find((i) => i.sport === "nfl");
    expect(chip?.statusLabel).toBe("Live");
    expect(chip?.tone).toBe("live");
    expect(chip?.href).toContain("/game/nfl1");
  });

  it("falls back to the NFL schedule when the team has no game this week", () => {
    const p = buildTodayPayload({ ...base, nfl: [], follows: [nflTeamFollow("KC")] });
    const chip = p.youFollow.find((i) => i.sport === "nfl");
    expect(chip?.statusLabel).toBe("NFL");
    expect(chip?.href).toContain("competition=nfl-season-2026");
  });
});
