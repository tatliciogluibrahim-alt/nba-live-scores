"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { NoSpoilersBanner } from "../spoiler/NoSpoilersBanner";
import { useFollows, useNoSpoilers, usePinned } from "../providers";
import { useTodayData } from "./use-today-data";
import { deriveDailyBrief } from "./daily-brief";
import { WorthCheckingNow } from "./sections/worth-checking-now";
import { YouFollow } from "./sections/you-follow";
import { UpNext } from "./sections/up-next";
import { QuietWrap } from "./sections/quiet-wrap";
import { ReminderRow } from "./sections/reminder-row";
import { CalmCard } from "./sections/calm-card";

// Today composition. One screen, three states layered on the same shape:
//   1. North Star — live hero + follows + up next + finals + reminder
//   2. No-Spoilers — same shape, score-hidden cards, banner at top
//   3. Quiet day — no live → no hero, "Calm is a feature" payoff card
//
// Provider state (useNoSpoilers + useFollows) drives the variation.
// The hero contract is "one earned moment per viewport" — never two.

export function TodayClient() {
  const { payload, hydrated, updatedAt } = useTodayData();
  const noSpoilers = useNoSpoilers();
  const { follows } = useFollows();
  const { pinned } = usePinned();

  // Daily Brief — one calm sentence summarizing today's app state.
  // Pure derivation; safe under No-Spoilers (handled inside the helper).
  const briefText = hydrated
    ? deriveDailyBrief({ noSpoilers, follows, pinned, payload })
    : null;

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      {/* Mood line — calm date/time tone, never a count of live games */}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <Eyebrow>{moodLine(payload.isQuietDay, noSpoilers)}</Eyebrow>
        {updatedAt ? (
          <Eyebrow color="var(--mute-2)">
            {updatedAt.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Eyebrow>
        ) : null}
      </div>

      <Display as="h1" size="lg" className="mb-2">
        Today.
      </Display>

      {/* Daily Brief — calm, one-sentence summary under the title */}
      {briefText ? (
        <p
          className="mb-4 text-[14px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {briefText}
        </p>
      ) : null}

      {/* No-Spoilers banner sits above the rest when the mode is on */}
      {noSpoilers ? (
        <div className="mb-4">
          <NoSpoilersBanner />
        </div>
      ) : null}

      {/* Loading shell — keep the page shape, fill with calm placeholder */}
      {!hydrated ? <LoadingShell /> : null}

      {/* North Star content (with No-Spoilers variant baked into sections) */}
      {hydrated ? (
        <div className="space-y-5">
          {payload.hero ? <WorthCheckingNow hero={payload.hero} /> : null}

          <YouFollow items={payload.youFollow} />

          <UpNext items={payload.upNext} />

          <QuietWrap items={payload.quietWrap} />

          {payload.reminder ? <ReminderRow reminder={payload.reminder} /> : null}

          {/* Quiet-day payoff: when nothing's live, nothing's next, nothing
              just wrapped — and the reminder isn't already filling the page. */}
          {payload.isQuietDay && !payload.reminder ? <CalmCard /> : null}
        </div>
      ) : null}
    </main>
  );
}

function moodLine(isQuiet: boolean, noSpoilers: boolean): string {
  if (noSpoilers) return "No-Spoilers mode";
  if (isQuiet) return "Quiet evening";
  return "Today";
}

function LoadingShell() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy>
      <div
        className="h-[120px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="h-[48px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="h-[68px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <span className="sr-only">Loading Today</span>
    </div>
  );
}
