// Synthetic subscribers for the replay lab. Each profile is the exact
// preference shape the dispatcher matches against (alerts + No-Spoilers),
// so a replayed delivery is what a real device with that setup receives.

import { MOMENTS } from "../../../companion/state/moments";
import { PRESETS, type AlertPreset } from "../../../companion/state/types";
import type { subscriberWantsEvent } from "../dispatcher";

export type ReplayPlatform = "ios" | "web";

/** The dispatcher's subscriber shape, plus the iOS lock-screen offer
 *  toggle (undefined = on, matching ios-token-store's default). */
export type ReplayPrefs = Parameters<typeof subscriberWantsEvent>[0] & {
  lockScreenOffers?: boolean;
};

export type ReplayProfile = {
  id: string;
  label: string;
  platform: ReplayPlatform;
  prefs: ReplayPrefs;
};

type Opts = { platform?: ReplayPlatform; noSpoilers?: boolean };

const NFL_MOMENT = MOMENTS.find((m) => m.sport === "nfl");
if (!NFL_MOMENT) throw new Error("replay: no NFL moment in MOMENTS");
const NFL_MOMENT_ID = NFL_MOMENT.id;

const TIERS: AlertPreset[] = ["quiet", "companion", "all"];

function suffix(platform: ReplayPlatform, noSpoilers: boolean) {
  return {
    id: `.${platform}${noSpoilers ? ".ns" : ""}`,
    label: ` · ${platform === "ios" ? "iPhone" : "Web"}${noSpoilers ? " · No-Spoilers" : ""}`,
  };
}

/** A follow on one or more teams, all at the same tier. */
export function teamProfile(
  teams: string | string[],
  tier: AlertPreset,
  { platform = "ios", noSpoilers = false }: Opts = {}
): ReplayProfile {
  const list = Array.isArray(teams) ? teams : [teams];
  const s = suffix(platform, noSpoilers);
  return {
    id: `${list.join("+")}.${tier}${s.id}`,
    label: `${list.join(" + ")} · ${PRESETS[tier].label}${s.label}`,
    platform,
    prefs: {
      alerts: list.map((team) => ({
        momentId: NFL_MOMENT_ID,
        scope: "team" as const,
        scopeId: team,
        tier,
      })),
      noSpoilers,
    },
  };
}

/** The whole-season follow ("Every week, every game"). */
export function seasonProfile(
  tier: AlertPreset,
  { platform = "ios", noSpoilers = false }: Opts = {}
): ReplayProfile {
  const s = suffix(platform, noSpoilers);
  return {
    id: `season.${tier}${s.id}`,
    label: `Whole season · ${PRESETS[tier].label}${s.label}`,
    platform,
    prefs: {
      alerts: [{ momentId: NFL_MOMENT_ID, scope: "all", scopeId: null, tier }],
      noSpoilers,
    },
  };
}

/** Every profile worth reading for one game: each side and the season
 *  follow at every tier on both platforms, plus No-Spoilers on iPhone for
 *  the two tiers that carry scores and names. */
export function standardGameProfiles(awayCode: string, homeCode: string): ReplayProfile[] {
  const out: ReplayProfile[] = [];
  for (const tier of TIERS) {
    for (const platform of ["ios", "web"] as const) {
      out.push(teamProfile(awayCode, tier, { platform }));
      out.push(teamProfile(homeCode, tier, { platform }));
      out.push(seasonProfile(tier, { platform }));
    }
  }
  for (const tier of ["companion", "all"] as const) {
    out.push(teamProfile(awayCode, tier, { noSpoilers: true }));
    out.push(teamProfile(homeCode, tier, { noSpoilers: true }));
  }
  return out;
}
