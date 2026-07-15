import { describe, expect, it } from "vitest";
import { isFollowLive, liveFollowKey } from "./use-live-follows";

describe("isFollowLive", () => {
  it("keeps colliding team and country codes inside their sport", () => {
    const live = new Set([liveFollowKey("country", "POR")]);

    expect(isFollowLive("country", "POR", live)).toBe(true);
    expect(isFollowLive("team", "POR", live)).toBe(false);
  });

  it("matches series independently from participant teams", () => {
    const live = new Set([liveFollowKey("series", "BOS-LAL")]);

    expect(isFollowLive("series", "BOS-LAL", live)).toBe(true);
    expect(isFollowLive("team", "BOS-LAL", live)).toBe(false);
  });
});
