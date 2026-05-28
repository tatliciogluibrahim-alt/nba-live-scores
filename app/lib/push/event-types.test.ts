import { describe, it, expect } from "vitest";
import { EVENT_TYPES } from "./event-detector";
import { presetMatchesEvent } from "./preset-matcher";
import type { AlertPreset } from "../../companion/state/types";

// Invariant tests for the single-source event taxonomy. These exist
// to catch the exact failure mode the consolidation was meant to
// prevent: a new event type added to EVENT_TYPES that some consumer
// silently doesn't handle.

const TIERS: AlertPreset[] = ["quiet", "companion", "all"];

describe("EVENT_TYPES taxonomy", () => {
  it("has no duplicates", () => {
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length);
  });

  it("preset matrix covers every event type for every tier", () => {
    // presetMatchesEvent does MATRIX[event].has(tier); a missing key
    // throws. This asserts the matrix and EVENT_TYPES never drift apart
    // — if someone adds "nfl-kickoff" to EVENT_TYPES but forgets the
    // matrix row, this test (and the build, via Record<EventType>) fail.
    for (const type of EVENT_TYPES) {
      for (const tier of TIERS) {
        expect(() => presetMatchesEvent(tier, type)).not.toThrow();
        expect(typeof presetMatchesEvent(tier, type)).toBe("boolean");
      }
    }
  });

  it("keeps bookend events (tipoff, final) in every tier", () => {
    for (const tier of TIERS) {
      expect(presetMatchesEvent(tier, "tipoff")).toBe(true);
      expect(presetMatchesEvent(tier, "final")).toBe(true);
    }
  });

  it("gates closeness events (close-game, comeback) to the 'all' tier only", () => {
    expect(presetMatchesEvent("quiet", "close-game")).toBe(false);
    expect(presetMatchesEvent("companion", "close-game")).toBe(false);
    expect(presetMatchesEvent("all", "close-game")).toBe(true);
    expect(presetMatchesEvent("all", "comeback")).toBe(true);
  });
});
