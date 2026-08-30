import { describe, it, expect } from "vitest";
import { redactScore } from "./Spoiler";

// C2 (Courtside spec): the hidden state carries the SHAPE of a score and
// none of the fact. These lock the derivation for every score format the
// app renders through Spoiler.

describe("redactScore", () => {
  it("redacts an agate score line, keeping the separator", () => {
    expect(redactScore("121 – 109")).toBe("•• – ••");
    expect(redactScore("20–12")).toBe("••–••");
  });

  it("redacts a bare number (Monument numerals, table cells)", () => {
    expect(redactScore(96)).toBe("••");
    expect(redactScore("7")).toBe("••");
  });

  it("keeps soccer's penalty suffix shape without leaking it", () => {
    expect(redactScore("2 – 1 (4–3p)")).toBe("•• – •• (••–••p)");
  });

  it("digit runs collapse to the same glyph pair regardless of length", () => {
    // "128" and "9" both become "••" — the glyphs must not encode
    // magnitude, or a 3-digit blowout would read differently from a
    // 1-point game.
    expect(redactScore("128 – 9")).toBe("•• – ••");
  });

  it("non-text children fall back to bare glyphs", () => {
    expect(redactScore(null)).toBe("••");
    expect(redactScore(undefined)).toBe("••");
  });

  it("whitespace-only input never renders an empty chip", () => {
    expect(redactScore("  ")).toBe("••");
  });
});
