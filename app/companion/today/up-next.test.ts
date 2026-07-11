import { describe, it, expect } from "vitest";
import { wcToUpNext, type WCGameLite } from "./today-data";

// Placeholder-fixture honesty (peer review 2026-07-11). ESPN publishes
// upper-round fixtures before the teams are decided, with slot codes as
// abbreviations ("QFW1" = quarterfinal winner 1). Those codes must never
// reach Today's NEXT pointer or the home-screen widget — the stage name
// is the honest headline until the matchup is real.

function wcGame(over: Partial<WCGameLite> = {}): WCGameLite {
  return {
    id: "wc-sf-1",
    date: "2026-07-14T19:00:00Z",
    status: "upcoming",
    statusText: "Upcoming",
    stage: "Semifinal",
    group: "",
    home: { name: "TBD", abbreviation: "QFW1", score: 0 },
    away: { name: "TBD", abbreviation: "QFW2", score: 0 },
    broadcasts: [],
    watchLabel: "",
    ...over,
  };
}

describe("wcToUpNext — placeholder fixtures", () => {
  it("uses the stage as the headline when either side is a slot code", () => {
    const item = wcToUpNext(wcGame(), false, true);
    expect(item.headline).toBe("Semifinal");
    expect(item.headline).not.toMatch(/QFW/);
    expect(item.detail).not.toMatch(/QFW/);
    expect(item.detail).toContain("Teams to be decided");
    expect(item.spoilerSubject).toBe("Semifinal");
  });

  it("falls back to a calm generic headline when the stage is empty", () => {
    const item = wcToUpNext(wcGame({ stage: "" }), false, true);
    expect(item.headline).toBe("Teams to be decided");
  });

  it("keeps the real matchup headline for decided fixtures", () => {
    const item = wcToUpNext(
      wcGame({
        home: { name: "France", abbreviation: "FRA", score: 0 },
        away: { name: "Netherlands", abbreviation: "NED", score: 0 },
      }),
      false,
      true
    );
    expect(item.headline).toBe("NED vs FRA");
    expect(item.detail).toContain("Semifinal");
  });
});
