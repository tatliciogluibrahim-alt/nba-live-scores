import { describe, it, expect } from "vitest";
import { EVENT_TYPES } from "./event-detector";
import { presetMatchesEvent } from "./preset-matcher";
import { eventSport } from "./dispatcher";
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

  // The dispatcher gates fan-out on the event's sport. When that classifier
  // was a WC-or-NBA binary, every "nfl-*" type read as "nba" — no NFL alert
  // could fire, and NBA follows of colliding codes matched NFL events. This
  // locks EVERY type to a sport, so a new type that breaks the naming
  // convention fails here instead of silently defaulting.
  it("classifies every event type to the right sport", () => {
    const expected = (type: string) =>
      type.startsWith("wc-") ? "wc" : type.startsWith("nfl-") ? "nfl" : "nba";
    for (const type of EVENT_TYPES) {
      const sport = eventSport({
        type,
        gameId: "g",
        awayCode: "AAA",
        homeCode: "BBB",
        awayScore: 0,
        homeScore: 0,
      });
      expect(sport, `event type "${type}" classified as ${sport}`).toBe(
        expected(type)
      );
    }
  });

  it("covers all three sports (a sport with zero event types is a gap)", () => {
    const sports = new Set(
      EVENT_TYPES.map((type) =>
        eventSport({
          type,
          gameId: "g",
          awayCode: "AAA",
          homeCode: "BBB",
          awayScore: 0,
          homeScore: 0,
        })
      )
    );
    expect(sports).toEqual(new Set(["nba", "wc", "nfl"]));
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
