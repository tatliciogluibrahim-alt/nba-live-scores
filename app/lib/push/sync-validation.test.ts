import { describe, it, expect } from "vitest";
import {
  preserveSelectiveSpoilers,
  validateSyncPayload,
} from "./sync-validation";

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

describe("validateSyncPayload selective No-Spoilers", () => {
  it("defaults the new field for old and invalid clients", () => {
    const old = validateSyncPayload({ alerts: [] });
    expect(old.spoilerFollows).toEqual([]);
    expect(old.selectiveSpoilersProvided).toBe(false);
    expect(validateSyncPayload(null).spoilerFollows).toEqual([]);
    expect(validateSyncPayload(null).selectiveSpoilersProvided).toBe(false);
  });

  it("keeps team/country/series selective state and ignores tournaments", () => {
    const parsed = validateSyncPayload({
      alerts: [
        {
          momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC",
          tier: "companion",
          hideSpoilers: true,
        },
        {
          momentId: "nba-playoffs-2026", scope: "all", scopeId: null,
          tier: "all",
          hideSpoilers: true,
        },
      ],
      spoilerFollows: [
        { momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA" },
        { momentId: "nba-playoffs-2025", scope: "series", scopeId: "OKC-SA" },
        { momentId: "fifa-world-cup-2026", scope: "all", scopeId: null },
      ],
    });

    expect(parsed.alerts).toEqual([
      {
        momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC",
        tier: "companion",
        hideSpoilers: true,
      },
      {
        momentId: "nba-playoffs-2026", scope: "all", scopeId: null,
        tier: "all",
      },
    ]);
    expect(parsed.spoilerFollows).toEqual([
      { momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA" },
      { momentId: "nba-playoffs-2025", scope: "series", scopeId: "OKC-SA" },
    ]);
    expect(parsed.selectiveSpoilersProvided).toBe(true);
  });

  it("distinguishes explicit privacy flags from legacy omissions", () => {
    expect(validateSyncPayload({ alerts: [] }).noSpoilersProvided).toBe(false);
    expect(
      validateSyncPayload({ alerts: [], noSpoilers: false })
        .noSpoilersProvided
    ).toBe(true);
  });

  it("preserves selective choices across a legacy alert-tier sync", () => {
    expect(
      preserveSelectiveSpoilers(
        [{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK", tier: "all" }],
        [
          {
            momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK",
            tier: "quiet",
            hideSpoilers: true,
          },
        ],
        [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "ENG" }]
      )
    ).toEqual({
      alerts: [
        {
          momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK",
          tier: "all",
          hideSpoilers: true,
        },
      ],
      spoilerFollows: [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "ENG" }],
    });
  });

  it("deduplicates identities already carried by hidden alerts", () => {
    const parsed = validateSyncPayload({
      alerts: [
        {
          momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC",
          tier: "quiet",
          hideSpoilers: true,
        },
      ],
      spoilerFollows: [
        { momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC" },
        { momentId: "nba-playoffs-2025", scope: "team", scopeId: "OKC" },
        { momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA" },
      ],
    });

    expect(parsed.spoilerFollows).toEqual([{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "BRA" }]);
  });

  it("preserves the legacy alert schema without selective fields", () => {
    const parsed = validateSyncPayload({
      alerts: [{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK", tier: "quiet" }],
      noSpoilers: false,
    });

    expect(parsed.alerts).toEqual([
      { momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK", tier: "quiet" },
    ]);
    expect(parsed.spoilerFollows).toEqual([]);
    expect(parsed.noSpoilers).toBe(false);
  });
});
