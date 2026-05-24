// Daily Brief — one calm sentence describing what Today is right now.
// Pure function. Structural copy only — never references outcome verbs,
// margins, scores, or forecast-flavored phrasing (see HANDOFF.md §10 for
// the full cut list). Selects from a small set of templates based on a
// strict priority order.

import { getCountry } from "../following/data/countries";
import type { Follow, PinnedGame } from "../state/types";
import type { TodayPayload } from "./today-data";

const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

function daysUntilKickoff(now = new Date()): number | null {
  const ms = WC_KICKOFF.getTime() - now.getTime();
  if (ms <= 0) return null;
  return Math.ceil(ms / 86_400_000);
}

export type DailyBriefInputs = {
  noSpoilers: boolean;
  follows: Follow[];
  pinned: PinnedGame[];
  payload: TodayPayload;
  now?: Date;
};

/** Priority order, top-down:
 *   1. No-Spoilers on  → mode summary
 *   2. Pinned games    → tracking summary
 *   3. Followed game live / today  → personal radar
 *   4. Followed WC country  → tournament-personal
 *   5. No follows       → onboarding nudge (WC countdown if close)
 *   6. Quiet day        → calm acknowledgement
 *   7. Has follows, nothing immediate  → calm "we're set" line
 *
 *  Returns null only when there's truly nothing to say (we always have
 *  one of the above buckets in practice, but the contract allows null).
 */
export function deriveDailyBrief({
  noSpoilers,
  follows,
  pinned,
  payload,
  now = new Date(),
}: DailyBriefInputs): string | null {
  // 1 ─ No-Spoilers mode is the highest-priority state. Its sentence
  //     mirrors the banner so users see one consistent contract.
  if (noSpoilers) {
    return "Scores hidden. Schedules stay visible.";
  }

  // 2 ─ Pinned games. Singular vs plural; no live/upcoming split per spec.
  if (pinned.length > 0) {
    if (pinned.length === 1) return "One game pinned for live tracking.";
    return `${pinned.length} games pinned for live tracking.`;
  }

  // 3 ─ Followed games today. Lean on the youFollow status the payload
  //     already computed so we don't rebuild the date math here.
  const followedLive = payload.youFollow.filter((f) => f.tone === "live");
  if (followedLive.length > 0) {
    return followedLive.length === 1
      ? "One followed game is live now."
      : `${followedLive.length} followed games are live now.`;
  }

  const followedToday = payload.youFollow.filter(
    (f) => f.tone === "upcoming" && /tonight/i.test(f.statusLabel)
  );
  if (followedToday.length > 0) {
    return followedToday.length === 1
      ? "One game on your radar tonight."
      : `${followedToday.length} games on your radar tonight.`;
  }

  // 4 ─ Followed World Cup country (specific country + group).
  const followedCountry = follows.find((f) => f.kind === "country");
  if (followedCountry) {
    const country = getCountry(followedCountry.id);
    if (country) {
      return `${country.name} is in Group ${country.group}. We'll surface the opener when fixtures land.`;
    }
  }

  const wcDays = daysUntilKickoff(now);

  // 5 ─ No follows yet. If WC is close, pitch the country pick; otherwise
  //     onboard to Following. Empty-state copy sells the *benefit*
  //     ("unlock alerts and the path to the final") rather than just
  //     asking for input.
  if (follows.length === 0) {
    if (wcDays !== null && wcDays <= 60) {
      return `World Cup starts in ${wcDays} day${wcDays === 1 ? "" : "s"}. Pick a country to unlock kickoff alerts and the path to the final.`;
    }
    return "Pick a team or country to unlock kickoff alerts and the moments that matter.";
  }

  // 6 ─ Has follows, nothing live/today, day is quiet.
  if (payload.isQuietDay) {
    return "Quiet day. Nothing from your follows needs attention.";
  }

  // 7 ─ Has follows, has something coming up later, no specific bucket.
  return "Your follows are set. We'll surface only what matters.";
}
