import { describe, expect, it } from "vitest";
import {
  isLiveActivityOffer,
  nativeNotificationPath,
} from "./native-notification-route";

describe("nativeNotificationPath", () => {
  it("preserves a payload game URL and query", () => {
    expect(
      nativeNotificationPath({ url: "/game/wc1?offer=live-activity" })
    ).toBe("/game/wc1?offer=live-activity");
  });

  it("falls back to gameId for older native offer payloads", () => {
    expect(nativeNotificationPath({ gameId: "nba 1" })).toBe(
      "/game/nba%201"
    );
  });

  it("rejects absolute and protocol-relative custom URLs", () => {
    expect(nativeNotificationPath({ url: "https://example.com/phish" })).toBeNull();
    expect(nativeNotificationPath({ url: "//example.com/phish" })).toBeNull();
  });

  it("returns null without a usable destination", () => {
    expect(nativeNotificationPath({})).toBeNull();
  });
});

describe("isLiveActivityOffer", () => {
  it("requires both the offer type and a non-empty game id", () => {
    expect(
      isLiveActivityOffer({ type: "live-activity-offer", gameId: "wc1" })
    ).toBe(true);
    expect(isLiveActivityOffer({ type: "live-activity-offer" })).toBe(false);
    expect(isLiveActivityOffer({ type: "score", gameId: "wc1" })).toBe(false);
  });
});
