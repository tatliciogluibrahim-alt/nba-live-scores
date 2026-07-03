"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { PullToRefresh } from "../atoms/PullToRefresh";
import { Masthead } from "../system/Masthead";
import { useFollows, useNoSpoilers } from "../providers";
import { useTodayData } from "./use-today-data";
import { deriveTodayHeadline } from "./today-data";
import { FrontPageLead } from "./FrontPageLead";
import { LiveTrackHint } from "./LiveTrackHint";
import { DesktopScoreboard } from "./DesktopScoreboard";
import { AlsoLiveBand } from "./AlsoLiveBand";
import { RestingState } from "./RestingState";
import { BriefPromptCard } from "./BriefPromptCard";
import { useSetupStep } from "./setup/useSetupStep";
import { SetupCard } from "./setup/SetupCard";
import { FirstFollowTierCard } from "../follow/FirstFollowTierCard";
import { QuietRecap } from "./QuietRecap";
import { YouFollow } from "./sections/you-follow";
import { UpNext } from "./sections/up-next";
import { QuietWrap } from "./sections/quiet-wrap";
import { ReminderRow } from "./sections/reminder-row";
import { CalmCard } from "./sections/calm-card";
import { CalmEndCard } from "./sections/calm-end-card";
import { KnockoutMomentCard } from "./sections/knockout-moment-card";

// Today composition. One screen, three states layered on the same shape:
//   1. North Star — live hero + follows + up next + finals + reminder
//   2. No-Spoilers — same shape, score-hidden cards; passive dot in header
//   3. Quiet day — no live → no hero, "Calm is a feature" payoff card
//
// No-Spoilers is configured once in Alerts & Notifications (Settings), not toggled
// per-visit. When active, a small muted dot in the Today header confirms
// the mode without demanding interaction. The old inline chip is gone.

export function TodayClient() {
  const { payload, hydrated, updatedAt, refetch } = useTodayData();
  const { follows, removeFollow } = useFollows();

  // Auto-drop a dead series follow when its series wraps. The data layer
  // sets payload.closing.autoDropFollow only for the SERIES follow (team
  // follows are left alone so they can ride into the next round). Frees
  // the alert slot automatically per the Finals-era alerts principles.
  // Guarded by a ref so a re-render doesn't re-attempt after the follow
  // is gone, and only fires if the follow still exists.
  const droppedRef = useRef<Set<string>>(new Set());
  const autoDrop = payload.closing?.autoDropFollow;
  useEffect(() => {
    if (!hydrated || !autoDrop) return;
    if (droppedRef.current.has(autoDrop.id)) return;
    const stillFollowed = follows.some(
      (f) => f.kind === "series" && f.id === autoDrop.id
    );
    if (!stillFollowed) return;
    droppedRef.current.add(autoDrop.id);
    removeFollow("series", autoDrop.id);
  }, [hydrated, autoDrop, follows, removeFollow]);

  // Front Page lead (Concept A) — a punchy state headline + accent
  // eyebrow + a single condensed deck card for the lead game. Replaces
  // the conversational Daily Brief sentence as the editorial top of the
  // screen, and absorbs the live hero (the deck IS the lead game).
  const lead = hydrated ? deriveTodayHeadline(payload) : null;
  // Desktop scoreboard: the dense at-a-glance grid. Replaces the single
  // calm lead on desktop when there are games to show; mobile + desktop-
  // quiet keep the lead.
  const scoreboard = hydrated ? payload.scoreboard : [];
  const hasScoreboard = scoreboard.length > 0;
  // System D mobile composition (Task 7): the lead Monument shows the one
  // game worth checking now; the ALSO LIVE ink band carries every OTHER live
  // followed game as board rows below it. A single hero can't represent a
  // multi-live slate on its own — the band is what makes the rest visible
  // without leaving the calm single-lead shape. liveCount also drives the
  // Masthead "N LIVE →". Desktop (md+) keeps the DesktopScoreboard grid.
  const liveCount = scoreboard.filter((t) => t.status === "live").length;
  const setup = useSetupStep();

  return (
    <PullToRefresh onRefresh={refetch}>
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6 2xl:max-w-7xl">
      {/* ── Masthead. System D broadsheet nameplate on mobile (date ·
          BrandMark + "No Noise" wordmark · N LIVE →), the passive
          No-Spoilers dot carried in the right slot. Stable sr-only h1
          keeps the landmark. Desktop (md+) keeps the legacy date-row
          header untouched (the sidebar carries the brand there, and D4
          owns the desktop restyle) so the md+ shot stays pixel-identical.
          The lead-monument swap that pairs with this masthead is blocked
          on a data-source decision — see .superpowers/sdd/task-6-report.md. */}
      <h1 className="sr-only">Today</h1>

      {/* Mobile: the System D masthead. -mx-4 bleeds the 2px rule to the
          screen edges within the page's px-4 gutter. */}
      <div className="md:hidden -mx-4 mb-5">
        <Masthead liveCount={liveCount} rightExtra={<NoSpoilersAmbientDot />} />
      </div>

      {/* Desktop: legacy date-row header, unchanged (pixel-identical for
          D4). Brand lives in the sidebar on desktop, so no wordmark here. */}
      <header
        className="hidden md:flex -mx-4 mb-5 items-center justify-between gap-2 border-b px-4 pb-3"
        style={{
          borderColor: "var(--line)",
          paddingTop: "max(env(safe-area-inset-top), 10px)",
        }}
      >
        <p
          className="flex-1 text-[11px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "var(--mute-1)",
          }}
          aria-label={
            updatedAt
              ? `Today, updated ${updatedAt.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : "Today"
          }
        >
          {updatedAt
            ? updatedAt.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Today"}
        </p>

        {/* Ambient No-Spoilers indicator — only shown when active.
            Passive status display, not a per-visit toggle (set once in
            Settings; tapping here goes there). */}
        <div className="flex flex-1 justify-end">
          <NoSpoilersAmbientDot />
        </div>
      </header>

      {/* Setup — top slot. Only the foundational follow step renders here;
          it is the screen for a brand-new user. Every post-follow nudge
          renders below the content instead (inline slot, further down). */}
      {setup.step === "follow" ? <SetupCard setup={setup} /> : null}

      {/* First-follow alert-tier education — sits below the strip
          (so the user reads "you followed something" before the deep
          explanation), above any other contextual card. The component
          self-gates on follows.length === 1 + !firstFollowEducated,
          so on every other render it's a no-op. */}
      {hydrated ? <FirstFollowTierCard /> : null}

      {/* Quiet Recap — end-of-night moment when the slate is fully wrapped.
          Renders above the Brief because it's the one card that earns
          interrupting the normal Today layout. Once-per-night. */}
      {hydrated ? <QuietRecap payload={payload} /> : null}

      {/* Front Page lead — state headline + lead-game deck. On a RESTING
          day (nothing live, games coming up) the calm "Quiet for now."
          state (design C) takes over instead, folding in the Next-up
          list. */}
      <div className={hasScoreboard ? "md:hidden" : undefined}>
        {hydrated && payload.restingState ? (
          <RestingState items={payload.upNext} />
        ) : lead ? (
          <FrontPageLead lead={lead} />
        ) : null}

        {/* Contextual one-time hint — teach lock-screen tracking the first
            time a followed game is live (native only, dismissible). */}
        <LiveTrackHint active={Boolean(lead?.live)} />
      </div>

      {/* ALSO LIVE ink band (System D, Task 7) — mobile only. The lead
          Monument above is index 01; this carries every OTHER live followed
          game as board rows (02, 03…). Self-gates to nothing when the lead
          is the only live game (or none), so a 1-live day keeps the calm
          single Monument. Desktop keeps the DesktopScoreboard grid below. */}
      {hydrated ? (
        <AlsoLiveBand items={scoreboard} excludeGameId={lead?.game?.gameId} />
      ) : null}

      {/* Calm Ending — series wrapped or season wrapped. Sits above the
          install/notifications cards so the user sees the acknowledgment
          first when they open Today the morning after a clinch. The card
          internally suppresses itself if the user has dismissed this
          specific moment id. */}
      {hydrated && payload.closing ? (
        <div className="mb-4">
          <CalmEndCard moment={payload.closing} />
        </div>
      ) : null}

      {/* Knockout moment — a followed country advanced or went out. The
          win-or-go-home beat. Each self-suppresses once dismissed. */}
      {hydrated
        ? payload.knockoutMoments.map((m) => (
            <div key={m.id} className="mb-4">
              <KnockoutMomentCard moment={m} />
            </div>
          ))
        : null}

      {/* Loading shell — keep the page shape, fill with calm placeholder */}
      {!hydrated ? <LoadingShell /> : null}

      {/* North Star content (with No-Spoilers variant baked into sections).
          Mobile: single-column stack, YouFollow inline between hero and
          UpNext (current behavior). Desktop (md+): YouFollow moves to a
          sticky right rail so the eye stays on the live hero + what's
          next, and the circle is always visible. Phase 22.5-D. */}
      {hydrated ? (
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_280px] md:gap-6">
          <div className="space-y-5">
            {/* Desktop scoreboard — at the top of the content column so the
                You-Follow rail (right column) aligns with it instead of
                starting below a full-width band. Desktop (md+) only: mobile
                gets the lead Monument + ALSO LIVE ink band above instead.
                D4 owns unifying the desktop surface with System D. */}
            {hasScoreboard ? (
              <div className="hidden md:block">
                <DesktopScoreboard tiles={scoreboard} />
              </div>
            ) : null}

            {/* The lead game is now the Front Page deck above; the old
                WorthCheckingNow hero would just duplicate it. */}

            {/* YouFollow appears here on mobile only — at md+ the sticky
                aside in the right rail takes over. */}
            <div className="md:hidden">
              <YouFollow items={payload.youFollow} />
            </div>

            {/* Setup — inline slot. Any post-follow nudge (install / enable
                / recover / optional install) renders here, below the live
                content, so scores come first. At most one ever shows. */}
            {setup.step && setup.step !== "follow" ? <SetupCard setup={setup} /> : null}

            {/* On a resting day the Next-up list is shown inside
                RestingState above, so skip the standalone section to
                avoid a duplicate "Upcoming" list. */}
            {!payload.restingState ? (
              <UpNext items={payload.upNext} excludeHref={lead?.deck?.href} />
            ) : null}

            <QuietWrap items={payload.quietWrap} />

            {payload.reminder ? <ReminderRow reminder={payload.reminder} /> : null}

            {/* Quiet-day payoff: when nothing's live, nothing's next, nothing
                just wrapped — and the reminder isn't already filling the page. */}
            {payload.isQuietDay && !payload.reminder ? <CalmCard /> : null}

            {/* One-time, dismissible nudge to the Daily Brief email. Sits
                at the bottom so it never competes with the live slate. */}
            <BriefPromptCard />
          </div>

          {/* Desktop-only sticky right rail. Renders YouFollow so the
              user's sports circle is always in view while they scan
              hero / up-next. The sticky offset is small (16px) so the
              rail tracks the scroll without crowding the top edge. */}
          {/* pl-2: the rail's content sits flush at the grid column's left
              edge, leaving no room for the "YOU FOLLOW" heading's first-glyph
              left bearing — some Chrome builds clip it at the edge ("YOU" →
              "OU"). A small left inset gives the glyph room (the chips keep
              their pill padding, so they were never affected). */}
          <aside className="hidden md:block pl-2">
            <div className="sticky top-4">
              <YouFollow items={payload.youFollow} />
            </div>
          </aside>
        </div>
      ) : null}
    </main>
    </PullToRefresh>
  );
}

// ── Ambient No-Spoilers indicator ─────────────────────────────────────
// Passive status dot. Only renders when No-Spoilers is on — its absence
// is the signal that scores are visible, so there's nothing to show when
// the mode is off. Tapping takes you to Alerts & Notifications to change it.
// Deliberately low visual weight: muted color, small type, no border,
// no filled background. The app should not prompt a scores decision
// every time Today opens.

function NoSpoilersAmbientDot() {
  const noSpoilers = useNoSpoilers();
  if (!noSpoilers) return null;

  return (
    <Link
      href="/settings"
      aria-label="Scores hidden. Open Alerts & Notifications to change."
      className="no-noise-reveal-focus inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 transition active:scale-[0.97]"
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
        No-spoilers
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
