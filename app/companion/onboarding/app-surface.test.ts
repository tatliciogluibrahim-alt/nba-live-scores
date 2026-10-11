import { describe, it, expect } from "vitest";
import { isAppSurfacePath, isMobileUserAgent } from "./app-surface";

// Onboarding covered the marketing pages on phones: a visitor from search
// landing on /nfl saw "Your sports, without the feed." over the article
// (found by the front-door pass, 2026-10-11). It runs on app surfaces only.

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("isAppSurfacePath", () => {
  it("allows the app's own screens", () => {
    for (const p of [
      "/app",
      "/schedule",
      "/following",
      "/following/add",
      "/following/nfl-team",
      "/watching",
      "/settings",
      "/settings/about",
      "/game/401872950",
      "/team/PIT",
      "/country/ESP",
      "/series/nyk-sas",
      "/tournament/nfl-season-2026",
      "/brief/subscribe",
    ]) {
      expect(isAppSurfacePath(p, true), p).toBe(true);
    }
  });

  it("never allows the marketing pages", () => {
    for (const p of [
      "/nfl",
      "/about",
      "/beta",
      "/changelog",
      "/how-it-works",
      "/features/no-spoilers",
      "/guides/watch-games-later-without-spoilers",
      "/compare/espn-app-alternative",
      "/world-cup-2026-app",
      "/wc/esp",
      "/nba-playoffs-alerts",
      "/privacy",
    ]) {
      expect(isAppSurfacePath(p, true), p).toBe(false);
    }
  });

  it("treats the root as the app only where the server renders Today", () => {
    expect(isAppSurfacePath("/", true)).toBe(true);
    expect(isAppSurfacePath("/", false)).toBe(false);
  });

  it("does not match a prefix inside another word", () => {
    expect(isAppSurfacePath("/gamer", true)).toBe(false);
    expect(isAppSurfacePath("/schedules", true)).toBe(false);
  });
});

describe("isMobileUserAgent", () => {
  it("matches phones and not desktops", () => {
    expect(isMobileUserAgent(IPHONE)).toBe(true);
    expect(isMobileUserAgent(MAC)).toBe(false);
    expect(isMobileUserAgent("")).toBe(false);
  });
});
