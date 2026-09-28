import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { replayNFLGame, notificationStack } from "./replay-nfl";
import { teamProfile, seasonProfile, standardGameProfiles } from "./profiles";
import type { ReplaySummary } from "./nfl-summary";

const FIXTURES = join(__dirname, "__fixtures__");
const fixture = (name: string): ReplaySummary =>
  JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));

// DET at BUF, Thursday 2026-09-17, final 31-41. Measured from ESPN's
// play-by-play: 11 scoring plays (BUF 6 TDs; DET 4 TDs + 1 FG), no
// turnovers, no non-scoring 40+ yard plays. BUF scored first.
const DET_AT_BUF = fixture("nfl-summary-401872932-det-at-buf.json");
const OPENING_TD = "401872932317"; // Josh Allen 1 Yd Rush

describe("replayNFLGame: game-state events", () => {
  const r = replayNFLGame(DET_AT_BUF, []);
  const types = r.events.map((e) => e.event.type);

  it("fires each game-state event exactly once, in order", () => {
    const state = types.filter((t) =>
      ["nfl-kickoff", "nfl-eoq-1", "nfl-halftime", "nfl-eoq-3", "nfl-ot", "nfl-final"].includes(t)
    );
    expect(state).toEqual(["nfl-kickoff", "nfl-eoq-1", "nfl-halftime", "nfl-eoq-3", "nfl-final"]);
  });

  it("ends on the real final score", () => {
    const final = r.events.find((e) => e.event.type === "nfl-final")!.event;
    expect([final.awayScore, final.homeScore]).toEqual([31, 41]);
  });

  it("lands the halftime push when the second half kicks off, 15 minutes after the half ended", () => {
    const endHalf = r.timeline.plays.find((p) => p.type?.text === "End of Half")!;
    const halftime = r.events.find((e) => e.event.type === "nfl-halftime")!;
    const lateMin = (halftime.atMs - endHalf.visibleAtMs) / 60_000;
    expect(lateMin).toBeGreaterThan(15);
    expect(lateMin).toBeLessThan(17);
  });
});

describe("replayNFLGame: play accounting", () => {
  const r = replayNFLGame(DET_AT_BUF, []);

  it("accounts for every scoring play", () => {
    const scoring = r.accounting.filter((a) => a.kind === "scoring");
    expect(scoring).toHaveLength(11);
  });

  it("pushes the opening touchdown of a game watched since before kickoff", () => {
    // Until 2026-09-28 the cold-start seed swallowed it (30 of 47 games).
    const opening = r.accounting.find((a) => a.playId === OPENING_TD)!;
    expect(opening.outcome).toBe("detected");
    const pushed = r.accounting.filter((a) => a.outcome === "detected");
    expect(pushed).toHaveLength(11);
  });

  it("seeds the backlog silently when the scanner joins mid-game", () => {
    const secondTd = r.timeline.plays.find((p) => p.id === "401872932640")!;
    const joined = replayNFLGame(DET_AT_BUF, [], { joinAtMs: secondTd.visibleAtMs + 1 });
    const seeded = joined.accounting
      .filter((a) => a.outcome === "suppressed-cold-start")
      .map((a) => a.playId);
    expect(seeded).toEqual([OPENING_TD, "401872932640"]);
    expect(joined.accounting.filter((a) => a.outcome === "detected")).toHaveLength(9);
    // No kickoff for a game first seen already live.
    expect(joined.events.some((e) => e.event.type === "nfl-kickoff")).toBe(false);
  });
});

describe("replayNFLGame: a walk-off in overtime (IND at KC, 2026-09-20)", () => {
  const r = replayNFLGame(fixture("nfl-summary-401872945-ind-at-kc-ot.json"), [
    teamProfile("KC", "all", { platform: "ios" }),
  ]);

  it("fires overtime and the final", () => {
    const types = r.events.map((e) => e.event.type);
    expect(types).toContain("nfl-ot");
    const final = r.events.find((e) => e.event.type === "nfl-final")!.event;
    expect([final.awayScore, final.homeScore]).toEqual([30, 33]);
  });

  it("labels the game-winning kick as landing with the final, not as missed", () => {
    const walkOff = r.accounting.find((a) => /Butker 40 Yd Field Goal/.test(a.text ?? ""));
    expect(walkOff?.outcome).toBe("landed-with-final");
    expect(r.accounting.some((a) => a.outcome === "never-visible")).toBe(false);
  });
});

describe("replayNFLGame: deliveries per profile", () => {
  const profiles = [
    teamProfile("BUF", "quiet", { platform: "ios" }),
    teamProfile("BUF", "companion", { platform: "web" }),
    teamProfile("DET", "companion", { platform: "web" }),
    teamProfile("DET", "all", { platform: "ios" }),
    teamProfile("DET", "all", { platform: "ios", noSpoilers: true }),
    seasonProfile("quiet", { platform: "ios" }),
    seasonProfile("companion", { platform: "ios" }),
  ];
  const r = replayNFLGame(DET_AT_BUF, profiles);
  const got = (id: string) => r.deliveries[id];

  it("Quiet team follow on iPhone: the lock-screen offer at kickoff, then the final", () => {
    const d = got("BUF.quiet.ios");
    expect(d.map((x) => x.title)).toEqual(["DET at BUF", "Final"]);
    expect(d[0]).toMatchObject({ offer: true, body: "Track this game on your Lock Screen." });
    expect(d[1].body).toBe("DET 31 – 41 BUF");
  });

  it("Companion team follow: the beats plus own-team touchdowns only", () => {
    const buf = got("BUF.companion.web");
    // 5 game-state beats + BUF's 6 TDs.
    expect(buf).toHaveLength(11);
    expect(buf.filter((x) => x.title === "Touchdown")).toHaveLength(6);
    const det = got("DET.companion.web");
    expect(det.filter((x) => x.title === "Touchdown")).toHaveLength(4);
    expect(det.some((x) => x.title === "Field goal")).toBe(false);
  });

  it("Full Details team follow gets every detected moment", () => {
    expect(got("DET.all.ios")).toHaveLength(16);
  });

  it("No-Spoilers never puts a score or a player name in a delivery", () => {
    const d = got("DET.all.ios.ns");
    expect(d).toHaveLength(16);
    for (const x of d) {
      // Quarter labels ("End of Q1") are fine. A scoreline never is.
      expect(`${x.title} ${x.subtitle ?? ""}`).not.toMatch(/\d+\s*[–-]\s*\d+/);
      expect(x.body).not.toMatch(/\d/);
      expect(x.body).not.toMatch(/Allen|Goff|Gibbs|St\. Brown|LaPorta|Bates/);
    }
  });

  it("whole-season follows are threshold-only: Quiet gets the final, Companion adds kickoff", () => {
    expect(got("season.quiet.ios").map((x) => x.eventType)).toEqual(["nfl-final"]);
    expect(got("season.companion.ios").map((x) => x.eventType)).toEqual([
      "nfl-kickoff",
      "nfl-final",
    ]);
  });

  it("never delivers the same dedupe slot twice to one profile", () => {
    for (const id of Object.keys(r.deliveries)) {
      const tags = r.deliveries[id].map((x) => x.dedupeTag);
      expect(new Set(tags).size, id).toBe(tags.length);
    }
  });
});

describe("notificationStack", () => {
  it("collapses a Full Details game to one state card and one play card", () => {
    const r = replayNFLGame(DET_AT_BUF, [teamProfile("DET", "all", { platform: "ios" })]);
    const stack = notificationStack(r.deliveries["DET.all.ios"]);
    expect(stack.map((x) => x.tag)).toEqual([
      "401872932:nfl-state",
      "401872932:nfl-play",
    ]);
    expect(stack[0].title).toBe("Final");
  });
});

describe("standardGameProfiles", () => {
  it("covers both teams and the season follow across every tier and both platforms", () => {
    const ids = standardGameProfiles("DET", "BUF").map((p) => p.id);
    for (const team of ["DET", "BUF", "season"]) {
      for (const tier of ["quiet", "companion", "all"]) {
        expect(ids).toContain(`${team}.${tier}.ios`);
        expect(ids).toContain(`${team}.${tier}.web`);
      }
    }
    expect(ids).toContain("DET.all.ios.ns");
  });
});
