import { describe, it, expect } from "vitest";
import {
  MOMENTS,
  getMoment,
  momentSport,
  followIsDirect,
  legacyKindOf,
  legacyIdOf,
} from "./moments";
import { TOURNAMENTS } from "../following/data/tournaments";

describe("MOMENTS directory integrity", () => {
  it("carries exactly the three registered moments, ids matching tournaments.ts", () => {
    expect(MOMENTS.map((m) => m.id).sort()).toEqual(
      TOURNAMENTS.map((t) => t.id).sort()
    );
  });

  it("every moment's declared sport agrees with momentSport (one vocabulary)", () => {
    for (const m of MOMENTS) expect(momentSport(m.id)).toBe(m.sport);
  });

  it("the NFL moment type-checks against the schema with all + team scopes (design-doc risk gate)", () => {
    const nfl = getMoment("nfl-season-2026")!;
    expect(nfl.sport).toBe("nfl");
    expect(nfl.scopes.map((s) => s.kind)).toEqual(["all", "team"]);
  });

  it("every moment leads its ladder with the whole-moment scope", () => {
    for (const m of MOMENTS) expect(m.scopes[0].kind).toBe("all");
  });
});

describe("momentSport — prefix-tolerant across seasons", () => {
  it("resolves future season ids without a directory edit", () => {
    expect(momentSport("nba-playoffs-2027")).toBe("nba");
    expect(momentSport("nfl-season-2027")).toBe("nfl");
    expect(momentSport("fifa-world-cup-2030")).toBe("wc");
  });

  it("returns null for unknown families (matches nothing, never guesses)", () => {
    expect(momentSport("ncaa-madness-2027")).toBeNull();
    expect(momentSport("")).toBeNull();
  });
});

describe("scope helpers", () => {
  it("direct = any specific entity; whole-moment is not direct", () => {
    expect(followIsDirect({ scope: "team" })).toBe(true);
    expect(followIsDirect({ scope: "country" })).toBe(true);
    expect(followIsDirect({ scope: "series" })).toBe(true);
    expect(followIsDirect({ scope: "group" })).toBe(true);
    expect(followIsDirect({ scope: "all" })).toBe(false);
  });

  it("derives the exact legacy kind/id view v1 stored", () => {
    expect(legacyKindOf({ scope: "team" })).toBe("team");
    expect(legacyKindOf({ scope: "country" })).toBe("country");
    expect(legacyKindOf({ scope: "series" })).toBe("series");
    expect(legacyKindOf({ scope: "all" })).toBe("tournament");
    expect(legacyKindOf({ scope: "group" })).toBeNull();
    expect(legacyIdOf({ momentId: "nba-playoffs-2025", scopeId: "NYK" })).toBe("NYK");
    expect(
      legacyIdOf({ momentId: "fifa-world-cup-2026", scopeId: null })
    ).toBe("fifa-world-cup-2026");
  });
});
