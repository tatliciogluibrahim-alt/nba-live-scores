import { describe, it, expect } from "vitest";
import { scheduleLiveHref, mastheadLiveTarget, liveElsewhereLine, liveTargetFor } from "./live-links";
import type { ScoreboardTile } from "./today-data";

// Where Today's live links go (persona sweep, 2026-10-11). "1 LIVE →"
// opened an empty Watching, and "+2 MORE LIVE" opened Watching instead of
// the games it counted.

function tile(id: string, over: Partial<ScoreboardTile> = {}): ScoreboardTile {
  return {
    id,
    source: "nfl",
    awayCode: "CHI",
    homeCode: "GB",
    awayScore: 7,
    homeScore: 14,
    status: "live",
    statusLine: "Q3 13:25",
    stageLine: "NFL · Week 5",
    href: `/game/${id}?from=today`,
    lead: "home",
    ...over,
  };
}

describe("scheduleLiveHref", () => {
  it("one sport opens that competition on Schedule", () => {
    expect(scheduleLiveHref(["nfl", "nfl"])).toBe(
      "/schedule?scope=all&competition=nfl-season-2026"
    );
  });

  it("a mixed slate opens Schedule across all sports", () => {
    expect(scheduleLiveHref(["nfl", "nba"])).toBe("/schedule?scope=all");
  });

  it("nothing to point at still lands on Schedule", () => {
    expect(scheduleLiveHref([])).toBe("/schedule?scope=all");
  });
});

describe("mastheadLiveTarget", () => {
  it("is nothing when nothing is live", () => {
    expect(mastheadLiveTarget([])).toBeNull();
    expect(mastheadLiveTarget([tile("a", { status: "upcoming" })])).toBeNull();
  });

  it("one live game opens that game", () => {
    expect(mastheadLiveTarget([tile("401872990")])).toEqual({
      href: "/game/401872990?from=today",
      label: "Open CHI at GB",
    });
  });

  it("several live games open Schedule, not an empty Watching", () => {
    const t = mastheadLiveTarget([tile("a"), tile("b")]);
    expect(t?.href).toBe("/schedule?scope=all&competition=nfl-season-2026");
    expect(t?.label).toBe("Open Schedule");
  });

  it("Watching only when every live game is tracked there", () => {
    expect(
      mastheadLiveTarget([tile("a", { tracked: true }), tile("b", { tracked: true })])
    ).toEqual({ href: "/watching", label: "Open Watching" });
    // One untracked game: Watching would not hold it, so Schedule.
    expect(
      mastheadLiveTarget([tile("a", { tracked: true }), tile("b")])?.href
    ).toBe("/schedule?scope=all&competition=nfl-season-2026");
  });
});

describe("liveElsewhereLine (no follows, games live)", () => {
  it("is nothing when nothing is live (the calm state stays)", () => {
    expect(liveElsewhereLine(undefined)).toBeNull();
    expect(liveElsewhereLine({ nba: 0, wc: 0, nfl: 0 })).toBeNull();
  });

  it("counts one sport with its own noun", () => {
    expect(liveElsewhereLine({ nba: 0, wc: 0, nfl: 8 })).toEqual({
      text: "8 NFL games are live.",
      href: "/schedule?scope=all&competition=nfl-season-2026",
    });
    expect(liveElsewhereLine({ nba: 0, wc: 0, nfl: 1 })?.text).toBe("1 NFL game is live.");
    expect(liveElsewhereLine({ nba: 2, wc: 0, nfl: 0 })?.text).toBe("2 NBA games are live.");
    expect(liveElsewhereLine({ nba: 0, wc: 1, nfl: 0 })?.text).toBe(
      "1 Summer Soccer match is live."
    );
    expect(liveElsewhereLine({ nba: 0, wc: 3, nfl: 0 })?.text).toBe(
      "3 Summer Soccer matches are live."
    );
  });

  it("a mixed slate gives one total and Schedule across sports", () => {
    expect(liveElsewhereLine({ nba: 2, wc: 0, nfl: 8 })).toEqual({
      text: "10 games are live.",
      href: "/schedule?scope=all",
    });
  });
});

describe("liveTargetFor (Today's masthead and Following's live links)", () => {
  const ref = (id: string, tracked = false) => ({
    href: `/game/${id}`,
    awayCode: "PIT",
    homeCode: "CLE",
    tracked,
    source: "nfl" as const,
  });

  it("opens the one live game", () => {
    expect(liveTargetFor([ref("1")])).toEqual({ href: "/game/1", label: "Open PIT at CLE" });
  });

  it("opens Watching only when every live game is tracked", () => {
    expect(liveTargetFor([ref("1", true), ref("2", true)])?.href).toBe("/watching");
    expect(liveTargetFor([ref("1", true), ref("2")])?.href).toBe(
      "/schedule?scope=all&competition=nfl-season-2026"
    );
  });

  it("is null with nothing live", () => {
    expect(liveTargetFor([])).toBeNull();
  });
});
