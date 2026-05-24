// Daily Brief — one calm sentence describing what Today is right now,
// optionally paired with a single CTA so the Brief routes the user
// instead of just describing the state. Pure function. Structural copy
// only — never references outcome verbs, margins, scores, or
// forecast-flavored phrasing (see HANDOFF.md §10 for the full cut list).
// Selects from a small set of templates based on a strict priority order.
//
// Stage 15D: return shape grew from `string` to `DailyBrief`. The string
// branch is preserved as `brief.text` so consumers can fall back gracefully.

import { getCountry } from "../following/data/countries";
import type { Follow, PinnedGame } from "../state/types";
import type { TodayPayload } from "./today-data";

const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

// ── Output shape ──────────────────────────────────────────────────────

export type DailyBriefCta = {
  /** Short button label, sentence-case. Never imperative caps. */
  label: string;
  href: string;
};

export type DailyBrief = {
  /** The single calm sentence. Same string the old API returned. */
  text: string;
  /** Optional CTA — present when the Brief can route the user to the
   *  one thing they probably want. Absent on calm / onboarding states. */
  cta?: DailyBriefCta;
};

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
 *   2. Pinned games              → tracking summary + Watching route
 *   3. Followed game live / today → personal radar + game/Watching route
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
}: DailyBriefInputs): DailyBrief | null {
  // 1 ─ No-Spoilers mode is the highest-priority state.
  if (noSpoilers) {
    return { text: "Scores hidden. Schedules stay visible." };
  }

  // 2 ─ Pinned games.
  if (pinned.length > 0) {
    if (pinned.length === 1) {
      return {
        text: "One game pinned for live tracking.",
        cta: { label: "Open Watching", href: "/watching" },
      };
    }
    return {
      text: `${pinned.length} games pinned for live tracking.`,
      cta: { label: "Open Live Room", href: "/watching" },
    };
  }

  // 3 ─ Followed games live / today.
  const followedLive = payload.youFollow.filter((f) => f.tone === "live");
  if (followedLive.length > 0) {
    const text =
      followedLive.length === 1
        ? "One followed game is live now."
        : `${followedLive.length} followed games are live now.`;
    const cta: DailyBriefCta =
      followedLive.length === 1
        ? { label: "Open the live game", href: followedLive[0].href }
        : { label: "Open Live Room", href: "/watching" };
    return { text, cta };
  }

  const followedToday = payload.youFollow.filter(
    (f) => f.tone === "upcoming" && /tonight/i.test(f.statusLabel)
  );
  if (followedToday.length > 0) {
    const text =
      followedToday.length === 1
        ? "One game on your radar tonight."
        : `${followedToday.length} games on your radar tonight.`;
    const cta: DailyBriefCta =
      followedToday.length === 1
        ? { label: "See tonight's game", href: followedToday[0].href }
        : { label: "See tonight's games", href: "/following" };
    return { text, cta };
  }

  const followedCountry = follows.find((f) => f.kind === "country");
  const wcDays = daysUntilKickoff(now);
  const wcHours = hoursUntilKickoff(now);

  // 4 ─ Tournament intensifies in the final week.
  if (wcDays !== null && wcDays <= 7) {
    const country = followedCountry ? getCountry(followedCountry.id) : null;

    if (wcHours !== null && wcHours <= 6) {
      return {
        text: country
          ? `World Cup starts today. ${country.name} kicks off the tournament soon.`
          : "World Cup starts today.",
        cta: country
          ? { label: `Open ${country.name}`, href: `/country/${country.id}` }
          : { label: "See countries", href: "/following/country" },
      };
    }

    if (wcDays <= 1) {
      return {
        text: country
          ? `World Cup starts tomorrow. ${country.name}'s opener is set.`
          : "World Cup starts tomorrow.",
        cta: country
          ? { label: `Open ${country.name}`, href: `/country/${country.id}` }
          : { label: "Pick a country", href: "/following/country" },
      };
    }

    return {
      text: country
        ? `${wcDays} days to first whistle. ${country.name} opens in Group ${country.group}.`
        : `World Cup starts in ${wcDays} days. Pick a country to make it personal.`,
      cta: country
        ? { label: `Open ${country.name}`, href: `/country/${country.id}` }
        : { label: "Pick a country", href: "/following/country" },
    };
  }

  // Tournament is underway — country has a live or final fixture.
  if (tournamentIsLive(payload) && followedCountry) {
    const country = getCountry(followedCountry.id);
    if (country) {
      return {
        text: `${country.name} is live in the tournament now.`,
        cta: { label: `Open ${country.name}`, href: `/country/${country.id}` },
      };
    }
  }

  // 5 ─ Followed WC country (far-from-kickoff calm state).
  if (followedCountry) {
    const country = getCountry(followedCountry.id);
    if (country) {
      return {
        text: `${country.name} is in Group ${country.group}. We'll surface the opener when fixtures land.`,
        cta: { label: `Open ${country.name}`, href: `/country/${country.id}` },
      };
    }
  }

  // 6 ─ No follows yet.
  if (follows.length === 0) {
    if (wcDays !== null && wcDays <= 60) {
      return {
        text: `World Cup starts in ${wcDays} day${wcDays === 1 ? "" : "s"}. Pick a country to unlock kickoff alerts and the path to the final.`,
        cta: { label: "Pick a country", href: "/following/country" },
      };
    }
    return {
      text: "Pick a team or country to unlock kickoff alerts and the moments that matter.",
      cta: { label: "Start following", href: "/following/add" },
    };
  }

  // 7 ─ Has follows, nothing live/today, day is quiet.
  if (payload.isQuietDay) {
    return { text: "Quiet day. Nothing from your follows needs attention." };
  }

  // 8 ─ Default.
  return { text: "Your follows are set. We'll surface only what matters." };
}
