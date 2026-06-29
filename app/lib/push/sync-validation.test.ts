import { describe, it, expect } from "vitest";
import { validateSyncPayload } from "./sync-validation";

describe("validateSyncPayload lockScreenOffers", () => {
  it("defaults lockScreenOffers to true when absent", () => {
    expect(validateSyncPayload({ alerts: [] }).lockScreenOffers).toBe(true);
  });

  it("defaults to true on an empty/invalid payload", () => {
    expect(validateSyncPayload(null).lockScreenOffers).toBe(true);
  });

  it("respects an explicit false", () => {
    expect(
      validateSyncPayload({ alerts: [], lockScreenOffers: false }).lockScreenOffers
    ).toBe(false);
  });

  it("respects an explicit true", () => {
    expect(
      validateSyncPayload({ alerts: [], lockScreenOffers: true }).lockScreenOffers
    ).toBe(true);
  });
});
