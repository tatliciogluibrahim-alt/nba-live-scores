import { describe, expect, it } from "vitest";
import { parseScheduleRoute, scheduleHref } from "./schedule-route";

describe("Schedule route state", () => {
  it("parses only supported query values", () => {
    expect(
      parseScheduleRoute({
        scope: "all",
        competition: "fifa-world-cup-2026",
        view: "bracket",
      })
    ).toEqual({
      scope: "all",
      competition: "fifa-world-cup-2026",
      view: "bracket",
    });

    expect(
      parseScheduleRoute({ scope: ["all"], competition: "", view: "table" })
    ).toEqual({ scope: "following", competition: null, view: null });
  });

  it("keeps valid competition and view context when scope changes", () => {
    expect(
      scheduleHref(
        {
          scope: "following",
          competition: "nfl-season-2026",
          view: "groups",
        },
        { scope: "all" }
      )
    ).toBe(
      "/schedule?scope=all&competition=nfl-season-2026&view=groups"
    );
  });

  it("uses the clean URL for the default state", () => {
    expect(
      scheduleHref(
        { scope: "all", competition: null, view: "bracket" },
        { scope: "following", view: "byday" }
      )
    ).toBe("/schedule");
  });
});
