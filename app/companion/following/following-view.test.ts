import { describe, it, expect } from "vitest";
import { buildFollowingView, tierStampProps } from "./following-view";
import type { FollowCardData } from "./FollowCard";
import type { AlertPreset, Follow, FollowKind } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";

// ── Test builders ──────────────────────────────────────────────────────

function makeFollow(over: Partial<Follow> = {}): Follow {
  const { kind = "country" as FollowKind, id = "USA", ...rest } = over;
  return {
    ...legacyRefToFollow(kind, id, {
      alertEnabled: true,
      alertTier: "companion" as AlertPreset,
      followedAt: 1,
    })!,
    ...rest,
  };
}

function makeCard(over: Partial<FollowCardData> = {}): FollowCardData {
  return {
    follow: makeFollow(over.follow),
    kindLabel: "Country · Summer Soccer",
    identityMark: "USA",
    name: "United States",
    detail: "Group D · Summer Soccer",
    ...over,
  };
}

// ── buildFollowingView ──────────────────────────────────────────────────

describe("buildFollowingView", () => {
  it("empty input yields three empty buckets", () => {
    const view = buildFollowingView([]);
    expect(view).toEqual({ liveNow: [], upNext: [], wrapped: [] });
  });

  it("routes a mixed set into live / up next / wrapped by state", () => {
    const live = makeCard({ name: "United States", isLive: true });
    const next = makeCard({ name: "Brazil" });
    const over = makeCard({ name: "Knicks vs Cavs", wrapped: true });

    const view = buildFollowingView([live, next, over]);

    expect(view.liveNow.map((c) => c.name)).toEqual(["United States"]);
    expect(view.upNext.map((c) => c.name)).toEqual(["Brazil"]);
    expect(view.wrapped.map((c) => c.name)).toEqual(["Knicks vs Cavs"]);
  });

  it("all-wrapped input puts everything in wrapped, nothing elsewhere", () => {
    const cards = [
      makeCard({ name: "A", wrapped: true }),
      makeCard({ name: "B", wrapped: true }),
    ];
    const view = buildFollowingView(cards);
    expect(view.wrapped.map((c) => c.name)).toEqual(["A", "B"]);
    expect(view.liveNow).toEqual([]);
    expect(view.upNext).toEqual([]);
  });

  it("live wins over wrapped (a live game outranks a wrapped season)", () => {
    const card = makeCard({ name: "Overtime", isLive: true, wrapped: true });
    const view = buildFollowingView([card]);
    expect(view.liveNow.map((c) => c.name)).toEqual(["Overtime"]);
    expect(view.wrapped).toEqual([]);
  });

  it("preserves input order within each bucket", () => {
    const cards = [
      makeCard({ name: "First" }),
      makeCard({ name: "Second" }),
      makeCard({ name: "Third" }),
    ];
    const view = buildFollowingView(cards);
    expect(view.upNext.map((c) => c.name)).toEqual(["First", "Second", "Third"]);
  });
});

// ── tierStampProps ──────────────────────────────────────────────────────

describe("tierStampProps (§4 fill ladder)", () => {
  it("alerts disabled → OFF / faint (regardless of stored tier)", () => {
    expect(
      tierStampProps(makeFollow({ alertEnabled: false, alertTier: "all" }))
    ).toEqual({ text: "OFF", variant: "faint" });
  });

  it("quiet tier → QUIET / outline", () => {
    expect(
      tierStampProps(makeFollow({ alertEnabled: true, alertTier: "quiet" }))
    ).toEqual({ text: "QUIET", variant: "outline" });
  });

  it("companion tier → COMPANION / filled", () => {
    expect(
      tierStampProps(makeFollow({ alertEnabled: true, alertTier: "companion" }))
    ).toEqual({ text: "COMPANION", variant: "filled" });
  });

  it("all tier → FULL / filledHeavy (abbreviates 'Full Details')", () => {
    expect(
      tierStampProps(makeFollow({ alertEnabled: true, alertTier: "all" }))
    ).toEqual({ text: "FULL", variant: "filledHeavy" });
  });
});
