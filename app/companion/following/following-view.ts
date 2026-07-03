// Pure view builders for the Following surface (System D, D3 Task 2).
//
// These carry no React, no data fetching — just the shaping the mobile
// composition renders from. Kept separate from FollowingDashboard so the
// bucket logic and the §4 tier-stamp mapping are unit-tested in isolation.

import type { Follow } from "../state/types";
import type { FollowCardData } from "./FollowCard";

export type FollowingView = {
  liveNow: FollowCardData[];
  upNext: FollowCardData[];
  wrapped: FollowCardData[];
};

// Regroup the follow cards into the three locked mobile sections. This is
// the same activity-state split FollowGroups uses (Live now / Coming up /
// Season over), reproduced here under the D3 names so the mobile column and
// the legacy desktop grid stay in lockstep. Order is preserved within each
// bucket. A live game outranks a wrapped season (a wrapped series that's
// somehow live still reads as "live now"), matching bucketOf's precedence.
export function buildFollowingView(cards: FollowCardData[]): FollowingView {
  const liveNow: FollowCardData[] = [];
  const upNext: FollowCardData[] = [];
  const wrapped: FollowCardData[] = [];

  for (const c of cards) {
    if (c.isLive) liveNow.push(c);
    else if (c.wrapped) wrapped.push(c);
    else upNext.push(c);
  }

  return { liveNow, upNext, wrapped };
}

export type TierStampVariant = "faint" | "outline" | "filled" | "filledHeavy";
export type TierStampText = "OFF" | "QUIET" | "COMPANION" | "FULL";

// §4 fill ladder. The stamp does the semantic work — it IS the alert state:
//   alerts off      → OFF        / faint       (mute border + mute text)
//   quiet tier      → QUIET      / outline     (ink border + ink text)
//   companion tier  → COMPANION  / filled      (ink fill)
//   all tier        → FULL       / filledHeavy (ink fill, heavier weight)
// "FULL" abbreviates the locked label "Full Details" for the row stamp; the
// legend (Task 3) spells it out. Internal keys (quiet|companion|all) are
// unchanged — this only maps them to display text + a Stamp variant.
export function tierStampProps(follow: Follow): {
  text: TierStampText;
  variant: TierStampVariant;
} {
  if (!follow.alertEnabled) return { text: "OFF", variant: "faint" };
  if (follow.alertTier === "quiet") return { text: "QUIET", variant: "outline" };
  if (follow.alertTier === "companion")
    return { text: "COMPANION", variant: "filled" };
  // "all" — the comprehensive tier.
  return { text: "FULL", variant: "filledHeavy" };
}
