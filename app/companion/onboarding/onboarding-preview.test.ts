import { describe, it, expect } from "vitest";
import { alertPreviewFor } from "./OnboardingFlow";

// The step-2 lock-screen mock's copy branches (Preseason Review rank 1:
// this was a hardcoded NBA score shown to the September NFL cohort).

describe("alertPreviewFor", () => {
  const nflTeam = (scopeId: string) => ({
    momentId: "nfl-season-2026",
    scope: "team" as const,
    scopeId,
  });

  it("names the picked team in the mock", () => {
    const p = alertPreviewFor([nflTeam("DET")], true);
    expect(p.eyebrow).toBe("NFL · Q4 · 2:14");
    expect(p.headline).toBe("One-score game. DET 20, KC 24.");
  });

  it("a KC pick gets a different opponent, not KC vs KC", () => {
    expect(alertPreviewFor([nflTeam("KC")], true).headline).toBe(
      "One-score game. KC 20, BUF 24."
    );
  });

  it("whole-season pick (no team) gets the generic NFL mock", () => {
    const p = alertPreviewFor(
      [{ momentId: "nfl-season-2026", scope: "all" as const, scopeId: null }],
      true
    );
    expect(p.headline).toBe("One-score game. Kickoff and final on Quiet.");
  });

  it("an NBA team follow never leaks into the NFL mock", () => {
    // Collision guard: an NBA "LAC" pick must not read as an NFL team.
    const p = alertPreviewFor(
      [{ momentId: "nba-playoffs-2025", scope: "team" as const, scopeId: "LAC" }],
      true
    );
    expect(p.headline).toBe("One-score game. Kickoff and final on Quiet.");
  });

  it("falls back to the NBA mock when NFL is not followable", () => {
    const p = alertPreviewFor([], false);
    expect(p.eyebrow).toBe("NBA · Q4 · 4:21");
    expect(p.headline).toBe("One-possession game. OKC 96, SA 94.");
  });
});
