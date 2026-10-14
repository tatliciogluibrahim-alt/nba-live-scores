import { describe, it, expect } from "vitest";
import { contentForToken, isHeldToken } from "./live-activity-held";
import type { LiveActivityContentState } from "./apns-sender";

// Courtside C4b: held scores never enter ActivityKit. A token whose Live
// Activity is redacted, whose app build can draw a held state, and that
// hasn't been revealed gets zeros plus held: true. Every other token gets
// real digits, so an older build never shows a placeholder as a score.

const content: LiveActivityContentState = {
  awayCode: "CIN",
  awayScore: 27,
  homeCode: "PIT",
  homeScore: 24,
  statusLine: "Q4 5:23",
  subline: "WEEK 3",
  accentHex: "#1f3a6b",
  progress: 0.91,
  awayName: "Bengals",
  homeName: "Steelers",
};

describe("isHeldToken: the fan-out table", () => {
  const cases: [boolean, boolean, boolean, boolean][] = [
    // redacted, heldCapable, revealed → held
    [true, true, false, true],
    [true, true, true, false],
    [true, false, false, false],
    [true, false, true, false],
    [false, true, false, false],
    [false, true, true, false],
    [false, false, false, false],
    [false, false, true, false],
  ];
  for (const [redacted, heldCapable, revealed, held] of cases) {
    it(`redacted ${redacted}, capable ${heldCapable}, revealed ${revealed} → ${held ? "held" : "digits"}`, () => {
      expect(isHeldToken({ redacted, heldCapable, revealed })).toBe(held);
    });
  }

  it("treats missing flags as an old registration: digits", () => {
    expect(isHeldToken({})).toBe(false);
  });
});

describe("contentForToken", () => {
  it("sends a held token zeros and held, nothing else changed", () => {
    const out = contentForToken(content, { redacted: true, heldCapable: true });
    expect(out).toEqual({ ...content, awayScore: 0, homeScore: 0, held: true });
    expect(JSON.stringify(out)).not.toMatch(/27|24/);
  });

  it("sends every other token the content as it is, with no held key", () => {
    const out = contentForToken(content, { redacted: true, heldCapable: false });
    expect(out).toEqual(content);
    expect("held" in out).toBe(false);
  });
});
