import { describe, it, expect } from "vitest";
import { normalizeStoredPrefs } from "./storage";

describe("normalizeStoredPrefs lockScreenOffers", () => {
  it("defaults to true when absent", () => {
    expect(normalizeStoredPrefs({}).lockScreenOffers).toBe(true);
  });

  it("preserves an explicit false across a round-trip", () => {
    expect(normalizeStoredPrefs({ lockScreenOffers: false }).lockScreenOffers).toBe(false);
  });

  it("preserves an explicit true", () => {
    expect(normalizeStoredPrefs({ lockScreenOffers: true }).lockScreenOffers).toBe(true);
  });
});
