import { describe, it, expect } from "vitest";
import {
  preserveSelectiveSpoilers,
  validateSyncPayload,
  migrateStoredAlerts,
  migrateStoredFollows,
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

// ── Read-seam migration ───────────────────────────────────────────────
// Rows written before Path B (2026-07-19) carry legacy {kind, id}
// identities and no momentId. Devices that never re-synced never hit the
// sync-time migration, and both stores passed those rows to the dispatcher
// raw — where momentSport(undefined) crashed the ENTIRE dispatch batch
// (found 2026-08-29 by the synthetic delivery test; dispatch had been
// dormant since the exact day Path B landed).

describe("migrateStoredAlerts (rows at rest)", () => {
  it("migrates a legacy {kind, id} alert to a Path B identity", () => {
    const out = migrateStoredAlerts([
      { kind: "team", id: "NYK", tier: "quiet" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].momentId).toBeTruthy();
    expect(out[0].scope).toBe("team");
    expect(out[0].scopeId).toBe("NYK");
    expect(out[0].tier).toBe("quiet");
  });

  it("passes a v2 row through unchanged, keeping hideSpoilers", () => {
    const out = migrateStoredAlerts([
      {
        momentId: "nfl-season-2026",
        scope: "team",
        scopeId: "KC",
        tier: "companion",
        hideSpoilers: true,
      },
    ]);
    expect(out).toEqual([
      {
        momentId: "nfl-season-2026",
        scope: "team",
        scopeId: "KC",
        tier: "companion",
        hideSpoilers: true,
      },
    ]);
  });

  it("drops unplaceable garbage instead of crashing dispatch", () => {
    expect(
      migrateStoredAlerts([
        null,
        42,
        {},
        { kind: "team" }, // no id
        { momentId: "nba-playoffs-2025", scope: "team", scopeId: null }, // entity scope, no entity
      ])
    ).toEqual([]);
  });

  it("defaults an invalid tier to the fallback", () => {
    const out = migrateStoredAlerts(
      [{ kind: "team", id: "NYK", tier: "loud" }],
      "quiet"
    );
    expect(out[0].tier).toBe("quiet");
  });

  it("tolerates a non-array", () => {
    expect(migrateStoredAlerts(undefined)).toEqual([]);
    expect(migrateStoredAlerts("nope")).toEqual([]);
  });
});

describe("migrateStoredFollows (rows at rest)", () => {
  it("migrates legacy spoiler follows and drops garbage", () => {
    const out = migrateStoredFollows([
      { kind: "country", id: "USA" },
      { bogus: true },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].scope).toBe("country");
    expect(out[0].scopeId).toBe("USA");
  });
});
