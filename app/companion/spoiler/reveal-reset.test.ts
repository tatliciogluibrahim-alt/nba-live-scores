import { describe, expect, it } from "vitest";
import type { Follow, FollowKind } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";
import {
  selectiveHiddenFollowKey,
  shouldResetRevealLevels,
  type RevealPrivacyState,
} from "./reveal-reset";

function follow(
  kind: FollowKind,
  id: string,
  hideSpoilers?: boolean
): Follow {
  return {
    ...legacyRefToFollow(kind, id, {
      alertEnabled: true,
      alertTier: "companion",
      followedAt: 1,
    })!,
    hideSpoilers,
  };
}

function privacy(
  globalNoSpoilers: boolean,
  follows: readonly Follow[] = []
): RevealPrivacyState {
  return {
    globalNoSpoilers,
    selectiveHiddenFollowKey: selectiveHiddenFollowKey(follows),
  };
}

describe("reveal reset policy", () => {
  it("resets when global No-Spoilers turns on", () => {
    expect(shouldResetRevealLevels(privacy(false), privacy(true))).toBe(true);
  });

  it("does not reset merely because global No-Spoilers turns off", () => {
    expect(shouldResetRevealLevels(privacy(true), privacy(false))).toBe(false);
  });

  it("resets when a selective hidden follow is added or toggled on", () => {
    const hidden = follow("team", "NYK", true);
    expect(shouldResetRevealLevels(privacy(false), privacy(false, [hidden]))).toBe(
      true
    );
    expect(
      shouldResetRevealLevels(
        privacy(false, [follow("team", "NYK", false)]),
        privacy(false, [hidden])
      )
    ).toBe(true);
  });

  it("does not re-hide unrelated games when selective privacy is removed", () => {
    const team = follow("team", "NYK", true);
    const country = follow("country", "ENG", true);
    expect(
      shouldResetRevealLevels(
        privacy(false, [team, country]),
        privacy(false, [country])
      )
    ).toBe(false);
    expect(
      shouldResetRevealLevels(privacy(false, [country]), privacy(false))
    ).toBe(false);
  });

  it("treats reordered hidden follows as the same set", () => {
    const team = follow("team", "NYK", true);
    const country = follow("country", "ENG", true);
    expect(
      shouldResetRevealLevels(
        privacy(false, [team, country]),
        privacy(false, [country, team])
      )
    ).toBe(false);
  });

  it("treats duplicate normalized entries as one hidden follow", () => {
    const team = follow("team", "NYK", true);
    expect(
      shouldResetRevealLevels(
        privacy(false, [team]),
        privacy(false, [team, follow("team", "nyk", true)])
      )
    ).toBe(false);
  });

  it("ignores changes to follows that are not selectively hidden", () => {
    expect(
      shouldResetRevealLevels(
        privacy(false, [follow("team", "NYK", false)]),
        privacy(false, [follow("team", "BOS", false)])
      )
    ).toBe(false);
  });
});
