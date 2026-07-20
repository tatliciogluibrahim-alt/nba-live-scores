import { describe, it, expect } from "vitest";
import { migrateFollow, migrateFollowList } from "./follow-migration";
import type { FollowV2, LegacyFollow } from "./types";

function legacy(over: Partial<LegacyFollow> = {}): LegacyFollow {
  return {
    kind: "team",
    id: "NYK",
    alertEnabled: true,
    alertTier: "companion",
    followedAt: 1700000000000,
    ...over,
  };
}

describe("migrateFollow — the four legacy kinds, real ids", () => {
  it("team → nba-playoffs-2025 / team", () => {
    expect(migrateFollow(legacy())).toEqual({
      momentId: "nba-playoffs-2025",
      scope: "team",
      scopeId: "NYK",
      alertEnabled: true,
      alertTier: "companion",
      followedAt: 1700000000000,
    });
  });

  it("country → fifa-world-cup-2026 / country", () => {
    const f = migrateFollow(legacy({ kind: "country", id: "FRA" }))!;
    expect(f.momentId).toBe("fifa-world-cup-2026");
    expect(f.scope).toBe("country");
    expect(f.scopeId).toBe("FRA");
  });

  it("series → nba-playoffs-2025 / series", () => {
    const f = migrateFollow(legacy({ kind: "series", id: "OKC-SA" }))!;
    expect(f.momentId).toBe("nba-playoffs-2025");
    expect(f.scope).toBe("series");
    expect(f.scopeId).toBe("OKC-SA");
  });

  it("tournament → that exact id / all / null, for every known family", () => {
    for (const id of [
      "fifa-world-cup-2026",
      "nba-playoffs-2025",
      "nfl-season-2026",
    ]) {
      const f = migrateFollow(legacy({ kind: "tournament", id }))!;
      expect(f).toMatchObject({ momentId: id, scope: "all", scopeId: null });
    }
  });

  it("drops an unknown tournament family (never crashes, never guesses)", () => {
    expect(
      migrateFollow(legacy({ kind: "tournament", id: "ncaa-madness-2027" }))
    ).toBeNull();
  });

  it("carries hideSpoilers (selective No-Spoilers postdates the design doc)", () => {
    expect(migrateFollow(legacy({ hideSpoilers: true }))!.hideSpoilers).toBe(true);
    expect(migrateFollow(legacy())!.hideSpoilers).toBeUndefined();
  });

  it("falls back to deprecated alertPreset when alertTier is missing", () => {
    const raw = legacy({ alertPreset: "all" });
    delete (raw as Partial<LegacyFollow>).alertTier;
    expect(migrateFollow(raw)!.alertTier).toBe("all");
  });

  it("defaults tier to companion when neither field is usable", () => {
    const raw = legacy();
    delete (raw as Partial<LegacyFollow>).alertTier;
    expect(migrateFollow(raw)!.alertTier).toBe("companion");
  });
});

describe("migrateFollowList — blob-level safety", () => {
  const v2: FollowV2 = {
    momentId: "nfl-season-2026",
    scope: "team",
    scopeId: "BUF",
    alertEnabled: false,
    alertTier: "quiet",
    followedAt: 5,
  };

  it("migrates a v1 array and passes a v2 array through untouched (idempotent)", () => {
    const once = migrateFollowList([legacy(), legacy({ kind: "country", id: "USA" })]);
    expect(once).toHaveLength(2);
    expect(migrateFollowList(once)).toEqual(once);
    expect(migrateFollowList([v2])).toEqual([v2]);
  });

  it("handles a mixed array (mid-migration blob)", () => {
    const out = migrateFollowList([v2, legacy()]);
    expect(out.map((f) => f.momentId)).toEqual([
      "nfl-season-2026",
      "nba-playoffs-2025",
    ]);
  });

  it("drops junk entries and survives non-array input", () => {
    expect(migrateFollowList([null, 42, { hello: "x" }, legacy()])).toHaveLength(1);
    expect(migrateFollowList(undefined)).toEqual([]);
    expect(migrateFollowList("corrupt")).toEqual([]);
  });

  it("dedupes by moment+scope+entity, keeping the first record", () => {
    const a = legacy({ followedAt: 1 });
    const b = legacy({ followedAt: 2 });
    const out = migrateFollowList([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].followedAt).toBe(1);
  });

  it("rejects a v2-shaped record with an invalid scope", () => {
    expect(
      migrateFollowList([{ ...v2, scope: "franchise" }])
    ).toEqual([]);
  });
});
