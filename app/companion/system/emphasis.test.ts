import { describe, it, expect } from "vitest";
import { winnerSide } from "./emphasis";

describe("winnerSide (spec §2 + §10 draw law)", () => {
  it("emphasizes the winner at final", () => {
    expect(winnerSide(2, 0, "final")).toBe("away");
    expect(winnerSide(99, 104, "final")).toBe("home");
  });
  it("never emphasizes on a draw (soccer group games draw routinely)", () => {
    expect(winnerSide(1, 1, "final")).toBe(null);
  });
  it("never emphasizes while live or upcoming", () => {
    expect(winnerSide(3, 0, "live")).toBe(null);
    expect(winnerSide(null, null, "upcoming")).toBe(null);
  });
  it("null scores at final yield no emphasis", () => {
    expect(winnerSide(null, 2, "final")).toBe(null);
  });
});
