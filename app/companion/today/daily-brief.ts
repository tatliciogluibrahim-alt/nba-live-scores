// Daily Brief — one calm sentence describing what Today is right now.
// Pure function. Structural copy only — never references outcome verbs,
// margins, scores, or forecast-flavored phrasing (see HANDOFF.md §10 for
// the full cut list). Selects from a small set of templates based on a
// strict priority order.

import { getCountry } from "../following/data/countries";
import type { Follow, PinnedGame } from "../state/types";
import type { TodayPayload } from "./today-data";

const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

// Hours and days remaining until kickoff. `daysUntilKickoff` rounds up;
// `hoursUntilKickoff` is used inside the final-24-hour window so we can
// switch from "tomorrow" to "tonight" copy as the moment approaches.
function daysUntilKickoff(now = new Date()): number | null {
  const ms = WC_KICKOFF.getTime() - now.getTime();
  if (ms <= 0) return null;
  return Math.ceil(ms / 86_400_000);
}

function hoursUntilKickoff(now = new Date()): number | null {
  const ms = WC_KICKOFF.getTime() - now.getTime();
  if (ms <= 0) return null;
  return Math.ceil(ms / 3_600_000);
}

/** True when WC is currently underway (any live or final WC fixture in
 *  the payload's up-next / quiet-wrap pipeline). The Today payload
 *  already filters by source, so we trust its booleans. */
function tournamentIsLive(payload: TodayPayload): boolean {
  return payload.youFollow.some(
    (f) => f.kind === "country" && f.tone === "live"
  );
}

export type DailyBriefInputs = {
  noSpoilers: boolean;
  follows: Follow[];
  pinned: PinnedGame[];
  payload: TodayPayload;
  now?: Date;
};

/** Priority order, top-down:
 *   1. No-Spoilers on            → mode summary
 *   2. Pinned games              → tracking summary
 *   3. Followed game live / today → personal radar
 *   4. Tournament intensifies     → countdown copy in the final week
 *   5. Followed WC country (calm) → tournament-personal far-from-kickoff
 *   6. No follows                 → onboarding nudge (WC countdown if close)
 *   7. Quiet day                  → calm acknowledgement
 *   8. Has follows, nothing imm.  → calm "we're set" line
 */
export function deriveDailyBrief({
  noSpoilers,
  follows,
  pinned,
  payload,
  now = new Date(),
}: DailyBriefInputs): string | null {
  // 1 ─ No-Spoilers mode is the highest-priority state.
  if (noSpoilers) {
    return "Scores hidden. Schedules stay visible.";
  }

  // 2 ─ Pinned games.
  if (pinned.length > 0) {
    if (pinned.length === 1) return "One game pinned for live tracking.";
    return `${pinned.length} games pinned for live tracking.`;
  }

  // 3 ─ Followed games live / today.
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

  const followedCountry = follows.find((f) => f.kind === "country");
  const wcDays = daysUntilKickoff(now);
  const wcHours = hoursUntilKickoff(now);

  // 4 ─ Tournament intensifies in the final week. Three distinct
  // states tighten the copy as kickoff approaches. Followed-country
  // users get country-flavored copy; everyone else gets the generic
  // "tournament starts" build-up.
  if (wcDays !== null && wcDays <= 7) {
    const country = followedCountry ? getCountry(followedCountry.id) : null;

    if (wcHours !== null && wcHours <= 6) {
      // Within 6 hours: "starts today"
      return country
        ? `World Cup starts today. ${country.name} kicks off the tournament soon.`
        : "World Cup starts today.";
    }

    if (wcDays <= 1) {
      // Day-of / within 24 hours
      return country
        ? `World Cup starts tomorrow. ${country.name}'s opener is set.`
        : "World Cup starts tomorrow.";
    }

    // 2–7 days out
    return country
      ? `${wcDays} days to first whistle. ${country.name} opens in Group ${country.group}.`
      : `World Cup starts in ${wcDays} days. Pick a country to make it personal.`;
  }

  // Tournament is underway — country has a live or final fixture.
  if (tournamentIsLive(payload) && followedCountry) {
    const country = getCountry(followedCountry.id);
    if (country) {
      return `${country.name} is live in the tournament now.`;
    }
  }

  // 5 ─ Followed WC country (far-from-kickoff calm state).
  if (followedCountry) {
    const country = getCountry(followedCountry.id);
    if (country) {
      return `${country.name} is in Group ${country.group}. We'll surface the opener when fixtures land.`;
    }
  }

  // 6 ─ No follows yet.
  if (follows.length === 0) {
    if (wcDays !== null && wcDays <= 60) {
      return `World Cup starts in ${wcDays} day${wcDays === 1 ? "" : "s"}. Pick a country to unlock kickoff alerts and the path to the final.`;
    }
    return "Pick a team or country to unlock kickoff alerts and the moments that matter.";
  }

  // 7 ─ Has follows, nothing live/today, day is quiet.
  if (payload.isQuietDay) {
    return "Quiet day. Nothing from your follows needs attention.";
  }

  // 8 ─ Default.
  return "Your follows are set. We'll surface only what matters.";
}
