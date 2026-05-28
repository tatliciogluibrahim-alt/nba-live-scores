import { describe, it, expect } from "vitest";
import {
  buildSeriesKey,
  isPlaceholderAbbr,
  hasSeriesContext,
  buildWinnerOverrides,
  type SeriesKeyGame,
} from "./series-keys";

// Failsafe coverage for the shared series-key helpers extracted from
// TournamentClient / SeriesPicker / TeamClient / use-wrapped-series.
// These are the pure functions a future refactor is most likely to
// regress silently, so they get explicit invariants.

function game(partial: Partial<SeriesKeyGame> & {
  away: { abbreviation: string };
  home: { abbreviation: string };
}): SeriesKeyGame {
  return partial;
}

describe("buildSeriesKey", () => {
  it("alphabetizes the two abbreviations so order doesn't matter", () => {
    expect(buildSeriesKey("NYK", "CLE")).toBe("CLE-NYK");
    expect(buildSeriesKey("CLE", "NYK")).toBe("CLE-NYK");
  });

  it("is stable (same inputs → same key) for keying a Map", () => {
    expect(buildSeriesKey("OKC", "SA")).toBe(buildSeriesKey("SA", "OKC"));
  });
});

describe("isPlaceholderAbbr", () => {
  it("treats empty, TBD, and compound (slash) codes as placeholders", () => {
    expect(isPlaceholderAbbr("")).toBe(true);
    expect(isPlaceholderAbbr("TBD")).toBe(true);
    expect(isPlaceholderAbbr("OKC/MIN")).toBe(true);
  });

  it("treats a real abbreviation as not a placeholder", () => {
    expect(isPlaceholderAbbr("NYK")).toBe(false);
    expect(isPlaceholderAbbr("SA")).toBe(false);
  });
});

describe("hasSeriesContext", () => {
  it("requires both team abbreviations", () => {
    expect(
      hasSeriesContext(game({ away: { abbreviation: "" }, home: { abbreviation: "NYK" }, seriesRound: "NBA Finals" }))
    ).toBe(false);
  });

  it("is true when any series-context field is present", () => {
    expect(
      hasSeriesContext(game({ away: { abbreviation: "NYK" }, home: { abbreviation: "CLE" }, seriesRound: "Second Round" }))
    ).toBe(true);
    expect(
      hasSeriesContext(game({ away: { abbreviation: "NYK" }, home: { abbreviation: "CLE" }, gameContext: "Game 7" }))
    ).toBe(true);
  });

  it("is false for a plain non-playoff game", () => {
    expect(
      hasSeriesContext(game({ away: { abbreviation: "NYK" }, home: { abbreviation: "CLE" }, gameContext: "Regular Season" }))
    ).toBe(false);
  });

  it("is placeholder-AGNOSTIC — callers layer their own policy", () => {
    // This is the contract that lets the tournament page show a
    // projected "NYK vs TBD" Finals row while the picker rejects it.
    expect(
      hasSeriesContext(game({ away: { abbreviation: "NYK" }, home: { abbreviation: "TBD" }, seriesRound: "NBA Finals" }))
    ).toBe(true);
  });
});

describe("buildWinnerOverrides", () => {
  it("maps the loser abbreviation to the winner from a wrapped series", () => {
    const games: SeriesKeyGame[] = [
      game({
        away: { abbreviation: "NYK" },
        home: { abbreviation: "IND" },
        seriesSummary: "IND WINS SERIES 4-2",
      }),
    ];
    const overrides = buildWinnerOverrides(games);
    expect(overrides.get("NYK")).toBe("IND");
    expect(overrides.has("IND")).toBe(false);
  });

  it("ignores non-clinch summaries", () => {
    const games: SeriesKeyGame[] = [
      game({
        away: { abbreviation: "OKC" },
        home: { abbreviation: "SA" },
        seriesSummary: "OKC LEADS SERIES 3-2",
      }),
    ];
    expect(buildWinnerOverrides(games).size).toBe(0);
  });

  it("does not record a placeholder loser", () => {
    const games: SeriesKeyGame[] = [
      game({
        away: { abbreviation: "OKC" },
        home: { abbreviation: "OKC/MIN" },
        seriesSummary: "OKC WINS SERIES 4-0",
      }),
    ];
    expect(buildWinnerOverrides(games).size).toBe(0);
  });
});
