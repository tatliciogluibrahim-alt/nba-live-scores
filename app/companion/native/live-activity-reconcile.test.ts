import { describe, expect, it } from "vitest";
import { planLiveActivityReconciliation } from "./live-activity-reconcile";

function desired(gameId: string, redacted = false) {
  return { gameId, redacted, value: gameId };
}

describe("planLiveActivityReconciliation", () => {
  it("keeps exactly the newest three unique live pins", () => {
    const plan = planLiveActivityReconciliation(
      [desired("new"), desired("middle"), desired("old"), desired("overflow")],
      new Map([
        ["middle", false],
        ["old", false],
        ["overflow", false],
      ])
    );

    expect(plan.desired.map((item) => item.gameId)).toEqual([
      "new",
      "middle",
      "old",
    ]);
    expect(plan.endGameIds).toEqual(["overflow"]);
    expect(plan.start.map((item) => item.gameId)).toEqual(["new"]);
  });

  it("ends overflow before a replacement is started", () => {
    const plan = planLiveActivityReconciliation(
      [desired("replacement"), desired("a"), desired("b"), desired("c")],
      new Map([
        ["a", false],
        ["b", false],
        ["c", false],
      ])
    );

    expect(plan.endGameIds).toEqual(["c"]);
    expect(plan.start.map((item) => item.gameId)).toEqual(["replacement"]);
  });

  it("restarts and clears reveal when hiding is newly enabled", () => {
    const plan = planLiveActivityReconciliation(
      [desired("game", true)],
      new Map([["game", false]])
    );

    expect(plan.endGameIds).toEqual(["game"]);
    expect(plan.start.map((item) => item.gameId)).toEqual(["game"]);
    expect(plan.clearRevealGameIds).toEqual(["game"]);
  });

  it("clears a stale reveal before a newly-started hidden game", () => {
    const plan = planLiveActivityReconciliation(
      [desired("repinned", true)],
      new Map()
    );

    expect(plan.endGameIds).toEqual([]);
    expect(plan.start.map((item) => item.gameId)).toEqual(["repinned"]);
    expect(plan.clearRevealGameIds).toEqual(["repinned"]);
  });

  it("restarts without clearing reveal when hiding is disabled", () => {
    const plan = planLiveActivityReconciliation(
      [desired("game", false)],
      new Map([["game", true]])
    );

    expect(plan.endGameIds).toEqual(["game"]);
    expect(plan.start.map((item) => item.gameId)).toEqual(["game"]);
    expect(plan.clearRevealGameIds).toEqual([]);
  });

  it("safely restarts an older activity whose redaction is unknown", () => {
    const plan = planLiveActivityReconciliation(
      [desired("game", true)],
      new Map([["game", null]])
    );

    expect(plan.endGameIds).toEqual(["game"]);
    expect(plan.start.map((item) => item.gameId)).toEqual(["game"]);
    expect(plan.clearRevealGameIds).toEqual(["game"]);
  });

  it("does nothing when slot membership and redaction already match", () => {
    const plan = planLiveActivityReconciliation(
      [desired("a", true), desired("b", false)],
      new Map([
        ["a", true],
        ["b", false],
      ])
    );

    expect(plan.endGameIds).toEqual([]);
    expect(plan.start).toEqual([]);
    expect(plan.clearRevealGameIds).toEqual([]);
  });
});
