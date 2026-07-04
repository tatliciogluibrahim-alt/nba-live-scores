import { describe, it, expect } from "vitest";
import { deriveWCHero } from "./WCGameDetail";
import { deriveWCLiveHeadline } from "../today/today-data";
import type { WCGameLite } from "../today/today-data";

// Copy-branch tests for the live-phase classifiers. Locked by the
// 2026-07-03 device bug: at 100' (extra time) the detail said "First
// half underway." because ^[1-4]\d prefix-matched the "10" in "100".
function live(statusText: string): WCGameLite {
  return {
    id: "g1",
    date: new Date().toISOString(),
    status: "live",
    statusText,
    stage: "Round of 32",
    home: { name: "Argentina", abbreviation: "ARG", score: 2 },
    away: { name: "Cape Verde", abbreviation: "CPV", score: 1 },
  } as unknown as WCGameLite;
}

describe("deriveWCHero live phases", () => {
  const cases: Array<[string, string]> = [
    ["25'", "First half underway."],
    ["45'+2'", "First half underway."],
    ["60'", "Second half underway."],
    ["90'", "Stoppage time."],
    ["90'+4'", "Stoppage time."],
    ["100'", "Extra time."],
    ["ET 103'", "Extra time."],
    ["119'", "Extra time."],
    ["Pens", "Penalty shootout."],
    ["HT", "Halftime."],
  ];
  for (const [statusText, headline] of cases) {
    it(`${statusText} → ${headline}`, () => {
      expect(deriveWCHero(live(statusText)).headline).toBe(headline);
    });
  }
});

describe("deriveWCLiveHeadline live phases", () => {
  const cases: Array<[string, string]> = [
    ["25'", "First half underway."],
    ["60'", "Second half underway."],
    ["90'+2'", "Stoppage time."],
    ["100'", "Extra time."],
    ["Pens", "Penalty shootout."],
  ];
  for (const [statusText, headline] of cases) {
    it(`${statusText} → ${headline}`, () => {
      expect(deriveWCLiveHeadline(live(statusText))).toBe(headline);
    });
  }
});
