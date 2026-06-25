import { describe, it, expect } from "vitest";
import { deriveSubline } from "./live-activity-subline";

describe("deriveSubline", () => {
  it("strips the Summer Soccer prefix (the rebrand the old regex missed)", () => {
    expect(deriveSubline("Summer Soccer · Group A")).toBe("Group A");
    expect(deriveSubline("Summer Soccer · Round of 16")).toBe("Round of 16");
  });

  it("strips NBA / NFL / legacy World Cup prefixes too", () => {
    expect(deriveSubline("NBA · Game 6")).toBe("Game 6");
    expect(deriveSubline("World Cup · Group C")).toBe("Group C");
    expect(deriveSubline("NFL · Wild Card")).toBe("Wild Card");
  });

  it("returns empty for a bare league name (group not yet resolved)", () => {
    expect(deriveSubline("Summer Soccer")).toBe("");
    expect(deriveSubline("NBA")).toBe("");
    expect(deriveSubline("")).toBe("");
    expect(deriveSubline(undefined)).toBe("");
    expect(deriveSubline(null)).toBe("");
  });

  it("leaves a real stage label untouched", () => {
    expect(deriveSubline("Group A")).toBe("Group A");
    expect(deriveSubline("Quarterfinal")).toBe("Quarterfinal");
  });
});
