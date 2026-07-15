import { describe, expect, it } from "vitest";
import {
  gameBackTarget,
  parseGameOrigin,
  parseGameReturnTo,
  withGameOrigin,
} from "./game-origin";

describe("game origin", () => {
  it("accepts only the three app surfaces", () => {
    expect(parseGameOrigin("today")).toBe("today");
    expect(parseGameOrigin("schedule")).toBe("schedule");
    expect(parseGameOrigin("watching")).toBe("watching");
    expect(parseGameOrigin("following")).toBeNull();
    expect(parseGameOrigin("https://example.com")).toBeNull();
    expect(parseGameOrigin(["today", "watching"])).toBeNull();
    expect(parseGameOrigin(undefined)).toBeNull();
  });

  it("adds source context to a game link", () => {
    expect(withGameOrigin("/game/123", "schedule")).toBe(
      "/game/123?from=schedule"
    );
  });

  it("carries a validated Schedule return path through cold detail loads", () => {
    const returnTo = "/schedule?scope=all&competition=fifa-world-cup-2026&view=bracket";
    expect(withGameOrigin("/game/123", "schedule", returnTo)).toBe(
      "/game/123?from=schedule&returnTo=%2Fschedule%3Fscope%3Dall%26competition%3Dfifa-world-cup-2026%26view%3Dbracket"
    );
    expect(gameBackTarget("schedule", returnTo)).toEqual({
      href: returnTo,
      label: "Schedule",
    });
  });

  it("rejects external and non-Schedule return paths", () => {
    expect(parseGameReturnTo("//example.com/schedule", "schedule")).toBeNull();
    expect(
      parseGameReturnTo("https://example.com/schedule", "schedule")
    ).toBeNull();
    expect(parseGameReturnTo("/watching", "schedule")).toBeNull();
    expect(parseGameReturnTo("/schedule?scope=all", "today")).toBeNull();
  });

  it("preserves existing query parameters and hashes", () => {
    expect(
      withGameOrigin("/game/123?offer=live-activity#score", "watching")
    ).toBe("/game/123?offer=live-activity&from=watching#score");
  });

  it("replaces an existing source without duplicating it", () => {
    expect(withGameOrigin("/game/123?from=today", "watching")).toBe(
      "/game/123?from=watching"
    );
  });

  it("does not rewrite non-game or absent-origin links", () => {
    expect(withGameOrigin("/schedule", "today")).toBe("/schedule");
    expect(withGameOrigin("https://example.com/game/123", "today")).toBe(
      "https://example.com/game/123"
    );
    expect(withGameOrigin("/game/123")).toBe("/game/123");
  });

  it("maps sources to deterministic return targets and defaults to Today", () => {
    expect(gameBackTarget("schedule")).toEqual({
      href: "/schedule",
      label: "Schedule",
    });
    expect(gameBackTarget("watching")).toEqual({
      href: "/watching",
      label: "Watching",
    });
    expect(gameBackTarget(null)).toEqual({ href: "/app", label: "Today" });
  });
});
