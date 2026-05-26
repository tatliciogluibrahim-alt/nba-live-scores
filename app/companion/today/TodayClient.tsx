"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { PullToRefresh } from "../atoms/PullToRefresh";
import { useFollows, useNoSpoilers, usePinned } from "../providers";
import { useTodayData } from "./use-today-data";
import { deriveDailyBrief } from "./daily-brief";
import { BriefCard } from "./BriefCard";
import { EnableNotificationsCard } from "./EnableNotificationsCard";
import { FirstRunStrip } from "./FirstRunStrip";
import { QuietRecap } from "./QuietRecap";
import { WorthCheckingNow } from "./sections/worth-checking-now";
import { YouFollow } from "./sections/you-follow";
import { UpNext } from "./sections/up-next";
import { QuietWrap } from "./sections/quiet-wrap";
import { ReminderRow } from "./sections/reminder-row";
import { CalmCard } from "./sections/calm-card";

// Today composition. One screen, three states layered on the same shape:
//   1. North Star — live hero + follows + up next + finals + reminder
//   2. No-Spoilers — same shape, score-hidden cards; passive dot in header
//   3. Quiet day — no live → no hero, "Calm is a feature" payoff card
//
// No-Spoilers is configured once in Watch + Alerts (Settings), not toggled
// per-visit. When active, a small muted dot in the Today header confirms
// the mode without demanding interaction. The old inline chip is gone.

export function TodayClient() {
  const { payload, hydrated, updatedAt, refetch } = useTodayData();
  const noSpoilers = useNoSpoilers();
  const { follows } = useFollows();
  const { pinned } = usePinned();

  // Daily Brief — one calm sentence summarizing today's app state, plus
  // an optional CTA so the Brief can route the user to the single most
  // relevant surface. Under No-Spoilers, priority-1 returns the "Scores
  // hidden..." line with no CTA, so the inline toggle + brief together
  // replace the old standalone banner.
  const brief = hydrated
    ? deriveDailyBrief({ noSpoilers, follows, pinned, payload })
    : null;

  return (
    <PullToRefresh onRefresh={refetch}>
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      {/* ── Header: "Today" + time + passive No-Spoilers indicator ─── */}
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <Display as="h1" size="md">
            Today
          </Display>
          {updatedAt ? (
            <span
              aria-label={`Updated at ${updatedAt.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}`}
              className="text-[11px] uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--mute-1)",
              }}
            >
              {updatedAt.toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : null}
        </div>

        {/* Ambient No-Spoilers indicator — only shown when active.
            Passive status display, not a toggle. The app shouldn't
            ask the user to make a scores decision every time they
            open Today. Configure it once in Watch + Alerts. */}
        <NoSpoilersAmbientDot />
      </header>

      {/* First-run onboarding — the 3-card checklist that shows
          until the user has followed, pinned, and made a notification
          decision. Auto-retires when all three are done. */}
      {hydrated ? <FirstRunStrip /> : null}

      {/* Quiet Recap — end-of-night moment when the slate is fully wrapped.
          Renders above the Brief because it's the one card that earns
          interrupting the normal Today layout. Once-per-night. */}
      {hydrated ? <QuietRecap payload={payload} /> : null}

      {/* Daily Brief — calm sentence + optional routing CTA */}
      {brief ? <BriefCard brief={brief} /> : null}

      {/* Enable Notifications — Stage A push pass. Renders below the
          Brief so a fresh-install user sees it without it competing
          with the Brief itself. Internally bails if permission is
          already decided or the user dismissed. */}
      <EnableNotificationsCard />

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
    </PullToRefresh>
  );
}

// ── Ambient No-Spoilers indicator ─────────────────────────────────────
// Passive status dot. Only renders when No-Spoilers is on — its absence
// is the signal that scores are visible, so there's nothing to show when
// the mode is off. Tapping takes you to Watch + Alerts to change it.
// Deliberately low visual weight: muted color, small type, no border,
// no filled background. The app should not prompt a scores decision
// every time Today opens.

function NoSpoilersAmbientDot() {
  const noSpoilers = useNoSpoilers();
  if (!noSpoilers) return null;

  return (
    <Link
      href="/settings"
      aria-label="Scores hidden — open Watch + Alerts to change"
      className="no-noise-reveal-focus inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1"
      style={{ color: "var(--mute-1)" }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--mute-2)" }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          // Aligned to canonical Eyebrow letter-spacing (0.12em) so
          // every caps-mono micro-label on Today reads as one
          // consistent system, not two different styles.
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Scores hidden
      </span>
    </Link>
  );
}

function LoadingShell() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy>
      <div
        className="no-noise-pulse h-[120px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="no-noise-pulse h-[48px] rounded-[14px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          animationDelay: "0.15s",
        }}
      />
      <div
        className="no-noise-pulse h-[68px] rounded-[14px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          animationDelay: "0.3s",
        }}
      />
      <span className="sr-only">Loading Today</span>
    </div>
  );
}
