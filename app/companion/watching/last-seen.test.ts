import { describe, it, expect } from "vitest";
import {
  LAST_SEEN_TTL_MS,
  parseSeenMap,
  recordSeen,
  scoreSinceLastLook,
} from "./last-seen";

// Watching's "what changed since your last look" (persona sweep,
// 2026-10-11): the last score you saw per tracked game, and the quiet
// "Was 7–6" line when it moved while you were away. Never for a game
// hidden by No-Spoilers.

describe("scoreSinceLastLook", () => {
  it("a score that moved since the last look says what it was", () => {
    expect(scoreSinceLastLook({ away: 7, home: 6 }, { away: 7, home: 13 }, false)).toEqual({
      changed: true,
      was: "Was 7–6",
    });
  });

  it("an unchanged score says nothing", () => {
    expect(scoreSinceLastLook({ away: 7, home: 6 }, { away: 7, home: 6 }, false)).toEqual({
      changed: false,
      was: null,
    });
  });

  it("a game you never looked at says nothing", () => {
    expect(scoreSinceLastLook(null, { away: 7, home: 13 }, false).changed).toBe(false);
    expect(scoreSinceLastLook(undefined, { away: 7, home: 13 }, false).changed).toBe(false);
  });

  it("a game with no score yet says nothing", () => {
    expect(scoreSinceLastLook({ away: 0, home: 0 }, { away: null, home: null }, false).changed).toBe(
      false
    );
  });

  it("a game hidden by No-Spoilers never says anything, even when it moved", () => {
    expect(scoreSinceLastLook({ away: 7, home: 6 }, { away: 7, home: 13 }, true)).toEqual({
      changed: false,
      was: null,
    });
  });
});

describe("the stored map", () => {
  const now = Date.parse("2026-10-11T20:30:00Z");

  it("records the score you saw, per game", () => {
    const map = recordSeen({}, "401872985", { away: 16, home: 24 }, now);
    expect(map["401872985"]).toEqual({ away: 16, home: 24, at: now });
    const next = recordSeen(map, "401872985", { away: 16, home: 31 }, now + 1000);
    expect(next["401872985"]).toEqual({ away: 16, home: 31, at: now + 1000 });
  });

  it("forgets games older than the window", () => {
    const old = recordSeen({}, "old", { away: 1, home: 2 }, now - LAST_SEEN_TTL_MS - 1);
    const map = recordSeen(old, "new", { away: 3, home: 4 }, now);
    expect(Object.keys(map)).toEqual(["new"]);
  });

  it("reads back what it wrote, and shrugs off anything else", () => {
    const map = recordSeen({}, "g", { away: 7, home: 6 }, now);
    expect(parseSeenMap(JSON.stringify(map))).toEqual(map);
    expect(parseSeenMap(null)).toEqual({});
    expect(parseSeenMap("not json")).toEqual({});
    expect(parseSeenMap("[1,2]")).toEqual({});
    expect(
      parseSeenMap(JSON.stringify({ ok: { away: 1, home: 2, at: 3 }, bad: { away: "x" } }))
    ).toEqual({ ok: { away: 1, home: 2, at: 3 } });
  });
});
