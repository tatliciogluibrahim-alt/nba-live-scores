import { describe, it, expect } from "vitest";
import { spokenStatus, gameAccessibleName, scoringPlayLabel } from "./spoken";

// VoiceOver names for game surfaces (accessibility pass, 2026-10-11). The
// persona sweep heard Today's lead as "Raiders · Patriots. Open game
// details." with the live status gone, and scoring rows as bare "0–7".

describe("spokenStatus", () => {
  it("reads NFL quarter clocks as words", () => {
    expect(spokenStatus("Q1 2:34")).toBe("1st quarter, 2:34 left");
    expect(spokenStatus("Q4 0:51")).toBe("4th quarter, 0:51 left");
    expect(spokenStatus("OT 3:12")).toBe("overtime, 3:12 left");
  });

  it("reads NBA's dotted clocks and multiple overtimes", () => {
    expect(spokenStatus("Q3 · 5:12")).toBe("3rd quarter, 5:12 left");
    expect(spokenStatus("Q4 · 0.4")).toBe("4th quarter, 0.4 left");
    expect(spokenStatus("OT · 2:11")).toBe("overtime, 2:11 left");
    expect(spokenStatus("2OT · 0:45")).toBe("2nd overtime, 0:45 left");
  });

  it("reads breaks", () => {
    expect(spokenStatus("Halftime")).toBe("Halftime");
    expect(spokenStatus("HT")).toBe("Halftime");
    expect(spokenStatus("End Q3")).toBe("End of the 3rd quarter");
    expect(spokenStatus("End of 1st")).toBe("End of the 1st quarter");
    expect(spokenStatus("End of 4th")).toBe("End of the 4th quarter");
  });

  it("reads soccer minutes", () => {
    expect(spokenStatus("67'")).toBe("67th minute");
    expect(spokenStatus("90'+6'")).toBe("90th minute, plus 6");
    expect(spokenStatus("ET 105'")).toBe("Extra time, 105th minute");
    expect(spokenStatus("Penalties")).toBe("Penalty shootout");
  });

  it("reads finals", () => {
    expect(spokenStatus("Final")).toBe("Final");
    expect(spokenStatus("Final/OT")).toBe("Final, after overtime");
    expect(spokenStatus("FT")).toBe("Full time");
    expect(spokenStatus("AET")).toBe("Full time, after extra time");
    expect(spokenStatus("Pens")).toBe("Full time, decided on penalties");
  });

  it("uses the right ordinal suffixes", () => {
    expect(spokenStatus("11'")).toBe("11th minute");
    expect(spokenStatus("12'")).toBe("12th minute");
    expect(spokenStatus("21'")).toBe("21st minute");
    expect(spokenStatus("22'")).toBe("22nd minute");
    expect(spokenStatus("33'")).toBe("33rd minute");
  });

  it("passes anything else through", () => {
    expect(spokenStatus("Delayed")).toBe("Delayed");
    expect(spokenStatus("Sun 1:00 PM")).toBe("Sun 1:00 PM");
    expect(spokenStatus("  ")).toBe("");
  });
});

describe("gameAccessibleName", () => {
  const base = {
    sport: "nfl" as const,
    awayName: "Raiders",
    homeName: "Patriots",
    awayScore: 7,
    homeScore: 7,
    state: "live" as const,
    statusText: "Q1 2:34",
    hidden: false,
  };

  it("names a live game with scores, status and the action", () => {
    expect(gameAccessibleName({ ...base, action: "Open game details." })).toBe(
      "Raiders 7, Patriots 7. Live, 1st quarter, 2:34 left. Open game details."
    );
  });

  it("never carries a score or margin for a hidden game", () => {
    const name = gameAccessibleName({ ...base, awayScore: 24, homeScore: 10, hidden: true });
    expect(name).toBe("Raiders at Patriots. Live, 1st quarter, 2:34 left. Score hidden.");
    expect(name).not.toMatch(/\d+,|24|10/);
  });

  it("names a break without the live prefix", () => {
    expect(gameAccessibleName({ ...base, statusText: "Halftime" })).toBe(
      "Raiders 7, Patriots 7. Halftime."
    );
    expect(gameAccessibleName({ ...base, statusText: "End of 1st" })).toBe(
      "Raiders 7, Patriots 7. End of the 1st quarter."
    );
  });

  it("names a final and an upcoming game", () => {
    expect(
      gameAccessibleName({ ...base, state: "final", statusText: "Final", awayScore: 17, homeScore: 20 })
    ).toBe("Raiders 17, Patriots 20. Final.");
    expect(
      gameAccessibleName({ ...base, state: "upcoming", statusText: "Sun 1:00 PM", awayScore: null, homeScore: null })
    ).toBe("Raiders at Patriots. Sun 1:00 PM.");
  });

  it("uses vs for Summer Soccer and keeps the row order", () => {
    expect(
      gameAccessibleName({
        sport: "wc",
        awayName: "Spain",
        homeName: "Portugal",
        awayScore: null,
        homeScore: null,
        state: "upcoming",
        statusText: "Upcoming",
        hidden: false,
      })
    ).toBe("Spain vs Portugal. Upcoming.");
  });

  it("treats a missing score as no score", () => {
    expect(gameAccessibleName({ ...base, awayScore: null })).toBe(
      "Raiders at Patriots. Live, 1st quarter, 2:34 left."
    );
  });
});

describe("scoringPlayLabel", () => {
  it("names the scoring team and both running scores", () => {
    expect(
      scoringPlayLabel({
        when: "Q1 11:23",
        text: "DeMario Douglas 35 Yd pass from Drake Maye",
        teamName: "Patriots",
        awayName: "Raiders",
        homeName: "Patriots",
        awayScore: 0,
        homeScore: 7,
      })
    ).toBe(
      "Patriots. DeMario Douglas 35 yard pass from Drake Maye. Raiders 0, Patriots 7. 1st quarter, 11:23 left."
    );
  });

  it("reads a field goal and works without a team", () => {
    expect(
      scoringPlayLabel({
        when: "Q4 4:34",
        text: "Drew Stevens 36 Yd Field Goal",
        teamName: null,
        awayName: "Seahawks",
        homeName: "Commanders",
        awayScore: 24,
        homeScore: 27,
      })
    ).toBe("Drew Stevens 36 yard Field Goal. Seahawks 24, Commanders 27. 4th quarter, 4:34 left.");
  });
});
