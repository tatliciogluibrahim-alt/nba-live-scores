import { describe, it, expect } from "vitest";
import { groupByWindow, nflWindowKey, nflWindowLabel } from "./nfl-windows";

// Real 2026 kickoffs (ESPN feed, UTC). The league defines its windows in ET,
// so ET decides which games share a window. The HEADER is written in the
// viewer's zone, because the rows under it print kickoff times in the
// viewer's zone (persona sweep 2026-10-11: a Central user saw "SUN · 4 PM"
// over "DEN at LAC 3:05 PM"). Every zone is passed explicitly so these run
// the same on any machine.

const NY = "America/New_York";
const CHI = "America/Chicago";
const LA = "America/Los_Angeles";

const OPENER = "2026-09-10T00:20Z"; // Wed Sep 9, 8:20 PM ET
const SUN_1PM = "2026-09-13T17:00Z";
const SUN_405 = "2026-09-13T20:05Z";
const SUN_425 = "2026-09-13T20:25Z";
const SNF = "2026-09-14T00:20Z"; // Sun 8:20 PM ET
const MNF = "2026-09-15T00:15Z"; // Mon 8:15 PM ET
const TNF = "2026-09-18T00:15Z"; // Thu 8:15 PM ET
const LONDON = "2026-09-13T13:30Z"; // Sun 9:30 AM ET

describe("nflWindowLabel in New York (the league's own clock)", () => {
  it("the Sep 9 opener is a Wednesday night: honest label, not a forced bucket", () => {
    expect(nflWindowLabel(OPENER, NY)).toBe("WED · 8:20 PM");
  });
  it("Sunday early window", () => {
    expect(nflWindowLabel(SUN_1PM, NY)).toBe("SUN · 1 PM");
  });
  it("Sunday late-afternoon window (both 4:05 and 4:25 starts)", () => {
    expect(nflWindowLabel(SUN_405, NY)).toBe("SUN · 4 PM");
    expect(nflWindowLabel(SUN_425, NY)).toBe("SUN · 4 PM");
  });
  it("Sunday night", () => {
    expect(nflWindowLabel(SNF, NY)).toBe("SUN · NIGHT");
  });
  it("Monday night", () => {
    expect(nflWindowLabel(MNF, NY)).toBe("MON · NIGHT");
  });
  it("Thursday night", () => {
    expect(nflWindowLabel(TNF, NY)).toBe("THU · NIGHT");
  });
  it("London morning game gets the honest time, not a bucket", () => {
    expect(nflWindowLabel(LONDON, NY)).toBe("SUN · 9:30 AM");
  });
  it("unparseable date stays calm", () => {
    expect(nflWindowLabel("not-a-date", NY)).toBe("SCHEDULED");
  });
});

describe("nflWindowLabel in Chicago", () => {
  it("the early window reads noon, the hour its kickoffs print", () => {
    expect(nflWindowLabel(SUN_1PM, CHI)).toBe("SUN · 12 PM");
  });
  it("the late window reads 3 PM over 3:05 and 3:25 kickoffs", () => {
    expect(nflWindowLabel(SUN_405, CHI)).toBe("SUN · 3 PM");
    expect(nflWindowLabel(SUN_425, CHI)).toBe("SUN · 3 PM");
  });
  it("prime-time windows keep their names (7:20 PM is still night)", () => {
    expect(nflWindowLabel(SNF, CHI)).toBe("SUN · NIGHT");
    expect(nflWindowLabel(MNF, CHI)).toBe("MON · NIGHT");
    expect(nflWindowLabel(TNF, CHI)).toBe("THU · NIGHT");
  });
  it("one-off kickoffs print the local time", () => {
    expect(nflWindowLabel(OPENER, CHI)).toBe("WED · 7:20 PM");
    expect(nflWindowLabel(LONDON, CHI)).toBe("SUN · 8:30 AM");
  });
});

describe("nflWindowLabel in Los Angeles", () => {
  it("the early window is a 10 AM window", () => {
    expect(nflWindowLabel(SUN_1PM, LA)).toBe("SUN · 10 AM");
  });
  it("the late window is a 1 PM window", () => {
    expect(nflWindowLabel(SUN_405, LA)).toBe("SUN · 1 PM");
    expect(nflWindowLabel(SUN_425, LA)).toBe("SUN · 1 PM");
  });
  it("a 5:20 PM Sunday night kickoff still reads as the night game", () => {
    expect(nflWindowLabel(SNF, LA)).toBe("SUN · NIGHT");
    expect(nflWindowLabel(MNF, LA)).toBe("MON · NIGHT");
  });
  it("one-off kickoffs print the local time", () => {
    expect(nflWindowLabel(OPENER, LA)).toBe("WED · 5:20 PM");
    expect(nflWindowLabel(LONDON, LA)).toBe("SUN · 6:30 AM");
  });
});

describe("nflWindowLabel far from the league's clock", () => {
  it("drops the night name when the local clock reads small hours", () => {
    // Sunday night in New York is 2:20 AM Monday in Berlin.
    expect(nflWindowLabel(SNF, "Europe/Berlin")).toBe("MON · 2:20 AM");
  });
});

describe("nflWindowKey (ET grouping, zone-independent)", () => {
  it("names the league's windows", () => {
    expect(nflWindowKey(SUN_1PM)).toBe("SUN_EARLY");
    expect(nflWindowKey(SUN_405)).toBe("SUN_LATE");
    expect(nflWindowKey(SUN_425)).toBe("SUN_LATE");
    expect(nflWindowKey(SNF)).toBe("SUN_NIGHT");
    expect(nflWindowKey(MNF)).toBe("MON_NIGHT");
    expect(nflWindowKey(TNF)).toBe("THU_NIGHT");
  });
  it("keys one-off kickoffs by their exact ET time", () => {
    expect(nflWindowKey(LONDON)).not.toBe(nflWindowKey(SUN_1PM));
    expect(nflWindowKey(OPENER)).not.toBe(nflWindowKey(TNF));
  });
});

describe("groupByWindow", () => {
  const week = [
    { id: "a", date: "2026-09-11T00:15Z" }, // Thu night
    { id: "b", date: SUN_1PM },
    { id: "c", date: SUN_1PM },
    { id: "d", date: SUN_405 },
    { id: "e", date: SUN_425 },
    { id: "f", date: SNF },
    { id: "g", date: MNF },
  ];

  it("groups a sorted slate into ordered window sections (New York)", () => {
    const groups = groupByWindow(week, NY);
    expect(groups.map((g) => g.label)).toEqual([
      "THU · NIGHT",
      "SUN · 1 PM",
      "SUN · 4 PM",
      "SUN · NIGHT",
      "MON · NIGHT",
    ]);
    expect(groups[1].games.map((g) => g.id)).toEqual(["b", "c"]);
    expect(groups[2].games.map((g) => g.id)).toEqual(["d", "e"]);
  });

  it("writes Chicago headers over the same groups", () => {
    const groups = groupByWindow(week, CHI);
    expect(groups.map((g) => g.label)).toEqual([
      "THU · NIGHT",
      "SUN · 12 PM",
      "SUN · 3 PM",
      "SUN · NIGHT",
      "MON · NIGHT",
    ]);
    expect(groups.map((g) => g.games.map((x) => x.id))).toEqual(
      groupByWindow(week, NY).map((g) => g.games.map((x) => x.id))
    );
  });

  it("writes Los Angeles headers over the same groups", () => {
    const groups = groupByWindow(week, LA);
    expect(groups.map((g) => g.label)).toEqual([
      "THU · NIGHT",
      "SUN · 10 AM",
      "SUN · 1 PM",
      "SUN · NIGHT",
      "MON · NIGHT",
    ]);
    expect(groups[2].games.map((g) => g.id)).toEqual(["d", "e"]);
  });

  it("a header's hour is the hour its first kickoff prints in that zone", () => {
    for (const zone of [NY, CHI, LA]) {
      for (const g of groupByWindow(week, zone)) {
        if (g.label.endsWith("NIGHT")) continue;
        const first = new Date(g.games[0].date).toLocaleTimeString("en-US", {
          timeZone: zone,
          hour: "numeric",
        }); // "3 PM"
        expect(g.label.endsWith(` · ${first}`)).toBe(true);
      }
    }
  });
});
