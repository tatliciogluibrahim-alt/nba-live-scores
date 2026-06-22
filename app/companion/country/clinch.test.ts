import { describe, it, expect } from "vitest";
import { clinchedTopTwo } from "./country-data";

// rows: { code, points, played } (the fields clinchedTopTwo reads).
const row = (code: string, points: number, played: number) => ({ code, points, played });

describe("clinchedTopTwo", () => {
  it("clinches when only one rival can still reach the team's points", () => {
    // MEX on 6 after 2; only CZE (3, max 6) can reach 6, the rest top out below.
    const rows = [row("MEX", 6, 2), row("CZE", 3, 2), row("KOR", 1, 2), row("RSA", 1, 2)];
    expect(clinchedTopTwo(rows, "MEX")).toBe(true);
  });

  it("does NOT clinch when two rivals can still reach the team's points", () => {
    // MEX on 6, but BOTH CZE and KOR sit on 3 with a game left (max 6 each):
    // three teams could finish on 6, so a top-2 spot is not guaranteed.
    const rows = [row("MEX", 6, 2), row("CZE", 3, 2), row("KOR", 3, 2), row("RSA", 0, 2)];
    expect(clinchedTopTwo(rows, "MEX")).toBe(false);
  });

  it("clinches once the team has finished and no rival can catch its points", () => {
    const rows = [row("USA", 9, 3), row("POR", 4, 3), row("AUS", 3, 2), row("PAR", 1, 3)];
    // AUS max = 3 + 3 = 6 < 9, POR/PAR done below 9 -> zero rivals can reach 9.
    expect(clinchedTopTwo(rows, "USA")).toBe(true);
  });

  it("does not clinch a mid-table team early", () => {
    const rows = [row("A", 4, 2), row("B", 4, 2), row("C", 3, 2), row("D", 1, 2)];
    // For C (3): A max 7, B max 7, D max 4 -> 3 rivals can reach 3 -> false.
    expect(clinchedTopTwo(rows, "C")).toBe(false);
  });

  it("treats a rival that can only TIE as still able to catch (conservative)", () => {
    // ME 6/2. One rival can reach exactly 6 (3 + 3). That's still one rival,
    // so ME is guaranteed at worst 2nd -> clinched. A SECOND tying rival flips it.
    const oneTie = [row("ME", 6, 2), row("X", 3, 2), row("Y", 0, 2), row("Z", 0, 2)];
    expect(clinchedTopTwo(oneTie, "ME")).toBe(true);
    const twoTies = [row("ME", 6, 2), row("X", 3, 2), row("Y", 3, 2), row("Z", 0, 2)];
    expect(clinchedTopTwo(twoTies, "ME")).toBe(false);
  });

  it("returns false for an unknown team or an empty/singleton table", () => {
    expect(clinchedTopTwo([row("A", 9, 3)], "A")).toBe(false);
    expect(clinchedTopTwo([], "A")).toBe(false);
    expect(clinchedTopTwo([row("A", 9, 3), row("B", 0, 3)], "MISSING")).toBe(false);
  });
});
