import { describe, it, expect } from "vitest";
import { groupByWindow, nflWindowLabel } from "./nfl-windows";

// Real week-1 2026 kickoffs (ESPN feed, UTC) — the windows are ET-defined,
// so these lock the timezone conversion too.

describe("nflWindowLabel (ET windows, doctrine names)", () => {
  it("the Sep 9 opener is a Wednesday night: honest label, not a forced bucket", () => {
    // 2026-09-10T00:20Z = Wed Sep 9, 8:20 PM ET.
    expect(nflWindowLabel("2026-09-10T00:20Z")).toBe("WED · 8:20 PM");
  });
  it("Sunday early window", () => {
    // 2026-09-13T17:00Z = Sun 1:00 PM ET.
    expect(nflWindowLabel("2026-09-13T17:00Z")).toBe("SUN · 1 PM");
  });
  it("Sunday late-afternoon window (both 4:05 and 4:25 starts)", () => {
    expect(nflWindowLabel("2026-09-13T20:05Z")).toBe("SUN · 4 PM");
    expect(nflWindowLabel("2026-09-13T20:25Z")).toBe("SUN · 4 PM");
  });
  it("Sunday night", () => {
    expect(nflWindowLabel("2026-09-14T00:20Z")).toBe("SUN · NIGHT");
  });
  it("Monday night", () => {
    expect(nflWindowLabel("2026-09-15T00:15Z")).toBe("MON · NIGHT");
  });
  it("Thursday night", () => {
    expect(nflWindowLabel("2026-09-18T00:15Z")).toBe("THU · NIGHT");
  });
  it("London morning game gets the honest time, not a bucket", () => {
    // 9:30 AM ET Sunday.
    expect(nflWindowLabel("2026-09-13T13:30Z")).toBe("SUN · 9:30 AM");
  });
  it("unparseable date stays calm", () => {
    expect(nflWindowLabel("not-a-date")).toBe("SCHEDULED");
  });
});

describe("groupByWindow", () => {
  it("groups a sorted slate into ordered window sections", () => {
    const week = [
      { id: "a", date: "2026-09-11T00:15Z" }, // Thu night
      { id: "b", date: "2026-09-13T17:00Z" }, // Sun 1 PM
      { id: "c", date: "2026-09-13T17:00Z" }, // Sun 1 PM
      { id: "d", date: "2026-09-13T20:25Z" }, // Sun 4 PM
      { id: "e", date: "2026-09-14T00:20Z" }, // SNF
      { id: "f", date: "2026-09-15T00:15Z" }, // MNF
    ];
    const groups = groupByWindow(week);
    expect(groups.map((g) => g.label)).toEqual([
      "THU · NIGHT",
      "SUN · 1 PM",
      "SUN · 4 PM",
      "SUN · NIGHT",
      "MON · NIGHT",
    ]);
    expect(groups[1].games.map((g) => g.id)).toEqual(["b", "c"]);
  });
});
