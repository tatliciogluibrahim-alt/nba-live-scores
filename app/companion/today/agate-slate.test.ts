import { describe, it, expect } from "vitest";
import {
  padIdx,
  slateStartIndex,
  matchupCodes,
  parseScoreLine,
  agateScore,
  upNextCountLabel,
  wrapCountLabel,
} from "./agate-slate";

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
