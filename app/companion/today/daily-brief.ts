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

  // 2 ─ Pinned games. Branch by the actual status of each pinned game
  // via payload.pinnedSummary. Pre-fix this branch said "pinned for
  // later" for any pin regardless of status, so a wrapped game from
  // last night would mis-classify as upcoming. The summary buckets
  // each pin by live / upcoming / final / unresolved and the brief
  // picks copy + CTA from there.
  //
  // Dedupe: when the first Up Next card is also a pin, skip the brief
  // (avoid telling the user about a card that's already on screen).
  // Only applies when the pin is upcoming — a wrapped pin and a
  // separate upcoming Up Next card are different things and both
  // earn their slot.
  const summary = payload.pinnedSummary;
  if (pinned.length > 0 && summary.total > 0) {
    const firstUpNextPinned = payload.upNext[0]?.pinned === true;

    // ── Live pins win first. Most urgent state.
    if (summary.live > 0) {
      const text =
        summary.total === 1
          ? "One pinned game is live."
          : summary.live === summary.total
            ? `${summary.live} pinned games live now.`
            : `${summary.total} pinned games — ${summary.live === 1 ? "one is" : `${summary.live} are`} live.`;
      return {
        text,
        cta: { label: "Open Watching", href: "/watching" },
      };
    }

    // ── Upcoming pins. The "pinned for later" copy that was the
    // original buggy default. Only fires when at least one pin is
    // actually upcoming.
    //
    // Dedupe: when the upcoming pin is ALSO the first Up Next card,
    // we drop the CTA (avoids two tap targets pointing at the same
    // game) but keep the sentence — that's a specific calm signal at
    // the top of the screen, much better than falling through to the
    // generic "Your follows are set." default.
    if (summary.upcoming > 0) {
      const text =
        summary.upcoming === 1 && summary.total === 1
          ? "One game pinned for later."
          : summary.upcoming === summary.total
            ? `${summary.upcoming} games pinned for later.`
            : // Mixed (e.g. 1 upcoming + 1 final). Lead with the
              // actionable upcoming count without burying the rest.
              `${summary.upcoming} of ${summary.total} pinned games coming up.`;
      if (firstUpNextPinned) {
        return { text };
      }
      return {
        text,
        cta: { label: "Open Watching", href: "/watching" },
      };
    }

    // ── All-final case (no live, no upcoming, ≥1 final). This is
    // the wrapped-pin path that pre-fix never existed.
    if (summary.final > 0 && summary.upcoming === 0) {
      const text =
        summary.total === 1
          ? "Your pinned game wrapped."
          : `${summary.final} pinned games wrapped.`;
      // Single wrapped pin gets a direct deep link to its recap.
      // Multiple wrapped pins route through Watching where the user
      // can pick.
      const href =
        summary.total === 1 && summary.primary
          ? summary.primary.href
          : "/watching";
      return {
        text,
        cta: { label: "View recap", href },
      };
    }

    // ── All-unresolved case (no live, no upcoming, no final). The
    // pin(s) aren't in any feed window — they may still resolve via
    // the snapshot fallback on Watching, so route there.
    if (summary.unresolved > 0 && summary.live === 0 && summary.upcoming === 0 && summary.final === 0) {
      return {
        text:
          summary.unresolved === 1
            ? "Pinned game unavailable."
            : `${summary.unresolved} pinned games unavailable.`,
        cta: { label: "Open Watching", href: "/watching" },
      };
    }

    // Upcoming pin already visible as the first Up Next card — fall
    // through so a lower-priority Brief (tournament countdown, etc.)
    // can take this slot instead of repeating the same card to the
    // user. Original dedupe behavior preserved.
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

  // 4b ─ Pre-tournament awareness window (8–30 days). Removed in a
  // post-Phase-8 polish pass: the bottom ReminderRow already says
  // exactly the same thing ("USA kick off in 17 days. Group draw is
  // set.") and the brief copy was stacking redundantly on top of it.
  // Letting the brief fall through to the calmer default ("Your
  // follows are set.") gives the reminder the floor for WC
  // anticipation in this window and frees up Today's top of frame.
  //
  // Final-week brief (≤7 days, priority 4 above) and kickoff-day hero
  // (≤24h, in pickHero) still earn the top slot — those are the
  // genuinely time-sensitive states.

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
  //
  // We used to surface "USA is in Group X" + "Open USA" here, but on
  // pre-tournament days that line stacks directly above the bottom
  // ReminderRow ("USA kick off in N days. Group draw is set.") — same
  // information, same destination, two cards' worth of vertical real
  // estate. Falling through to the calmer "Your follows are set."
  // default lets the reminder be the one place that talks about the
  // tournament.

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
