import { describe, it, expect } from "vitest";
import {
  padIdx,
  slateStartIndex,
  matchupCodes,
  parseScoreLine,
  agateScore,
  upNextCountLabel,
  wrapCountLabel,
  upNextDayLabel,
  bandShownCount,
} from "./agate-slate";
import type { ScoreboardTile } from "./today-data";

describe("padIdx", () => {
  it("zero-pads to 2 digits", () => {
    expect(padIdx(1)).toBe("01");
    expect(padIdx(7)).toBe("07");
    expect(padIdx(12)).toBe("12");
  });
});

describe("slateStartIndex (index continuation)", () => {
  it("continues after the lead + band: lead 01, band 02-03 -> slate 04", () => {
    expect(slateStartIndex(true, 2)).toBe(4);
  });
  it("lead only, no band -> slate 02", () => {
    expect(slateStartIndex(true, 0)).toBe(2);
  });
  it("no lead, no band (quiet day) -> slate 01", () => {
    expect(slateStartIndex(false, 0)).toBe(1);
  });
  it("no lead but a band present -> after the band", () => {
    expect(slateStartIndex(false, 3)).toBe(4);
  });
});

describe("matchupCodes", () => {
  it("splits AWAY vs HOME", () => {
    expect(matchupCodes("BRA vs SCO")).toEqual({ away: "BRA", home: "SCO" });
  });
  it("is case-insensitive on the separator", () => {
    expect(matchupCodes("KOR VS RSA")).toEqual({ away: "KOR", home: "RSA" });
  });
  it("falls back to the whole string with no separator", () => {
    expect(matchupCodes("Solo")).toEqual({ away: "Solo", home: "" });
  });
});

describe("parseScoreLine", () => {
  it("parses an en-dash score line with spaces", () => {
    expect(parseScoreLine("2 – 0")).toEqual({ away: 2, home: 0 });
    expect(parseScoreLine("121 – 109")).toEqual({ away: 121, home: 109 });
  });
  it("parses a hyphen score line without spaces", () => {
    expect(parseScoreLine("3-1")).toEqual({ away: 3, home: 1 });
  });
  it("returns nulls on an unparseable line", () => {
    expect(parseScoreLine("TBD")).toEqual({ away: null, home: null });
  });
});

describe("agateScore", () => {
  it("joins with an en-dash", () => {
    expect(agateScore(2, 0)).toBe("2–0");
  });
  it("treats null as 0", () => {
    expect(agateScore(null, null)).toBe("0–0");
  });
});

describe("upNextCountLabel (sport-correct noun)", () => {
  it("all-soccer -> MATCH / MATCHES", () => {
    expect(upNextCountLabel([{ source: "wc" }])).toBe("1 MATCH");
    expect(upNextCountLabel([{ source: "wc" }, { source: "wc" }])).toBe("2 MATCHES");
  });
  it("all-NBA -> GAME / GAMES", () => {
    expect(upNextCountLabel([{ source: "nba" }])).toBe("1 GAME");
    expect(upNextCountLabel([{ source: "nba" }, { source: "nba" }])).toBe("2 GAMES");
  });
  it("mixed slate falls back to the generic GAMES", () => {
    expect(upNextCountLabel([{ source: "nba" }, { source: "wc" }])).toBe("2 GAMES");
  });
});

describe("wrapCountLabel", () => {
  it("uses the sport-neutral WRAPPED noun", () => {
    expect(wrapCountLabel(1)).toBe("1 WRAPPED");
    expect(wrapCountLabel(2)).toBe("2 WRAPPED");
  });
});

describe("upNextDayLabel (resting-day stamp)", () => {
  it("says Today for a same-day fixture", () => {
    expect(upNextDayLabel({ isToday: true, dayWord: "" })).toBe("Today");
  });
  it("capitalizes a day word for a future fixture", () => {
    expect(upNextDayLabel({ isToday: false, dayWord: "tomorrow" })).toBe(
      "Tomorrow"
    );
    expect(upNextDayLabel({ isToday: false, dayWord: "Saturday" })).toBe(
      "Saturday"
    );
  });
  it("falls back to Upcoming when no day word is known", () => {
    expect(upNextDayLabel({ isToday: false, dayWord: "" })).toBe("Upcoming");
    expect(upNextDayLabel({ isToday: false })).toBe("Upcoming");
  });
});

describe("bandShownCount (ALSO LIVE band row count)", () => {
  function tile(id: string): ScoreboardTile {
    return {
      id,
      status: "live",
      source: "nba",
      awayCode: "A",
      homeCode: "B",
      awayScore: null,
      homeScore: null,
      statusLine: "",
      stageLine: "",
      href: "/",
      lead: null,
    };
  }

  it("under cap: 3 live items → 3", () => {
    expect(bandShownCount([tile("g1"), tile("g2"), tile("g3")])).toBe(3);
  });

  it("at cap: 5 live items → 5", () => {
    const items = ["g1", "g2", "g3", "g4", "g5"].map(tile);
    expect(bandShownCount(items)).toBe(5);
  });

  it("over cap: 7 live items → 5", () => {
    const items = Array.from({ length: 7 }, (_, i) => tile(`g${i + 1}`));
    expect(bandShownCount(items)).toBe(5);
  });

  it("lead exclusion: 7 items incl. lead id → 5 after exclusion", () => {
    // 7 live items, g1 is the lead Monument. After excluding g1: 6 remain,
    // capped at 5 → 5 rows rendered.
    const items = Array.from({ length: 7 }, (_, i) => tile(`g${i + 1}`));
    expect(bandShownCount(items, "g1")).toBe(5);
  });
});
