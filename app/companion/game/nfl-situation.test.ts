import { describe, it, expect } from "vitest";
import { situationView } from "./nfl-situation";

// The one quiet line under a live NFL score ("PIT ball · 1st & Goal at
// IND 1"). Shapes match the normalizer's output for the Week 5 captures.

describe("situationView", () => {
  it("names the offense, then ESPN's down and distance", () => {
    expect(
      situationView({ possession: "GB", downDistance: "3rd & 12 at CHI 43", redZone: false }, false)
    ).toEqual({ text: "GB ball · 3rd & 12 at CHI 43", redZone: false });
  });

  it("keeps the red zone flag for its one mark", () => {
    expect(
      situationView({ possession: "IND", downDistance: "1st & Goal at PIT 3", redZone: true }, false)
    ).toEqual({ text: "IND ball · 1st & Goal at PIT 3", redZone: true });
  });

  it("drops the offense when ESPN names none", () => {
    expect(situationView({ downDistance: "1st & 10 at HOU 26", redZone: false }, false)).toEqual({
      text: "1st & 10 at HOU 26",
      redZone: false,
    });
  });

  it("is nothing at all for a game hidden by No-Spoilers, not even possession", () => {
    expect(
      situationView({ possession: "IND", downDistance: "1st & Goal at PIT 3", redZone: true }, true)
    ).toBeNull();
  });

  it("is nothing without a situation", () => {
    expect(situationView(undefined, false)).toBeNull();
    expect(situationView(null, false)).toBeNull();
    expect(situationView({ downDistance: "  ", redZone: true }, false)).toBeNull();
  });
});
