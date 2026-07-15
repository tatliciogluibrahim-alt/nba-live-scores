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
          kind: "team",
          id: "OKC",
          tier: "companion",
          hideSpoilers: true,
        },
        {
          kind: "tournament",
          id: "nba-playoffs-2026",
          tier: "all",
          hideSpoilers: true,
        },
      ],
      spoilerFollows: [
        { kind: "country", id: "BRA" },
        { kind: "series", id: "OKC-SA" },
        { kind: "tournament", id: "fifa-world-cup-2026" },
      ],
    });

    expect(parsed.alerts).toEqual([
      {
        kind: "team",
        id: "OKC",
        tier: "companion",
        hideSpoilers: true,
      },
      {
        kind: "tournament",
        id: "nba-playoffs-2026",
        tier: "all",
      },
    ]);
    expect(parsed.spoilerFollows).toEqual([
      { kind: "country", id: "BRA" },
      { kind: "series", id: "OKC-SA" },
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
        [{ kind: "team", id: "NYK", tier: "all" }],
        [
          {
            kind: "team",
            id: "NYK",
            tier: "quiet",
            hideSpoilers: true,
          },
        ],
        [{ kind: "country", id: "ENG" }]
      )
    ).toEqual({
      alerts: [
        {
          kind: "team",
          id: "NYK",
          tier: "all",
          hideSpoilers: true,
        },
      ],
      spoilerFollows: [{ kind: "country", id: "ENG" }],
    });
  });

  it("deduplicates identities already carried by hidden alerts", () => {
    const parsed = validateSyncPayload({
      alerts: [
        {
          kind: "team",
          id: "OKC",
          tier: "quiet",
          hideSpoilers: true,
        },
      ],
      spoilerFollows: [
        { kind: "team", id: "OKC" },
        { kind: "team", id: "OKC" },
        { kind: "country", id: "BRA" },
      ],
    });

    expect(parsed.spoilerFollows).toEqual([{ kind: "country", id: "BRA" }]);
  });

  it("preserves the legacy alert schema without selective fields", () => {
    const parsed = validateSyncPayload({
      alerts: [{ kind: "team", id: "NYK", tier: "quiet" }],
      noSpoilers: false,
    });

    expect(parsed.alerts).toEqual([
      { kind: "team", id: "NYK", tier: "quiet" },
    ]);
    expect(parsed.spoilerFollows).toEqual([]);
    expect(parsed.noSpoilers).toBe(false);
  });
});
