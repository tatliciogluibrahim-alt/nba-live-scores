import { describe, it, expect } from "vitest";
import {
  scoreEvent,
  SIGNIFICANCE_THRESHOLD,
  PERSONAL_BOOST,
} from "./significance";

const { all, companion, quiet } = SIGNIFICANCE_THRESHOLD;

describe("scoreEvent — WC (the live proving ground)", () => {
  it("THE final breaks through to Quiet", () => {
    const s = scoreEvent({ type: "wc-final", stage: "Final" });
    expect(s).toBeGreaterThanOrEqual(quiet);
  });

  it("a group match ending reaches only Full Details", () => {
    const s = scoreEvent({ type: "wc-final", stage: "Group A" });
    expect(s).toBeGreaterThanOrEqual(all);
    expect(s).toBeLessThan(companion);
  });

  it("a semifinal ending breaks through to Quiet", () => {
    expect(scoreEvent({ type: "wc-final", stage: "Semifinal" })).toBeGreaterThanOrEqual(
      quiet
    );
  });

  it("a goal in the final reaches Companion; personal boost carries it to Quiet", () => {
    const s = scoreEvent({ type: "wc-goal", stage: "Final", minute: 70 });
    expect(s).toBeGreaterThanOrEqual(companion);
    expect(s).toBeLessThan(quiet);
    expect(s + PERSONAL_BOOST).toBeGreaterThanOrEqual(quiet);
  });

  it("a routine group goal reaches nobody below Full Details", () => {
    const s = scoreEvent({ type: "wc-goal", stage: "Group C", minute: 20 });
    expect(s).toBeLessThan(companion);
    // ...but your own country scoring still reaches Companion via the boost.
    expect(s + PERSONAL_BOOST).toBeGreaterThanOrEqual(companion);
  });

  it("a late goal outweighs an early one", () => {
    const late = scoreEvent({ type: "wc-goal", stage: "Quarterfinal", minute: 88 });
    const early = scoreEvent({ type: "wc-goal", stage: "Quarterfinal", minute: 12 });
    expect(late).toBeGreaterThan(early);
  });

  it("deeper rounds score higher for the same event", () => {
    const order = (["Round of 32", "Quarterfinal", "Semifinal", "Final"] as const).map(
      (stage) => scoreEvent({ type: "wc-final", stage })
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});

describe("scoreEvent — NBA", () => {
  it("a Game 7 final is a max-significance moment", () => {
    expect(
      scoreEvent({ type: "final", isGame7: true, margin: 3, period: 4, secondsRemaining: 20 })
    ).toBeGreaterThanOrEqual(quiet);
  });

  it("a final reaches every tier (finals are the one universal ping)", () => {
    const s = scoreEvent({ type: "final", margin: 18, period: 4, secondsRemaining: 0 });
    expect(s).toBeGreaterThanOrEqual(quiet);
  });

  it("a tight late close-game breaks Companion", () => {
    const s = scoreEvent({
      type: "close-game",
      margin: 2,
      period: 4,
      secondsRemaining: 30,
    });
    expect(s).toBeGreaterThanOrEqual(companion);
  });

  it("a 50-point night breaks Quiet; a 30 does not", () => {
    expect(scoreEvent({ type: "nba-highlight", milestone: 50 })).toBeGreaterThanOrEqual(
      quiet
    );
    expect(scoreEvent({ type: "nba-highlight", milestone: 30 })).toBeLessThan(companion);
  });

  it("a bigger comeback scores higher", () => {
    expect(scoreEvent({ type: "comeback", maxLead: 28 })).toBeGreaterThan(
      scoreEvent({ type: "comeback", maxLead: 16 })
    );
  });

  it("a tipoff reaches Companion, and a followed team's tipoff breaks Quiet", () => {
    const s = scoreEvent({ type: "tipoff" });
    expect(s).toBeGreaterThanOrEqual(companion);
    expect(s).toBeLessThan(quiet); // a stranger's game start doesn't reach Quiet
    expect(s + PERSONAL_BOOST).toBeGreaterThanOrEqual(quiet); // your team's does
    expect(scoreEvent({ type: "tipoff", isGame7: true })).toBeGreaterThan(s);
  });

  it("stays within 0–100", () => {
    const s = scoreEvent({
      type: "final",
      isGame7: true,
      margin: 0,
      period: 4,
      secondsRemaining: 0,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
