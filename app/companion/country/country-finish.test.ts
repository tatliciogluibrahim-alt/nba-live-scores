import { describe, it, expect } from "vitest";
import { knockoutFinishLine } from "./country-finish";
import { wcRecord2026 } from "../../lib/wc-record-2026";
import { WC_COUNTRIES } from "../following/data/countries";
import type { WCScheduleFixtureLite } from "./country-data";

// The country page's Path line after the knockouts. It only knew the group
// stage, so with the record restored Spain's page read "Spain are through
// to the Round of 32" (2026-10-11). These run on the real frozen record.

const fixtures = wcRecord2026().fixtures as WCScheduleFixtureLite[];
const nameOf = (code: string) => WC_COUNTRIES.find((c) => c.id === code)?.name;
const line = (code: string) => knockoutFinishLine(code, nameOf(code) ?? code, fixtures, nameOf);

describe("knockoutFinishLine on the 2026 record", () => {
  it("names the champion and the final", () => {
    expect(line("ESP")).toBe(
      "Spain won Summer Soccer 2026, beating Argentina 1-0 in the final after extra time."
    );
    expect(line("ARG")).toBe("Argentina reached the final and lost 1-0 to Spain after extra time.");
  });

  it("names third and fourth place", () => {
    expect(line("ENG")).toBe("England finished third, beating France 6-4 in the third-place match.");
    expect(line("FRA")).toBe("France finished fourth, losing 6-4 to England in the third-place match.");
  });

  it("names the round a team went out in", () => {
    expect(line("POR")).toBe("Portugal went out in the Round of 16, losing 1-0 to Spain.");
    expect(line("SUI")).toBe(
      "Switzerland went out in the quarterfinals, losing 3-1 to Argentina after extra time."
    );
  });

  it("says penalties instead of a level score", () => {
    expect(line("GER")).toBe("Germany went out in the Round of 32, losing to Paraguay on penalties.");
  });

  it("leaves group-stage exits to the group line", () => {
    const groupOnly = WC_COUNTRIES.find(
      (c) =>
        !fixtures.some(
          (f) =>
            !f.stage.startsWith("Group") &&
            (f.home.abbreviation === c.id || f.away.abbreviation === c.id)
        )
    );
    expect(groupOnly).toBeDefined();
    expect(line(groupOnly!.id)).toBeNull();
  });
});

describe("knockoutFinishLine mid-tournament", () => {
  const r16 = (status: WCScheduleFixtureLite["status"], esp: number, por: number) =>
    ({
      id: "x",
      date: "2026-07-05T19:00Z",
      status,
      statusText: status === "final" ? "FT" : "Upcoming",
      stage: "round-of-16",
      group: "",
      home: { name: "Portugal", abbreviation: "POR", score: por },
      away: { name: "Spain", abbreviation: "ESP", score: esp },
      broadcasts: [],
    }) as WCScheduleFixtureLite;

  it("says nothing while a team's next match is still to come", () => {
    expect(knockoutFinishLine("ESP", "Spain", [r16("upcoming", 0, 0)], nameOf)).toBeNull();
    expect(knockoutFinishLine("ESP", "Spain", [r16("live", 1, 0)], nameOf)).toBeNull();
  });

  it("says nothing for a team still in it", () => {
    expect(knockoutFinishLine("ESP", "Spain", [r16("final", 1, 0)], nameOf)).toBeNull();
  });

  it("works out the loser from the score when no winner flag is set", () => {
    expect(knockoutFinishLine("POR", "Portugal", [r16("final", 1, 0)], nameOf)).toBe(
      "Portugal went out in the Round of 16, losing 1-0 to Spain."
    );
  });
});
