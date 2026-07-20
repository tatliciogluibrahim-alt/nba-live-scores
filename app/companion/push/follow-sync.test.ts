import { describe, expect, it } from "vitest";
import type { Follow } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";
import { buildFollowSyncState, followSyncHash } from "./follow-sync";

function follow(over: Partial<Follow> & Pick<Follow, "kind" | "id">): Follow {
  const { kind, id, ...rest } = over;
  return {
    ...legacyRefToFollow(kind, id, {
      alertEnabled: false,
      alertTier: "companion",
      followedAt: 1,
    })!,
    ...rest,
  };
}

describe("shared web + Capacitor follow sync", () => {
  it("puts an alert-enabled hidden team inline and does not duplicate it", () => {
    const state = buildFollowSyncState([
      follow({
        kind: "team",
        id: "OKC",
        alertEnabled: true,
        alertTier: "all",
        hideSpoilers: true,
      }),
    ]);

    expect(state).toEqual({
      alerts: [
        { kind: "team", id: "OKC", tier: "all", hideSpoilers: true },
      ],
      spoilerFollows: [],
    });
  });

  it("syncs hidden country and series identities even without alert slots", () => {
    const state = buildFollowSyncState([
      follow({ kind: "country", id: "BRA", hideSpoilers: true }),
      follow({ kind: "series", id: "OKC-SA", hideSpoilers: true }),
    ]);

    expect(state.alerts).toEqual([]);
    expect(state.spoilerFollows).toEqual([
      { kind: "country", id: "BRA" },
      { kind: "series", id: "OKC-SA" },
    ]);
  });

  it("excludes tournament selective hiding and unrelated visible-only state", () => {
    const state = buildFollowSyncState([
      follow({
        kind: "tournament",
        id: "nba-playoffs-2026",
        hideSpoilers: true,
      }),
      follow({ kind: "team", id: "NYK" }),
    ]);

    expect(state).toEqual({ alerts: [], spoilerFollows: [] });
  });

  it("retains a tournament alert but strips its unsupported hide marker", () => {
    const state = buildFollowSyncState([
      follow({
        kind: "tournament",
        id: "nba-playoffs-2026",
        alertEnabled: true,
        hideSpoilers: true,
      }),
    ]);

    expect(state).toEqual({
      alerts: [
        {
          kind: "tournament",
          id: "nba-playoffs-2026",
          tier: "companion",
        },
      ],
      spoilerFollows: [],
    });
  });

  it("changes the transport hash when only selective hiding changes", () => {
    const shown = buildFollowSyncState([
      follow({ kind: "team", id: "OKC", alertEnabled: true }),
    ]);
    const hidden = buildFollowSyncState([
      follow({
        kind: "team",
        id: "OKC",
        alertEnabled: true,
        hideSpoilers: true,
      }),
    ]);

    expect(followSyncHash(shown)).not.toBe(followSyncHash(hidden));
  });
});
