"use client";

import { Display } from "../atoms/Display";
import { useFollows, useNoSpoilers, usePinned, useUserPrefs } from "../providers";
import { useTodayData } from "./use-today-data";
import { deriveDailyBrief } from "./daily-brief";
import { BriefCard } from "./BriefCard";
import { QuietRecap } from "./QuietRecap";
import { WorthCheckingNow } from "./sections/worth-checking-now";
import { YouFollow } from "./sections/you-follow";
import { UpNext } from "./sections/up-next";
import { QuietWrap } from "./sections/quiet-wrap";
import { ReminderRow } from "./sections/reminder-row";
import { CalmCard } from "./sections/calm-card";

// Today composition. One screen, three states layered on the same shape:
//   1. North Star — live hero + follows + up next + finals + reminder
//   2. No-Spoilers — same shape, score-hidden cards; inline toggle on header
//   3. Quiet day — no live → no hero, "Calm is a feature" payoff card
//
// Header is condensed in Stage 14E: "Today" + time + inline No-Spoilers
// toggle live on one row. The large banner is replaced by the inline
// chip + Daily Brief sentence — same contract, less chrome.

export function TodayClient() {
  const { payload, hydrated, updatedAt } = useTodayData();
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
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      {/* ── Header: "Today" + time + inline No-Spoilers toggle ──────── */}
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

        <NoSpoilersInlineToggle />
      </header>

      {/* Quiet Recap — end-of-night moment when the slate is fully wrapped.
          Renders above the Brief because it's the one card that earns
          interrupting the normal Today layout. Once-per-night. */}
      {hydrated ? <QuietRecap payload={payload} /> : null}

      {/* Daily Brief — calm sentence + optional routing CTA */}
      {brief ? <BriefCard brief={brief} /> : null}

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

// ── Inline No-Spoilers toggle ──────────────────────────────────────────
// Compact chip on the Today header. Stage 14F-4 swaps the system-flavored
// "NO-SPOILERS · ON/OFF" copy for action-based labels — "Show scores" when
// the mode is on (the tap reveals), "Hide scores" when it's off (the tap
// hides). A small dot keeps state legible at a glance without shouting.
// role="switch" + aria-checked still carries the state to screen readers.

function NoSpoilersInlineToggle() {
  const { prefs, setNoSpoilers, hydrated } = useUserPrefs();
  const on = prefs.noSpoilers;

  const label = on ? "Show scores" : "Hide scores";
  const a11y = on
    ? "Show scores by turning No-Spoilers off"
    : "Hide scores by turning No-Spoilers on";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={a11y}
      disabled={!hydrated}
      onClick={() => setNoSpoilers(!on)}
      className="no-noise-reveal-focus inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition active:scale-[0.97]"
      style={{
        background: on ? "var(--ink)" : "transparent",
        color: on ? "var(--cream)" : "var(--ink)",
        border: `1px solid ${on ? "var(--ink)" : "var(--line)"}`,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        minHeight: 28,
        opacity: hydrated ? 1 : 0.5,
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: on ? "var(--cream)" : "var(--mute-2)",
        }}
      />
      {label}
    </button>
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
